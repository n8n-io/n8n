import type { WorkflowSuggestionBaseline, WorkflowSuggestionGraph } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	type OperationContext,
	type SharedWorkflow,
	type TransactionRunner,
	type User,
	WorkflowEntity,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { ExecutionService } from '@/executions/execution.service';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { SelfHealingTemporaryWorkflowRepository } from '../database/self-healing-temporary-workflow.repository';
import { SelfHealingTemporaryWorkflowService } from '../self-healing-temporary-workflow.service';

vi.mock('@/executions/execution.service', () => ({ ExecutionService: vi.fn() }));

const workflows = mock<SelfHealingTemporaryWorkflowRepository>();
const finder = mock<WorkflowFinderService>();
const policy = mock<PolicyEnforcementService>();
const transactions = mock<TransactionRunner>();
const executions = mock<ExecutionPersistence>();
const executionService = mock<ExecutionService>();
const logger = mock<Logger>();
const service = new SelfHealingTemporaryWorkflowService(
	workflows,
	finder,
	policy,
	transactions,
	executions,
	executionService,
	logger,
);
const user = mock<User>({ id: 'user', disabled: false });
const graph: WorkflowSuggestionGraph = {
	nodes: [
		{
			id: 'node',
			name: 'Step',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [0, 0],
			parameters: { value: 'candidate' },
			credentials: { httpHeaderAuth: { id: 'credential', name: 'Original credential' } },
		},
	],
	connections: {},
};
const baseline: WorkflowSuggestionBaseline = {
	workflowId: 'original',
	projectId: 'project',
	backgroundUserId: user.id,
	expectedBaseline: {
		savedVersionId: 'saved',
		publishedVersionId: 'saved',
		checksum: 'checksum',
		versionCounter: 2,
		latestPublishHistoryEventId: null,
	},
	original: {
		name: 'Original',
		nodes: [],
		connections: {},
		settings: { executionOrder: 'v1', errorWorkflow: 'error-workflow' },
		pinData: { Step: [{ json: { value: 'pinned' } }] },
	},
};
const input = { user, baseline, graph };
let original: WorkflowEntity;

beforeEach(() => {
	vi.resetAllMocks();
	original = new WorkflowEntity();
	original.id = baseline.workflowId;
	original.shared = [
		mock<SharedWorkflow>({ role: 'workflow:owner', projectId: baseline.projectId }),
	];
	original.staticData = { global: { cursor: 4 } };
	finder.findWorkflowForUser.mockResolvedValue(original);
	transactions.run.mockImplementation(async (ctx, callback) => await callback(ctx));
	workflows.createTemporary.mockImplementation(async (workflow) => {
		workflow.id = 'temporary';
		return workflow;
	});
	workflows.findUnfinishedExecutionIds.mockResolvedValue([]);
	workflows.canDelete.mockResolvedValue(true);
	workflows.findAbandonedIds.mockResolvedValue([]);
});

it('runs the exact candidate on an isolated workflow and keeps its findings after cleanup', async () => {
	const staticDataBefore = structuredClone(original.staticData);
	const baselineBefore = structuredClone(baseline);
	const graphBefore = structuredClone(graph);
	const findings = { success: false, error: 'Missing input' };
	const verify = vi.fn(async () => {
		const temporary = workflows.createTemporary.mock.calls[0][0];
		expect(temporary).toMatchObject({
			id: 'temporary',
			name: baseline.original.name,
			nodes: graph.nodes,
			connections: graph.connections,
			settings: baseline.original.settings,
			pinData: baseline.original.pinData,
			staticData: original.staticData,
			isArchived: true,
			activeVersionId: null,
		});
		temporary.nodes[0].parameters.value = 'runtime';
		temporary.staticData!.changed = true;
		temporary.pinData!.Step[0].json.value = 'runtime';
		return findings;
	});

	await expect(service.withTemporaryWorkflow(input, verify)).resolves.toBe(findings);
	expect(verify).toHaveBeenCalledWith('temporary');
	expect(finder.findWorkflowForUser).toHaveBeenCalledWith('original', user, [
		'workflow:read',
		'workflow:update',
		'workflow:execute',
	]);
	expect(original.staticData).toEqual(staticDataBefore);
	expect(baseline).toEqual(baselineBefore);
	expect(graph).toEqual(graphBefore);
	expect(executions.hardDeleteByWorkflowId).toHaveBeenCalledWith('temporary');
	expect(workflows.deleteTemporary).toHaveBeenCalledWith('temporary');
});

it('cleans up when verification throws', async () => {
	await expect(
		service.withTemporaryWorkflow(input, async () => {
			throw new Error('Execution failed');
		}),
	).rejects.toThrow('Execution failed');
	expect(workflows.deleteTemporary).toHaveBeenCalledWith('temporary');
});

it('retains the marker when execution data cleanup fails', async () => {
	executions.hardDeleteByWorkflowId.mockRejectedValue(new Error('Storage unavailable'));
	await expect(service.withTemporaryWorkflow(input, async () => 'findings')).resolves.toBe(
		'findings',
	);
	expect(workflows.deleteTemporary).not.toHaveBeenCalled();
	expect(logger.warn).toHaveBeenCalled();
});

it('defers deletion while an execution is still settling', async () => {
	workflows.canDelete.mockResolvedValue(false);
	await service.withTemporaryWorkflow(input, async () => 'cancelled');
	expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
	expect(workflows.deleteTemporary).not.toHaveBeenCalled();
});

it('stops unfinished executions through the existing execution service before deletion', async () => {
	workflows.findUnfinishedExecutionIds.mockResolvedValue(['waiting']);
	await service.withTemporaryWorkflow(input, async () => 'waiting');
	expect(executionService.stop).toHaveBeenCalledWith('waiting', ['temporary']);
	expect(executionService.stop.mock.invocationCallOrder[0]).toBeLessThan(
		executions.hardDeleteByWorkflowId.mock.invocationCallOrder[0],
	);
});

it('retries abandoned workflows only after the recovery window', async () => {
	const now = new Date('2026-10-13T12:00:00Z');
	vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
	workflows.findAbandonedIds.mockResolvedValue(['abandoned']);
	await service.cleanupAbandoned();
	expect(workflows.findAbandonedIds).toHaveBeenCalledWith(new Date('2026-10-12T12:00:00Z'));
	expect(workflows.deleteTemporary).toHaveBeenCalledWith('abandoned');
	vi.restoreAllMocks();
});

it('stops unfinished abandoned executions before it retries cleanup', async () => {
	workflows.findAbandonedIds.mockResolvedValue(['abandoned']);
	workflows.findUnfinishedExecutionIds.mockResolvedValue(['new', 'running', 'unknown']);
	workflows.canDelete.mockResolvedValue(false);
	await service.cleanupAbandoned();
	for (const executionId of ['new', 'running', 'unknown']) {
		expect(executionService.stop).toHaveBeenCalledWith(executionId, ['abandoned']);
	}
	expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
});

it.each(['access', 'project'])(
	'refuses to create a temporary workflow after %s changes',
	async (change) => {
		if (change === 'access') finder.findWorkflowForUser.mockResolvedValue(null);
		else original.shared = [];
		await expect(service.withTemporaryWorkflow(input, async () => {})).rejects.toThrow('access');
		expect(workflows.createTemporary).not.toHaveBeenCalled();
	},
);

it('creates the snapshot with the content policy clearance in one transaction', async () => {
	const clearance = mock<Awaited<ReturnType<PolicyEnforcementService['enforceWorkflowSave']>>>();
	policy.enforceWorkflowSave.mockResolvedValue(clearance);
	const ctx: OperationContext = { policyCleared: clearance };
	await service.withTemporaryWorkflow(input, async () => {});
	expect(workflows.createTemporary).toHaveBeenCalledWith(
		expect.objectContaining({ nodes: graph.nodes }),
		'original',
		ctx,
	);
});

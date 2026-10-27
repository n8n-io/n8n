import type { WorkflowSuggestionBaseline, WorkflowSuggestionGraph } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	type OperationContext,
	type SharedWorkflow,
	type TransactionRunner,
	type User,
	type UserRepository,
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
const users = mock<UserRepository>();
const service = new SelfHealingTemporaryWorkflowService(
	workflows,
	finder,
	policy,
	transactions,
	executions,
	executionService,
	logger,
	users,
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
	users.findByIdWithRole.mockResolvedValue(user);
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

it('creates an isolated candidate without changing the baseline or original workflow', async () => {
	const staticDataBefore = structuredClone(original.staticData);
	const baselineBefore = structuredClone(baseline);
	const graphBefore = structuredClone(graph);
	const temporary = await service.create(input);

	expect(temporary).toMatchObject({
		id: 'temporary',
		name: `[n8n Assistant test copy] ${baseline.original.name}`,
		description: 'Temporary copy created by n8n Assistant to test a proposed fix.',
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

	expect(finder.findWorkflowForUser).toHaveBeenCalledWith('original', user, [
		'workflow:read',
		'workflow:update',
		'workflow:execute',
	]);
	expect(original.staticData).toEqual(staticDataBefore);
	expect(baseline).toEqual(baselineBefore);
	expect(graph).toEqual(graphBefore);
});

it('keeps the test-copy name within the workflow name limit', async () => {
	const longNameBaseline = structuredClone(baseline);
	longNameBaseline.original.name = 'a'.repeat(128);
	const temporary = await service.create({ ...input, baseline: longNameBaseline });
	expect(temporary.name).toBe(`[n8n Assistant test copy] ${'a'.repeat(128)}`.slice(0, 128));
});

it.each(['deleted', 'disabled'])('rejects an actor whose account was %s', async (state) => {
	users.findByIdWithRole.mockResolvedValue(
		state === 'deleted' ? null : mock<User>({ id: user.id, disabled: true }),
	);
	await expect(service.create(input)).rejects.toThrow('access');
	expect(finder.findWorkflowForUser).not.toHaveBeenCalled();
	expect(workflows.createTemporary).not.toHaveBeenCalled();
});

it('uses the current user and role for access and policy checks', async () => {
	const currentUser = mock<User>({
		id: user.id,
		disabled: false,
		role: { slug: 'global:member' },
	});
	users.findByIdWithRole.mockResolvedValue(currentUser);
	await service.create(input);
	expect(users.findByIdWithRole).toHaveBeenCalledWith(user.id);
	expect(finder.findWorkflowForUser.mock.calls[0][1]).toBe(currentUser);
	expect(policy.enforceWorkflowSave).toHaveBeenCalledWith(expect.anything(), {
		kind: 'user',
		user: currentUser,
	});
});

it('retains the marker when execution data cleanup fails', async () => {
	executions.hardDeleteByWorkflowId.mockRejectedValue(new Error('Storage unavailable'));
	await expect(service.cleanup('temporary')).resolves.toBeUndefined();
	expect(workflows.deleteTemporary).not.toHaveBeenCalled();
	expect(logger.warn).toHaveBeenCalled();
});

it('defers deletion while an execution is still settling', async () => {
	workflows.canDelete.mockResolvedValue(false);
	await service.cleanup('temporary');
	expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
	expect(workflows.deleteTemporary).not.toHaveBeenCalled();
});

it('stops unfinished executions through the existing execution service before deletion', async () => {
	workflows.findUnfinishedExecutionIds.mockResolvedValue(['waiting']);
	await service.cleanup('temporary');
	expect(executionService.stop).toHaveBeenCalledWith('waiting', ['temporary']);
	expect(workflows.deleteTemporary).toHaveBeenCalledWith('temporary');
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
		await expect(service.create(input)).rejects.toThrow('access');
		expect(workflows.createTemporary).not.toHaveBeenCalled();
	},
);

it('creates the snapshot with the content policy clearance in one transaction', async () => {
	const clearance = mock<Awaited<ReturnType<PolicyEnforcementService['enforceWorkflowSave']>>>();
	policy.enforceWorkflowSave.mockResolvedValue(clearance);
	const ctx: OperationContext = { policyCleared: clearance };
	await service.create(input);
	expect(workflows.createTemporary).toHaveBeenCalledWith(
		expect.objectContaining({ nodes: graph.nodes }),
		'original',
		ctx,
	);
});

it('stops cleanup between execution stops after cancellation', async () => {
	const controller = new AbortController();
	workflows.findUnfinishedExecutionIds.mockResolvedValue(['first', 'second']);
	executionService.stop.mockImplementationOnce(async () => {
		controller.abort();
		return {
			mode: 'manual',
			startedAt: new Date(),
			stoppedAt: new Date(),
			finished: true,
			status: 'canceled',
		};
	});
	await service.cleanup('temporary', controller.signal);
	expect(executionService.stop).toHaveBeenCalledTimes(1);
	expect(workflows.canDelete).not.toHaveBeenCalled();
	expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
});

it('keeps the cleanup marker when cancellation arrives during execution deletion', async () => {
	const controller = new AbortController();
	executions.hardDeleteByWorkflowId.mockImplementationOnce(async () => {
		controller.abort();
	});
	await service.cleanup('temporary', controller.signal);
	expect(executions.hardDeleteByWorkflowId).toHaveBeenCalledExactlyOnceWith('temporary');
	expect(workflows.deleteTemporary).not.toHaveBeenCalled();
});

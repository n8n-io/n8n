import type { WorkflowSuggestionBaseline, WorkflowSuggestionGraph } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import {
	WorkflowEntity,
	type OperationContext,
	type Transaction,
	type TransactionRunner,
	type User,
	type UserRepository,
} from '@n8n/db';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';
import type { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';

import { WorkflowSuggestion } from '../database/workflow-suggestion.entity';
import type { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import type { WorkflowSuggestionCandidateService } from '../workflow-suggestion-candidate.service';
import { WorkflowSuggestionService } from '../workflow-suggestion.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const suggestions = mock<WorkflowSuggestionRepository>();
const candidates = mock<WorkflowSuggestionCandidateService>();
const users = mock<UserRepository>();
const publication = mock<WorkflowPublicationStatusService>();
const modules = mock<ModuleRegistry>();
const tx = mock<TransactionRunner>();
const ctx: OperationContext = { trx: mock<Transaction>() };
const service = new WorkflowSuggestionService(
	suggestions,
	candidates,
	users,
	publication,
	tx,
	modules,
);
const user = mock<User>({ id: 'c22db9f1-8fc0-4a46-96e2-c3a0a592a851', disabled: false });
const versionId = '2d97d917-00ae-4fce-98c0-9b4d708a6c94';
const graph: WorkflowSuggestionGraph = {
	nodes: [
		{
			id: 'n',
			name: 'Node',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			parameters: {},
			position: [0, 0],
		},
	],
	connections: {},
};
let baseline: WorkflowSuggestionBaseline;
let workflow: WorkflowEntity;
let suggestion: WorkflowSuggestion;

beforeEach(async () => {
	vi.resetAllMocks();
	modules.isActive.mockReturnValue(true);
	users.findByIdWithRole.mockResolvedValue(user);
	vi.mocked(userHasScopes).mockResolvedValue(true);
	tx.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
	workflow = Object.assign(new WorkflowEntity(), {
		id: 'wf',
		name: 'Example',
		nodes: [],
		connections: {},
		versionId,
		activeVersionId: versionId,
		isArchived: false,
		settings: { executionTimeout: 30 },
		nodeGroups: [],
	});
	baseline = {
		workflowId: workflow.id,
		projectId: 'project',
		backgroundUserId: user.id,
		expectedBaseline: {
			savedVersionId: versionId,
			publishedVersionId: versionId,
			checksum: await calculateWorkflowChecksum(workflow),
		},
		original: {
			name: workflow.name,
			nodes: [],
			connections: {},
			settings: { executionTimeout: 30 },
			isArchived: false,
			activeVersionId: versionId,
			nodeGroups: [],
		},
	};
	suggestion = Object.assign(new WorkflowSuggestion(), {
		id: 'suggestion',
		workflowId: baseline.workflowId,
		projectId: baseline.projectId,
		backgroundUserId: baseline.backgroundUserId,
		expectedBaseline: baseline.expectedBaseline,
		state: 'pending',
		closedReason: null,
		payload: {
			original: structuredClone(baseline.original),
			candidate: structuredClone(graph),
			explanation: 'Fix',
			errorContext: null,
			validation: {
				requiredChecks: 'passed',
				configuration: { status: 'not_run' },
				execution: { status: 'not_run' },
			},
		},
	});
	suggestions.getSuggestion.mockResolvedValue(suggestion);
	suggestions.createPending.mockResolvedValue(suggestion);
	suggestions.readWorkflowTarget.mockResolvedValue({ workflow, projectId: 'project' });
	suggestions.getActivity.mockResolvedValue([]);
	candidates.prepare.mockImplementation(async (_user, _workflow, _project, _original, candidate) =>
		structuredClone(candidate),
	);
	publication.getStatus.mockResolvedValue({
		status: 'published',
		liveVersionId: versionId,
		pendingVersionId: null,
		triggers: [],
	});
});

it('captures a detached baseline without creating a suggestion', async () => {
	const captured = await service.captureBaseline(workflow.id, user.id);
	expect(captured).toEqual(baseline);
	captured.original.settings!.executionTimeout = 60;
	expect(workflow.settings?.executionTimeout).toBe(30);
	expect(suggestions.createPending).not.toHaveBeenCalled();
	expect(candidates.prepare).not.toHaveBeenCalled();
	expect(tx.run).toHaveBeenCalledWith({}, expect.any(Function));
	expect(publication.getStatus).toHaveBeenCalledWith(workflow.id, ctx);
});

it.each(['unpublished', 'saved changes', 'archived', 'publishing'] as const)(
	'rejects baseline capture when the workflow is %s',
	async (state) => {
		if (state === 'unpublished') workflow.activeVersionId = null;
		if (state === 'saved changes') workflow.versionId = 'new-version';
		if (state === 'archived') workflow.isArchived = true;
		if (state === 'publishing')
			publication.getStatus.mockResolvedValue({
				status: 'in_progress',
				liveVersionId: versionId,
				pendingVersionId: versionId,
				triggers: [],
			});
		await expect(service.captureBaseline(workflow.id, user.id)).rejects.toThrow();
		expect(suggestions.createPending).not.toHaveBeenCalled();
	},
);

it('stores the prepared final graph and activity in the caller transaction', async () => {
	const preparedGraph = {
		...graph,
		nodes: graph.nodes.map((node) => ({ ...node, id: 'prepared' })),
	};
	const errorContext = { summary: 'A node failed', evidenceReference: 'evidence-1' };
	candidates.prepare.mockResolvedValue(preparedGraph);
	const prepared = await service.prepareSuggestion(baseline, {
		graph,
		explanation: '  Prepared fix  ',
		errorContext,
	});
	expect(suggestions.createPending).not.toHaveBeenCalled();
	expect(tx.run).not.toHaveBeenCalled();
	const result = await service.createSuggestion(prepared, ctx);
	expect(result).toBe(suggestion);
	expect(candidates.prepare).toHaveBeenCalledWith(
		user,
		workflow.id,
		'project',
		baseline.original,
		graph,
	);
	expect(suggestions.createPending).toHaveBeenCalledWith(
		baseline,
		{
			original: baseline.original,
			candidate: preparedGraph,
			explanation: 'Prepared fix',
			errorContext,
			validation: {
				requiredChecks: 'passed',
				configuration: { status: 'not_run' },
				execution: { status: 'not_run' },
			},
		},
		ctx,
	);
	expect(tx.run).toHaveBeenCalledWith(ctx, expect.any(Function));
	expect(suggestions.readWorkflowTarget).toHaveBeenCalledWith(workflow.id, ctx);
	expect(publication.getStatus).toHaveBeenCalledWith(workflow.id, ctx);
	expect(suggestions.appendSubmittedActivity).toHaveBeenCalledWith(suggestion.id, ctx);
});

it('keeps prepared content separate from later changes to the input', async () => {
	const candidate = structuredClone(graph);
	const prepared = await service.prepareSuggestion(baseline, {
		graph: candidate,
		explanation: 'Fix',
	});
	baseline.original.name = 'Changed';
	candidate.nodes[0].name = 'Changed';
	expect(prepared.payload.original.name).toBe('Example');
	expect(prepared.payload.candidate.nodes[0].name).toBe('Node');
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it.each(['credential access', 'workflow policy'])(
	'saves nothing when %s validation fails',
	async (reason) => {
		candidates.prepare.mockRejectedValue(new Error(reason));
		await expect(
			service.prepareSuggestion(baseline, { graph, explanation: 'Fix' }),
		).rejects.toThrow(reason);
		expect(suggestions.createPending).not.toHaveBeenCalled();
		expect(suggestions.appendSubmittedActivity).not.toHaveBeenCalled();
	},
);

it('rejects unsupported graph fields', async () => {
	await expect(
		service.prepareSuggestion(baseline, {
			graph: { ...graph, settings: {} } as WorkflowSuggestionGraph,
			explanation: 'Fix',
		}),
	).rejects.toThrow();
	expect(candidates.prepare).not.toHaveBeenCalled();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it.each([' ', 'x'.repeat(20_001)])('rejects an invalid explanation', async (explanation) => {
	await expect(service.prepareSuggestion(baseline, { graph, explanation })).rejects.toThrow();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it('rejects a prepared graph with no changes', async () => {
	candidates.prepare.mockResolvedValue({ nodes: [], connections: {} });
	await expect(
		service.prepareSuggestion(baseline, { graph, explanation: 'Fix' }),
	).rejects.toThrow();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it('rejects changes to the captured original snapshot', async () => {
	baseline.original.settings!.executionTimeout = 60;
	await expect(service.prepareSuggestion(baseline, { graph, explanation: 'Fix' })).rejects.toThrow(
		'captured workflow baseline',
	);
	expect(candidates.prepare).not.toHaveBeenCalled();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it.each(['settings', 'version', 'published', 'archived', 'project', 'deleted'] as const)(
	'rejects a %s change after final preparation without saving a suggestion',
	async (change) => {
		const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Fix' });
		if (change === 'settings') workflow.settings = { executionTimeout: 60 };
		if (change === 'version') workflow.versionId = 'new';
		if (change === 'published') workflow.activeVersionId = 'new';
		if (change === 'archived') workflow.isArchived = true;
		if (change === 'project')
			suggestions.readWorkflowTarget.mockResolvedValue({ workflow, projectId: 'other' });
		if (change === 'deleted')
			suggestions.readWorkflowTarget.mockResolvedValue({ workflow: null, projectId: undefined });
		await expect(service.createSuggestion(prepared)).rejects.toThrow('baseline');
		expect(suggestions.createPending).not.toHaveBeenCalled();
		expect(suggestions.appendSubmittedActivity).not.toHaveBeenCalled();
	},
);

it.each(['disabled', 'no edit access'] as const)(
	'blocks capture, final preparation, and review for a user with %s',
	async (failure) => {
		if (failure === 'disabled')
			users.findByIdWithRole.mockResolvedValue(mock<User>({ id: user.id, disabled: true }));
		else vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.captureBaseline(workflow.id, user.id)).rejects.toThrow('edit access');
		await expect(
			service.prepareSuggestion(baseline, { graph, explanation: 'Fix' }),
		).rejects.toThrow('edit access');
		await expect(service.getProposal(user, 'project', suggestion.id)).rejects.toThrow(
			'edit access',
		);
		expect(suggestions.createPending).not.toHaveBeenCalled();
	},
);

it('lets another current editor review without publish permission', async () => {
	const viewer = mock<User>({ id: 'another-editor', disabled: false });
	users.findByIdWithRole.mockResolvedValue(viewer);
	const detail = await service.getProposal(viewer, 'project', suggestion.id);
	expect(detail.payload.proposed).toEqual({ ...baseline.original, ...graph });
	expect(detail.backgroundUserId).toBe(user.id);
	expect(userHasScopes).toHaveBeenCalledWith(viewer, ['workflow:read', 'workflow:update'], false, {
		workflowId: 'wf',
	});
});

it('rejects review from a different project or after ownership changes', async () => {
	await expect(service.getProposal(user, 'other', suggestion.id)).rejects.toThrow('not found');
	suggestions.readWorkflowTarget.mockResolvedValue({ workflow, projectId: 'other' });
	await expect(service.getProposal(user, 'project', suggestion.id)).rejects.toThrow('not found');
});

it('blocks operations when the module is disabled', async () => {
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Fix' });
	modules.isActive.mockReturnValue(false);
	await expect(service.captureBaseline(workflow.id, user.id)).rejects.toThrow('not enabled');
	await expect(service.prepareSuggestion(baseline, { graph, explanation: 'Fix' })).rejects.toThrow(
		'not enabled',
	);
	await expect(service.createSuggestion(prepared)).rejects.toThrow('not enabled');
	await expect(service.getProposal(user, 'project', suggestion.id)).rejects.toThrow('not enabled');
});

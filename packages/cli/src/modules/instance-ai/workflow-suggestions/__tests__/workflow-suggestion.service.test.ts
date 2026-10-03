import type { WorkflowSuggestionBaseline, WorkflowSuggestionGraph } from '@n8n/api-types';
import {
	WorkflowEntity,
	type OperationContext,
	type Project,
	type SharedWorkflow,
	type SharedWorkflowRepository,
	type Transaction,
	type TransactionRunner,
	type User,
	type UserRepository,
	type WorkflowRepository,
	type WorkflowPublishHistoryRepository,
} from '@n8n/db';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSuggestion } from '../database/workflow-suggestion.entity';
import type { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import { WorkflowSuggestionService } from '../workflow-suggestion.service';

const suggestions = mock<WorkflowSuggestionRepository>();
const users = mock<UserRepository>();
const publication = mock<WorkflowPublicationStatusService>();
const finder = mock<WorkflowFinderService>();
const workflowRepository = mock<WorkflowRepository>();
const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
const workflowPublishHistoryRepository = mock<WorkflowPublishHistoryRepository>();
const tx = mock<TransactionRunner>();
const ctx: OperationContext = { trx: mock<Transaction>() };
const service = new WorkflowSuggestionService(
	suggestions,
	users,
	publication,
	tx,
	finder,
	workflowRepository,
	sharedWorkflowRepository,
	workflowPublishHistoryRepository,
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
	users.findByIdWithRole.mockResolvedValue(user);
	workflowPublishHistoryRepository.getLatestPublicationId.mockResolvedValue(null);
	tx.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
	workflow = Object.assign(new WorkflowEntity(), {
		id: 'wf',
		name: 'Example',
		nodes: [],
		connections: {},
		versionId,
		versionCounter: 1,
		updatedAt: new Date('2026-09-30T00:00:00.000Z'),
		activeVersionId: versionId,
		isArchived: false,
		settings: { executionTimeout: 30 },
		nodeGroups: [],
		shared: [mock<SharedWorkflow>({ role: 'workflow:owner', projectId: 'project' })],
	});
	baseline = {
		workflowId: workflow.id,
		projectId: 'project',
		backgroundUserId: user.id,
		expectedBaseline: {
			savedVersionId: versionId,
			publishedVersionId: versionId,
			checksum: await calculateWorkflowChecksum(workflow),
			versionCounter: workflow.versionCounter,
			savedAt: workflow.updatedAt.toISOString(),
			publicationId: null,
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
		resultKind: 'fix_ready',
		closedReason: null,
		payload: {
			original: structuredClone(baseline.original),
			candidate: structuredClone(graph),
			explanation: 'Fix',
			errorContext: null,
		},
	});
	finder.findWorkflowForUser.mockResolvedValue(workflow);
	suggestions.getSuggestion.mockResolvedValue(suggestion);
	suggestions.createPending.mockResolvedValue(suggestion);
	workflowRepository.findByIdInContext.mockResolvedValue(workflow);
	sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
		mock<Project>({ id: 'project' }),
	);
	suggestions.getActivity.mockResolvedValue([]);
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
	expect(tx.run).not.toHaveBeenCalled();
	expect(workflowRepository.findByIdInContext).not.toHaveBeenCalled();
	expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
	expect(publication.getStatus).toHaveBeenCalledWith(workflow.id, {});
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

it('stores the exact final graph and activity in the caller transaction', async () => {
	const errorContext = { summary: 'A node failed', evidenceReference: 'evidence-1' };
	const prepared = await service.prepareSuggestion(baseline, {
		resultKind: 'fix_ready',
		graph,
		explanation: '  Prepared fix  ',
		errorContext,
	});
	expect(suggestions.createPending).not.toHaveBeenCalled();
	expect(tx.run).not.toHaveBeenCalled();
	const result = await service.createSuggestion(prepared, ctx);
	expect(result).toBe(suggestion);
	expect(suggestions.createPending).toHaveBeenCalledWith(
		baseline,
		{
			original: baseline.original,
			candidate: graph,
			explanation: 'Prepared fix',
			errorContext,
		},
		ctx,
		'fix_ready',
	);
	expect(tx.run).toHaveBeenCalledWith(ctx, expect.any(Function));
	expect(workflowRepository.findByIdInContext).toHaveBeenCalledWith(workflow.id, ctx);
	expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenCalledWith(workflow.id, ctx);
	expect(publication.getStatus).toHaveBeenCalledWith(workflow.id, ctx);
	expect(suggestions.appendSubmittedActivity).toHaveBeenCalledWith(suggestion.id, ctx);
});

it.each([undefined, null, 'invalid'])(
	'rejects outcome %s before preparing a suggestion',
	async (resultKind) => {
		await expect(
			service.prepareSuggestion(baseline, {
				graph,
				explanation: 'Fix',
				resultKind: resultKind as never,
			}),
		).rejects.toMatchObject({ issues: [expect.objectContaining({ path: ['resultKind'] })] });
		expect(suggestions.createPending).not.toHaveBeenCalled();
	},
);

it('keeps prepared content separate from later changes to the input', async () => {
	const candidate = structuredClone(graph);
	const original = structuredClone(baseline.original);
	const prepared = await service.prepareSuggestion(baseline, {
		resultKind: 'fix_ready',
		graph: candidate,
		explanation: 'Fix',
	});
	expect(baseline.original).toEqual(original);
	expect(candidate).toEqual(graph);
	baseline.original.name = 'Changed';
	candidate.nodes[0].name = 'Changed';
	expect(prepared.payload.original.name).toBe('Example');
	expect(prepared.payload.candidate.nodes[0].name).toBe('Node');
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it.each<{ problem: string; candidate: WorkflowSuggestionGraph }>([
	{
		problem: 'malformed node',
		candidate: { ...graph, nodes: [{ ...graph.nodes[0], name: '' }] },
	},
	{
		problem: 'duplicate node name',
		candidate: { ...graph, nodes: [...graph.nodes, { ...graph.nodes[0], id: 'other' }] },
	},
	{
		problem: 'duplicate node ID',
		candidate: { ...graph, nodes: [...graph.nodes, { ...graph.nodes[0], name: 'Other' }] },
	},
	{
		problem: 'malformed connection',
		candidate: {
			...graph,
			connections: {
				Node: { main: [[{ node: 'Node', type: 'main', index: -1 }]] },
			},
		},
	},
	{
		problem: 'unknown connection source',
		candidate: {
			...graph,
			connections: {
				Missing: { main: [[{ node: 'Node', type: 'main', index: 0 }]] },
			},
		},
	},
	{
		problem: 'unknown connection target',
		candidate: {
			...graph,
			connections: {
				Node: { main: [[{ node: 'Missing', type: 'main', index: 0 }]] },
			},
		},
	},
])('rejects a $problem', async ({ candidate }) => {
	await expect(
		service.prepareSuggestion(baseline, {
			resultKind: 'fix_ready',
			graph: candidate,
			explanation: 'Fix',
		}),
	).rejects.toThrow('structure');
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it('does not assign node IDs or webhook IDs during preparation', async () => {
	const candidate = {
		...graph,
		nodes: [{ ...graph.nodes[0], id: '', type: 'n8n-nodes-base.webhook' }],
	};
	const prepared = await service.prepareSuggestion(baseline, {
		resultKind: 'fix_ready',
		graph: candidate,
		explanation: 'Fix',
	});
	expect(prepared.payload.candidate).toEqual(candidate);
});

it.each([
	{ state: 'missing', credentials: undefined },
	{ state: 'unresolved', credentials: { httpBasicAuth: { id: 'unavailable', name: 'Service' } } },
])('stores $state credentials for Needs attention', async ({ credentials }) => {
	const candidate = {
		...graph,
		nodes: [
			{
				...graph.nodes[0],
				type: 'n8n-nodes-base.httpRequest',
				parameters: { authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth' },
				credentials,
			},
		],
	};
	const prepared = await service.prepareSuggestion(baseline, {
		resultKind: 'needs_you',
		graph: candidate,
		explanation: 'Fix',
	});
	await service.createSuggestion(prepared);
	expect(suggestions.createPending).toHaveBeenCalledWith(
		baseline,
		expect.objectContaining({ candidate }),
		ctx,
		'needs_you',
	);
	expect(prepared.payload).not.toHaveProperty('validation');
});

it('rejects unsupported graph fields', async () => {
	await expect(
		service.prepareSuggestion(baseline, {
			resultKind: 'fix_ready',
			graph: { ...graph, settings: {} } as WorkflowSuggestionGraph,
			explanation: 'Fix',
		}),
	).rejects.toThrow();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it.each([' ', 'x'.repeat(20_001)])('rejects an invalid explanation', async (explanation) => {
	await expect(
		service.prepareSuggestion(baseline, { resultKind: 'fix_ready', graph, explanation }),
	).rejects.toThrow();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it('rejects a graph with no changes', async () => {
	await expect(
		service.prepareSuggestion(baseline, {
			resultKind: 'fix_ready',
			graph: { nodes: [], connections: {} },
			explanation: 'Fix',
		}),
	).rejects.toThrow();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it('rejects changes to the captured original snapshot', async () => {
	baseline.original.settings!.executionTimeout = 60;
	await expect(
		service.prepareSuggestion(baseline, { resultKind: 'fix_ready', graph, explanation: 'Fix' }),
	).rejects.toThrow('captured workflow baseline');
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it.each([
	'settings',
	'version',
	'published',
	'archived',
	'project',
	'missing owner',
	'deleted',
] as const)(
	'rejects a %s change after final preparation without saving a suggestion',
	async (change) => {
		const prepared = await service.prepareSuggestion(baseline, {
			resultKind: 'fix_ready',
			graph,
			explanation: 'Fix',
		});
		if (change === 'settings') workflow.settings = { executionTimeout: 60 };
		if (change === 'version') workflow.versionId = 'new';
		if (change === 'published') workflow.activeVersionId = 'new';
		if (change === 'archived') workflow.isArchived = true;
		if (change === 'project')
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'other' }),
			);
		if (change === 'missing owner')
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);
		if (change === 'deleted') workflowRepository.findByIdInContext.mockResolvedValue(null);
		await expect(service.createSuggestion(prepared)).rejects.toThrow('baseline');
		expect(suggestions.createPending).not.toHaveBeenCalled();
		expect(suggestions.appendSubmittedActivity).not.toHaveBeenCalled();
	},
);

it.each(['missing', 'disabled', 'no edit access'] as const)(
	'blocks capture, final preparation, and review for a user with %s',
	async (failure) => {
		if (failure === 'missing') users.findByIdWithRole.mockResolvedValue(null);
		else if (failure === 'disabled')
			users.findByIdWithRole.mockResolvedValue(mock<User>({ id: user.id, disabled: true }));
		else finder.findWorkflowForUser.mockResolvedValue(null);
		await expect(service.captureBaseline(workflow.id, user.id)).rejects.toThrow('edit access');
		await expect(
			service.prepareSuggestion(baseline, { resultKind: 'fix_ready', graph, explanation: 'Fix' }),
		).rejects.toThrow('edit access');
		await expect(service.getProposal(user, 'project', workflow.id, suggestion.id)).rejects.toThrow(
			'edit access',
		);
		expect(suggestions.createPending).not.toHaveBeenCalled();
		expect(suggestions.getSuggestion).not.toHaveBeenCalled();
	},
);

it('lets another current editor review without publish permission', async () => {
	const viewer = mock<User>({ id: 'another-editor', disabled: false });
	users.findByIdWithRole.mockResolvedValue(viewer);
	const detail = await service.getProposal(viewer, 'project', workflow.id, suggestion.id);
	expect(detail.payload.proposed).toEqual({ ...baseline.original, ...graph });
	expect(detail.backgroundUserId).toBe(user.id);
	expect(suggestions.getSuggestion).toHaveBeenCalledWith(
		suggestion.id,
		{
			workflowId: workflow.id,
			projectId: 'project',
		},
		ctx,
	);
	expect(finder.findWorkflowForUser).toHaveBeenCalledWith(
		workflow.id,
		viewer,
		['workflow:read', 'workflow:update'],
		{ ctx: {} },
	);
});

it('rejects review after ownership changes', async () => {
	workflow.shared[0].projectId = 'other';
	await expect(service.getProposal(user, 'project', workflow.id, suggestion.id)).rejects.toThrow(
		'not found',
	);
});

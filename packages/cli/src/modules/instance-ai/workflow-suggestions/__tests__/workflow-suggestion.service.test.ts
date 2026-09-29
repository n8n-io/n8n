import type { WorkflowSuggestionBaseline, WorkflowSuggestionGraph } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import {
	WorkflowEntity,
	type OperationContext,
	type Transaction,
	type TransactionRunner,
	type User,
} from '@n8n/db';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';

import { WorkflowSuggestion } from '../database/workflow-suggestion.entity';
import type { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import { WorkflowSuggestionService } from '../workflow-suggestion.service';
import type { WorkflowSuggestionPublicationService } from '../workflow-suggestion-publication.service';

const suggestions = mock<WorkflowSuggestionRepository>();
const publication = mock<WorkflowPublicationStatusService>();
const modules = mock<ModuleRegistry>();
const tx = mock<TransactionRunner>();
const ctx: OperationContext = { trx: mock<Transaction>() };
const suggestionPublication = mock<WorkflowSuggestionPublicationService>();
const service = new WorkflowSuggestionService(
	suggestions,
	publication,
	tx,
	modules,
	suggestionPublication,
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
	suggestions.findEditor.mockResolvedValue(user);
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
		closedReason: null,
		payload: {
			original: structuredClone(baseline.original),
			candidate: structuredClone(graph),
			explanation: 'Fix',
			errorContext: null,
		},
	});
	suggestions.getSuggestion.mockResolvedValue(suggestion);
	suggestions.createPending.mockResolvedValue(suggestion);
	suggestions.readWorkflowTarget.mockResolvedValue({
		workflow,
		projectId: 'project',
		publicationId: null,
	});
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

it('stores the exact final graph and activity in the caller transaction', async () => {
	const errorContext = { summary: 'A node failed', evidenceReference: 'evidence-1' };
	const prepared = await service.prepareSuggestion(baseline, {
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
		null,
	);
	expect(tx.run).toHaveBeenCalledWith(ctx, expect.any(Function));
	expect(suggestions.readWorkflowTarget).toHaveBeenCalledWith(workflow.id, ctx);
	expect(publication.getStatus).toHaveBeenCalledWith(workflow.id, ctx);
	expect(suggestions.appendSubmittedActivity).toHaveBeenCalledWith(suggestion.id, ctx);
});

it('keeps prepared content separate from later changes to the input', async () => {
	const candidate = structuredClone(graph);
	const original = structuredClone(baseline.original);
	const prepared = await service.prepareSuggestion(baseline, {
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
		service.prepareSuggestion(baseline, { graph: candidate, explanation: 'Fix' }),
	).rejects.toThrow('structure');
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it('does not assign node IDs or webhook IDs during preparation', async () => {
	const candidate = {
		...graph,
		nodes: [{ ...graph.nodes[0], id: '', type: 'n8n-nodes-base.webhook' }],
	};
	const prepared = await service.prepareSuggestion(baseline, {
		graph: candidate,
		explanation: 'Fix',
	});
	expect(prepared.payload.candidate).toEqual(candidate);
});

it.each([
	{ state: 'missing', credentials: undefined },
	{ state: 'unresolved', credentials: { httpBasicAuth: { id: 'unavailable', name: 'Service' } } },
])('stores $state credentials for review without a readiness result', async ({ credentials }) => {
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
		graph: candidate,
		explanation: 'Fix',
	});
	await service.createSuggestion(prepared);
	expect(suggestions.createPending).toHaveBeenCalledWith(
		baseline,
		expect.objectContaining({ candidate }),
		ctx,
		null,
	);
	expect(prepared.payload).not.toHaveProperty('validation');
});

it('rejects unsupported graph fields', async () => {
	await expect(
		service.prepareSuggestion(baseline, {
			graph: { ...graph, settings: {} } as WorkflowSuggestionGraph,
			explanation: 'Fix',
		}),
	).rejects.toThrow();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it.each([' ', 'x'.repeat(20_001)])('rejects an invalid explanation', async (explanation) => {
	await expect(service.prepareSuggestion(baseline, { graph, explanation })).rejects.toThrow();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it('rejects a graph with no changes', async () => {
	await expect(
		service.prepareSuggestion(baseline, {
			graph: { nodes: [], connections: {} },
			explanation: 'Fix',
		}),
	).rejects.toThrow();
	expect(suggestions.createPending).not.toHaveBeenCalled();
});

it('rejects changes to the captured original snapshot', async () => {
	baseline.original.settings!.executionTimeout = 60;
	await expect(service.prepareSuggestion(baseline, { graph, explanation: 'Fix' })).rejects.toThrow(
		'captured workflow baseline',
	);
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
			suggestions.readWorkflowTarget.mockResolvedValue({
				workflow,
				projectId: 'other',
				publicationId: null,
			});
		if (change === 'deleted')
			suggestions.readWorkflowTarget.mockResolvedValue({
				workflow: null,
				projectId: undefined,
				publicationId: null,
			});
		await expect(service.createSuggestion(prepared)).rejects.toThrow('baseline');
		expect(suggestions.createPending).not.toHaveBeenCalled();
		expect(suggestions.appendSubmittedActivity).not.toHaveBeenCalled();
	},
);

it('blocks capture, final preparation, and review without current edit access', async () => {
	suggestions.findEditor.mockResolvedValue(null);
	await expect(service.captureBaseline(workflow.id, user.id)).rejects.toThrow('edit access');
	await expect(service.prepareSuggestion(baseline, { graph, explanation: 'Fix' })).rejects.toThrow(
		'edit access',
	);
	await expect(service.getProposal(user, 'project', workflow.id, suggestion.id)).rejects.toThrow(
		'edit access',
	);
	expect(suggestions.createPending).not.toHaveBeenCalled();
	expect(suggestions.getSuggestion).not.toHaveBeenCalled();
});

it('lets another current editor review without publish permission', async () => {
	const viewer = mock<User>({ id: 'another-editor', disabled: false });
	suggestions.findEditor.mockResolvedValue(viewer);
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
	expect(suggestions.findEditor).toHaveBeenCalledWith(viewer.id, workflow.id, {});
});

it('rejects review after ownership changes', async () => {
	suggestions.readWorkflowTarget.mockResolvedValue({
		workflow,
		projectId: 'other',
		publicationId: null,
	});
	await expect(service.getProposal(user, 'project', workflow.id, suggestion.id)).rejects.toThrow(
		'not found',
	);
});

it('blocks operations when the Instance AI module is disabled', async () => {
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Fix' });
	modules.isActive.mockImplementation((moduleName) => moduleName !== 'instance-ai');
	await expect(service.captureBaseline(workflow.id, user.id)).rejects.toThrow('not enabled');
	await expect(service.prepareSuggestion(baseline, { graph, explanation: 'Fix' })).rejects.toThrow(
		'not enabled',
	);
	await expect(service.createSuggestion(prepared)).rejects.toThrow('not enabled');
	await expect(service.getProposal(user, 'project', workflow.id, suggestion.id)).rejects.toThrow(
		'not enabled',
	);
});

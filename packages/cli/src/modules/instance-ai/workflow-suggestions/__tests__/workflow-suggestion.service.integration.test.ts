import {
	createWorkflowWithHistory,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	TransactionRunner,
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
	WorkflowEntity,
	ProjectRepository,
	GLOBAL_OWNER_ROLE,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { createUser } from '@test-integration/db/users';

import { WorkflowSuggestionActivity } from '../database/workflow-suggestion-activity.entity';
import { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import { WorkflowSuggestionService } from '../workflow-suggestion.service';

let service: WorkflowSuggestionService;
let suggestions: WorkflowSuggestionRepository;

beforeAll(async () => {
	// The instance-ai entities reference Agents tables, so load the agents module too.
	await testModules.loadModules(['agents', 'instance-ai']);
	await testDb.init();
	suggestions = Container.get(WorkflowSuggestionRepository);
	service = Container.get(WorkflowSuggestionService);
});
afterAll(async () => await testDb.terminate());
afterEach(async () => {
	await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).clear();
	await suggestions.createQueryBuilder().delete().execute();
});

async function fixture() {
	const user = await createUser();
	const workflow = await createWorkflowWithHistory({}, user);
	const workflows = Container.get(WorkflowRepository);
	await workflows.update(workflow.id, { activeVersionId: workflow.versionId, active: true });
	await Container.get(WorkflowPublicationTriggerStatusRepository).replaceForWorkflow(workflow.id, [
		{
			nodeId: workflow.nodes[0].id,
			versionId: workflow.versionId,
			status: 'activated',
			triggerKind: 'persisted',
			errorMessage: null,
		},
	]);
	const saved = await workflows.findOneByOrFail({ id: workflow.id });
	const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
	const baseline = await service.captureBaseline(saved.id, user.id);
	const graph = {
		nodes: saved.nodes.map((node) => ({ ...node, position: [100, 100] as [number, number] })),
		connections: saved.connections,
	};
	return { user, saved, workflows, project, baseline, graph };
}

it('saves only the final suggestion and keeps its snapshot after history pruning', async () => {
	const { user, saved, workflows, project, baseline, graph } = await fixture();
	const history = Container.get(WorkflowHistoryRepository);
	const beforeHistory = await history.findBy({ workflowId: saved.id });
	expect(await suggestions.count()).toBe(0);
	const prepared = await service.prepareSuggestion(baseline, {
		graph,
		explanation: 'Sample fix',
		errorContext: { summary: 'A node failed', evidenceReference: 'evidence-1' },
	});
	expect(await suggestions.count()).toBe(0);
	const suggestion = await service.createSuggestion(prepared);
	expect(suggestion.state).toBe('pending');
	expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);
	expect(await workflows.findOneByOrFail({ id: saved.id })).toEqual(saved);
	expect(await history.findBy({ workflowId: saved.id })).toEqual(beforeHistory);
	const detail = await service.getProposal(user, project.id, baseline.workflowId, suggestion.id);
	expect(detail.payload.proposed.nodes).toEqual(graph.nodes);
	expect(detail.payload.original.nodes).toEqual(saved.nodes);
	await workflows.update(saved.id, { activeVersionId: null });
	await history.delete({ workflowId: saved.id });
	expect(
		(await service.getProposal(user, project.id, baseline.workflowId, suggestion.id)).payload,
	).toEqual(detail.payload);
});

it('rejects changed settings even when version IDs do not change', async () => {
	const { saved, workflows, baseline, graph } = await fixture();
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Sample fix' });
	await workflows.update(saved.id, { settings: { executionTimeout: 60 } });
	await expect(service.createSuggestion(prepared)).rejects.toThrow('baseline');
	expect(await suggestions.count()).toBe(0);
});

it('stores proposed changes that still need credential configuration', async () => {
	const { user, saved, workflows, project, baseline, graph } = await fixture();
	graph.nodes.push({
		id: 'request',
		name: 'Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4,
		position: [300, 100],
		parameters: {
			url: 'https://example.com/orders',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpBasicAuth',
		},
		credentials: { httpBasicAuth: { id: null, name: 'Configure authentication' } },
	});
	const prepared = await service.prepareSuggestion(baseline, {
		graph,
		explanation: 'Configure authentication to test the proposed request.',
	});
	const suggestion = await service.createSuggestion(prepared);
	const detail = await service.getProposal(user, project.id, baseline.workflowId, suggestion.id);
	expect(detail.payload.candidate).toEqual(graph);
	expect(detail.payload).not.toHaveProperty('validation');
	expect(await workflows.findOneByOrFail({ id: saved.id })).toEqual(saved);
});

it('rolls back the suggestion and activity when the caller transaction fails', async () => {
	const { baseline, graph } = await fixture();
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Sample fix' });
	const tx = Container.get(TransactionRunner);
	let suggestionId = '';
	await expect(
		tx.run({}, async (ctx) => {
			const suggestion = await service.createSuggestion(prepared, ctx);
			suggestionId = suggestion.id;
			expect(await suggestions.getSuggestion(suggestion.id, baseline, ctx)).toMatchObject({
				state: 'pending',
			});
			throw new Error('Caller failed');
		}),
	).rejects.toThrow('Caller failed');
	expect(suggestionId).not.toBe('');
	expect(await suggestions.count()).toBe(0);
	expect(await suggestions.getActivity(suggestionId)).toHaveLength(0);
});

it('does not keep a suggestion when its activity cannot be saved', async () => {
	const { baseline, graph } = await fixture();
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Sample fix' });
	const activity = vi
		.spyOn(suggestions, 'appendSubmittedActivity')
		.mockRejectedValueOnce(new Error('Activity unavailable'));
	try {
		await expect(service.createSuggestion(prepared)).rejects.toThrow('Activity unavailable');
		expect(await suggestions.count()).toBe(0);
	} finally {
		activity.mockRestore();
	}
});

it('rejects final preparation after the background user loses access', async () => {
	const { user, baseline, graph } = await fixture();
	await Container.get(UserRepository).update(user.id, { disabled: true });
	await expect(
		service.prepareSuggestion(baseline, { graph, explanation: 'Sample fix' }),
	).rejects.toThrow('edit access');
	expect(await suggestions.count()).toBe(0);
});

it('lets another editor review after the background identity is disabled', async () => {
	const { user, project, baseline, graph } = await fixture();
	const otherEditor = await createUser({ role: GLOBAL_OWNER_ROLE });
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Sample fix' });
	const suggestion = await service.createSuggestion(prepared);
	await Container.get(UserRepository).update(user.id, { disabled: true });
	await expect(
		service.getProposal(user, project.id, baseline.workflowId, suggestion.id),
	).rejects.toThrow('edit access');
	expect(
		(await service.getProposal(otherEditor, project.id, baseline.workflowId, suggestion.id))
			.backgroundUserId,
	).toBe(user.id);
});

it('lets shared editors read suggestions and checks their current access on each read', async () => {
	const { project, baseline, graph } = await fixture();
	const editor = await createUser();
	const workflow = await Container.get(WorkflowRepository).findOneByOrFail({
		id: baseline.workflowId,
	});
	await shareWorkflowWithUsers(workflow, [editor]);
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Sample fix' });
	const suggestion = await service.createSuggestion(prepared);
	const detail = await service.getProposal(editor, project.id, workflow.id, suggestion.id);
	expect(detail.suggestionId).toBe(suggestion.id);
	const editorProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		editor.id,
	);
	await Container.get(SharedWorkflowRepository).delete({
		workflowId: workflow.id,
		projectId: editorProject.id,
	});
	await expect(service.getProposal(editor, project.id, workflow.id, suggestion.id)).rejects.toThrow(
		ForbiddenError,
	);
});

it('requires proposal reads to match the suggestion workflow and project', async () => {
	const { user, project, baseline, graph } = await fixture();
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Sample fix' });
	const suggestion = await service.createSuggestion(prepared);
	const otherWorkflow = await createWorkflowWithHistory({}, user);
	const otherUser = await createUser();
	const otherProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		otherUser.id,
	);
	await expect(
		service.getProposal(user, project.id, otherWorkflow.id, suggestion.id),
	).rejects.toThrow(NotFoundError);
	await expect(
		service.getProposal(user, otherProject.id, baseline.workflowId, suggestion.id),
	).rejects.toThrow(NotFoundError);
	await expect(
		service.getProposal(otherUser, project.id, baseline.workflowId, suggestion.id),
	).rejects.toThrow(ForbiddenError);
});

describe.skipIf(process.env.DB_TYPE !== 'postgresdb')('Concurrent workflow saves', () => {
	let peer: DataSource;

	beforeAll(async () => {
		// A separate pool keeps this check independent of the application pool size.
		peer = await new DataSource({
			...Container.get(DataSource).options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
		}).initialize();
	});

	afterAll(async () => {
		if (peer?.isInitialized) await peer.destroy();
	});

	it('preserves an edit made after the final baseline check without blocking it', async () => {
		const { saved, workflows, baseline, graph } = await fixture();
		const prepared = await service.prepareSuggestion(baseline, {
			graph,
			explanation: 'Sample fix',
		});
		const createPending = suggestions.createPending.bind(suggestions);
		const insert = vi
			.spyOn(suggestions, 'createPending')
			.mockImplementationOnce(async (...args) => {
				await peer.transaction(async (manager) => {
					await manager.query("SET LOCAL lock_timeout = '250ms'");
					await manager.update(WorkflowEntity, saved.id, { settings: { executionTimeout: 60 } });
				});
				return await createPending(...args);
			});
		try {
			const suggestion = await service.createSuggestion(prepared);
			expect(suggestion.expectedBaseline).toEqual(baseline.expectedBaseline);
			expect(suggestion.payload.original).toEqual(baseline.original);
			expect(suggestion.payload.candidate).toEqual(graph);
			expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);
			expect(await workflows.findOneByOrFail({ id: saved.id })).toMatchObject({
				nodes: saved.nodes,
				connections: saved.connections,
				settings: { executionTimeout: 60 },
			});
		} finally {
			insert.mockRestore();
		}
	});
});

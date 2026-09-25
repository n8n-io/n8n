import { ModuleRegistry } from '@n8n/backend-common';
import { createWorkflowWithHistory, testDb, testModules } from '@n8n/backend-test-utils';
import {
	TransactionRunner,
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
	ProjectRepository,
	GLOBAL_OWNER_ROLE,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { createUser } from '@test-integration/db/users';

import { WorkflowSuggestionActivityEntity } from '../database/workflow-suggestion-activity.entity';
import { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import type { WorkflowSuggestionCandidateService } from '../workflow-suggestion-candidate.service';
import { WorkflowSuggestionService } from '../workflow-suggestion.service';

const candidates = mock<WorkflowSuggestionCandidateService>();
let service: WorkflowSuggestionService;
let suggestions: WorkflowSuggestionRepository;

beforeAll(async () => {
	await testModules.loadModules(['workflow-suggestions']);
	await testDb.init();
	suggestions = Container.get(WorkflowSuggestionRepository);
	service = new WorkflowSuggestionService(
		suggestions,
		candidates,
		Container.get(UserRepository),
		Container.get(WorkflowPublicationStatusService),
		Container.get(TransactionRunner),
		Container.get(ModuleRegistry),
	);
});
beforeEach(() => {
	vi.resetAllMocks();
	candidates.prepare.mockImplementation(async (_user, _workflow, _project, _baseline, graph) =>
		structuredClone(graph),
	);
});
afterEach(async () => {
	await Container.get(DataSource).getRepository(WorkflowSuggestionActivityEntity).clear();
	await suggestions.createQueryBuilder().delete().execute();
});
afterAll(async () => await testDb.terminate());

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
	const detail = await service.getProposal(user, project.id, suggestion.id);
	expect(detail.payload.proposed.nodes).toEqual(graph.nodes);
	expect(detail.payload.original.nodes).toEqual(saved.nodes);
	await workflows.update(saved.id, { activeVersionId: null });
	await history.delete({ workflowId: saved.id });
	expect((await service.getProposal(user, project.id, suggestion.id)).payload).toEqual(
		detail.payload,
	);
});

it('rejects changed settings even when version IDs do not change', async () => {
	const { saved, workflows, baseline, graph } = await fixture();
	const prepared = await service.prepareSuggestion(baseline, { graph, explanation: 'Sample fix' });
	await workflows.update(saved.id, { settings: { executionTimeout: 60 } });
	await expect(service.createSuggestion(prepared)).rejects.toThrow('baseline');
	expect(await suggestions.count()).toBe(0);
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
			expect(await suggestions.getSuggestion(suggestion.id, ctx)).toMatchObject({
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
	await expect(service.getProposal(user, project.id, suggestion.id)).rejects.toThrow('edit access');
	expect((await service.getProposal(otherEditor, project.id, suggestion.id)).backgroundUserId).toBe(
		user.id,
	);
});

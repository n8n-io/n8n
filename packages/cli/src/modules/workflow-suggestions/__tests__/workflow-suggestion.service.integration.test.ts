import type { WorkflowSuggestionSource } from '@n8n/api-types';
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
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
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
	const source: WorkflowSuggestionSource = {
		sourceKey: randomUUID(),
		workflowId: workflow.id,
		backgroundUserId: user.id,
		expectedBaseline: {
			savedVersionId: workflow.versionId,
			publishedVersionId: workflow.versionId,
			checksum: await calculateWorkflowChecksum(saved),
		},
	};
	const graph = {
		nodes: saved.nodes.map((node) => ({ ...node, position: [100, 100] as [number, number] })),
		connections: saved.connections,
	};
	return { user, saved, workflows, project, source, graph };
}

it('creates and revises an isolated sample, submits once, and keeps its frozen snapshot after history pruning', async () => {
	const { user, saved, workflows, project, source, graph } = await fixture();
	const history = Container.get(WorkflowHistoryRepository);
	const beforeHistory = await history.findBy({ workflowId: saved.id });
	const suggestion = await service.createSuggestion(source, {
		summary: 'A node failed',
		evidenceReference: 'evidence-1',
	});
	await service.reviseSuggestion(source, {
		suggestionId: suggestion.id,
		expectedRevision: 1,
		graph,
		explanation: 'Sample fix',
	});
	const submissions = await Promise.all([
		service.submitSuggestion(source, suggestion.id, 2),
		service.submitSuggestion(source, suggestion.id, 2),
	]);
	expect(submissions[0]).toEqual(submissions[1]);
	expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);
	expect(await workflows.findOneByOrFail({ id: saved.id })).toEqual(saved);
	expect(await history.findBy({ workflowId: saved.id })).toEqual(beforeHistory);
	const detail = await service.getProposal(user, project.id, suggestion.id);
	expect(detail.payload?.proposed.nodes).toEqual(graph.nodes);
	await workflows.update(saved.id, { activeVersionId: null });
	await history.delete({ workflowId: saved.id });
	expect((await service.getProposal(user, project.id, suggestion.id)).payload).toEqual(
		detail.payload,
	);
});

it('rejects a settings change before creation and closes an old suggestion on submission', async () => {
	const { saved, workflows, source, graph } = await fixture();
	const suggestion = await service.createSuggestion(source);
	await service.reviseSuggestion(source, {
		suggestionId: suggestion.id,
		expectedRevision: 1,
		graph,
		explanation: 'Sample fix',
	});
	await workflows.update(saved.id, { settings: { executionTimeout: 60 } });
	await expect(service.createSuggestion({ ...source, sourceKey: randomUUID() })).rejects.toThrow(
		'baseline',
	);
	expect(await service.submitSuggestion(source, suggestion.id, 2)).toMatchObject({
		state: 'closed',
		closedReason: 'outdated',
	});
	expect(await suggestions.getActivity(suggestion.id)).toHaveLength(0);
});

it('lets another editor review after the background identity is disabled', async () => {
	const { user, project, source, graph } = await fixture();
	const otherEditor = await createUser({ role: GLOBAL_OWNER_ROLE });
	const suggestion = await service.createSuggestion(source);
	await service.reviseSuggestion(source, {
		suggestionId: suggestion.id,
		expectedRevision: 1,
		graph,
		explanation: 'Sample fix',
	});
	await service.submitSuggestion(source, suggestion.id, 2);
	await Container.get(UserRepository).update(user.id, { disabled: true });
	await expect(service.readSuggestion(source, suggestion.id)).rejects.toThrow('edit access');
	await expect(service.getProposal(user, project.id, suggestion.id)).rejects.toThrow('edit access');
	expect(
		(await service.getProposal(otherEditor, project.id, suggestion.id)).source.backgroundUserId,
	).toBe(user.id);
	expect(await service.getLifecycleResult(source)).toMatchObject({ state: 'pending' });
});

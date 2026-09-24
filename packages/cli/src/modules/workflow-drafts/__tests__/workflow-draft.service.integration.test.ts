import type { WorkflowDraftSource } from '@n8n/api-types';
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

import { WorkflowDraftActivityEntity } from '../database/workflow-draft-activity.entity';
import { WorkflowDraftRepository } from '../database/workflow-draft.repository';
import type { WorkflowDraftCandidateService } from '../workflow-draft-candidate.service';
import { WorkflowDraftService } from '../workflow-draft.service';

const candidates = mock<WorkflowDraftCandidateService>();
let service: WorkflowDraftService;
let drafts: WorkflowDraftRepository;

beforeAll(async () => {
	await testModules.loadModules(['workflow-drafts']);
	await testDb.init();
	drafts = Container.get(WorkflowDraftRepository);
	service = new WorkflowDraftService(
		drafts,
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
	await Container.get(DataSource).getRepository(WorkflowDraftActivityEntity).clear();
	await drafts.createQueryBuilder().delete().execute();
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
	const source: WorkflowDraftSource = {
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
	const draft = await service.createDraft(source, {
		summary: 'A node failed',
		evidenceReference: 'evidence-1',
	});
	await service.reviseDraft(source, {
		draftId: draft.id,
		expectedRevision: 1,
		graph,
		explanation: 'Sample fix',
	});
	const submissions = await Promise.all([
		service.submitDraft(source, draft.id, 2),
		service.submitDraft(source, draft.id, 2),
	]);
	expect(submissions[0]).toEqual(submissions[1]);
	expect(await drafts.getActivity(draft.id)).toHaveLength(1);
	expect(await workflows.findOneByOrFail({ id: saved.id })).toEqual(saved);
	expect(await history.findBy({ workflowId: saved.id })).toEqual(beforeHistory);
	const detail = await service.getProposal(user, project.id, draft.id);
	expect(detail.payload?.proposed.nodes).toEqual(graph.nodes);
	await workflows.update(saved.id, { activeVersionId: null });
	await history.delete({ workflowId: saved.id });
	expect((await service.getProposal(user, project.id, draft.id)).payload).toEqual(detail.payload);
});

it('rejects a settings change before creation and closes an old draft on submission', async () => {
	const { saved, workflows, source, graph } = await fixture();
	const draft = await service.createDraft(source);
	await service.reviseDraft(source, {
		draftId: draft.id,
		expectedRevision: 1,
		graph,
		explanation: 'Sample fix',
	});
	await workflows.update(saved.id, { settings: { executionTimeout: 60 } });
	await expect(service.createDraft({ ...source, sourceKey: randomUUID() })).rejects.toThrow(
		'baseline',
	);
	expect(await service.submitDraft(source, draft.id, 2)).toMatchObject({
		state: 'closed',
		closedReason: 'outdated',
	});
	expect(await drafts.getActivity(draft.id)).toHaveLength(0);
});

it('lets another editor review after the background identity is disabled', async () => {
	const { user, project, source, graph } = await fixture();
	const otherEditor = await createUser({ role: GLOBAL_OWNER_ROLE });
	const draft = await service.createDraft(source);
	await service.reviseDraft(source, {
		draftId: draft.id,
		expectedRevision: 1,
		graph,
		explanation: 'Sample fix',
	});
	await service.submitDraft(source, draft.id, 2);
	await Container.get(UserRepository).update(user.id, { disabled: true });
	await expect(service.readDraft(source, draft.id)).rejects.toThrow('edit access');
	await expect(service.getProposal(user, project.id, draft.id)).rejects.toThrow('edit access');
	expect(
		(await service.getProposal(otherEditor, project.id, draft.id)).source.backgroundUserId,
	).toBe(user.id);
	expect(await service.getLifecycleResult(source)).toMatchObject({ state: 'pending' });
});

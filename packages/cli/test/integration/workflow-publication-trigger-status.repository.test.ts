import { createWorkflow, createWorkflowHistory, testDb } from '@n8n/backend-test-utils';
import type { IWorkflowDb } from '@n8n/db';
import {
	WorkflowHistoryRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

/** Seeds `workflow_history` rows so the trigger-status versionId FK is satisfiable. */
async function seedVersions(workflow: IWorkflowDb, versionIds: string[]): Promise<void> {
	for (const versionId of versionIds) {
		await createWorkflowHistory(workflow, undefined, undefined, { versionId });
	}
}

describe('WorkflowPublicationTriggerStatusRepository', () => {
	let repo: WorkflowPublicationTriggerStatusRepository;
	let outboxRepo: WorkflowPublicationOutboxRepository;
	let workflowRepository: WorkflowRepository;
	let workflowHistoryRepository: WorkflowHistoryRepository;

	// Shared fixture for the non-destructive tests; the CASCADE tests create their
	// own workflow/version since they delete the parent.
	let workflow: IWorkflowDb;

	beforeAll(async () => {
		await testDb.init();
		repo = Container.get(WorkflowPublicationTriggerStatusRepository);
		outboxRepo = Container.get(WorkflowPublicationOutboxRepository);
		workflowRepository = Container.get(WorkflowRepository);
		workflowHistoryRepository = Container.get(WorkflowHistoryRepository);

		workflow = await createWorkflow();
		await seedVersions(workflow, ['v1', 'v2']);
	});
	afterEach(async () => {
		await testDb.truncate(['WorkflowPublicationTriggerStatus', 'WorkflowPublicationOutbox']);
	});
	afterAll(async () => await testDb.terminate());

	it('replaceForWorkflow inserts rows then overwrites them', async () => {
		await repo.replaceForWorkflow(workflow.id, [
			{ nodeId: 'n1', versionId: 'v1', status: 'activated', errorMessage: null },
			{ nodeId: 'n2', versionId: 'v1', status: 'failed', errorMessage: 'boom' },
		]);
		expect(await repo.findByWorkflowId(workflow.id)).toHaveLength(2);

		await repo.replaceForWorkflow(workflow.id, [
			{ nodeId: 'n1', versionId: 'v2', status: 'activated', errorMessage: null },
		]);
		const rows = await repo.findByWorkflowId(workflow.id);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ nodeId: 'n1', versionId: 'v2', status: 'activated' });
	});

	it('replaceForWorkflow with an empty list clears all rows', async () => {
		await repo.replaceForWorkflow(workflow.id, [
			{ nodeId: 'n1', versionId: 'v1', status: 'activated', errorMessage: null },
		]);
		await repo.replaceForWorkflow(workflow.id, []);
		expect(await repo.findByWorkflowId(workflow.id)).toHaveLength(0);
	});

	it('FK CASCADE deletes trigger status rows when parent workflow is deleted', async () => {
		const ownWorkflow = await createWorkflow();
		await seedVersions(ownWorkflow, ['v-wf-cascade']);
		await repo.replaceForWorkflow(ownWorkflow.id, [
			{ nodeId: 'n1', versionId: 'v-wf-cascade', status: 'activated', errorMessage: null },
			{ nodeId: 'n2', versionId: 'v-wf-cascade', status: 'failed', errorMessage: 'boom' },
		]);
		expect(await repo.findByWorkflowId(ownWorkflow.id)).toHaveLength(2);

		await workflowRepository.delete(ownWorkflow.id);

		expect(await repo.findByWorkflowId(ownWorkflow.id)).toEqual([]);
	});

	it('FK CASCADE deletes trigger status rows when the referenced version is deleted', async () => {
		const ownWorkflow = await createWorkflow();
		await seedVersions(ownWorkflow, ['v-version-cascade']);
		await repo.replaceForWorkflow(ownWorkflow.id, [
			{ nodeId: 'n1', versionId: 'v-version-cascade', status: 'activated', errorMessage: null },
		]);
		expect(await repo.findByWorkflowId(ownWorkflow.id)).toHaveLength(1);

		await workflowHistoryRepository.delete({ versionId: 'v-version-cascade' });

		expect(await repo.findByWorkflowId(ownWorkflow.id)).toEqual([]);
	});

	it('findInFlightByWorkflowId prefers the in_progress record when a pending one coexists', async () => {
		const wf = await createWorkflow();
		// A pending and an in_progress record can coexist for the same workflow:
		// their (workflowId, status) tuples differ, so the partial unique index allows both.
		await outboxRepo.save(
			outboxRepo.create({
				workflowId: wf.id,
				publishedVersionId: 'v-pending',
				status: 'pending',
				errorMessage: null,
			}),
		);
		await outboxRepo.save(
			outboxRepo.create({
				workflowId: wf.id,
				publishedVersionId: 'v-in-progress',
				status: 'in_progress',
				errorMessage: null,
			}),
		);

		const inFlight = await outboxRepo.findInFlightByWorkflowId(wf.id);
		expect(inFlight).not.toBeNull();
		expect(inFlight!.status).toBe('in_progress');
		expect(inFlight!.publishedVersionId).toBe('v-in-progress');
	});

	it('findInFlightByWorkflowId ignores terminal records', async () => {
		const wf = await createWorkflow();
		await outboxRepo.save(
			outboxRepo.create({
				workflowId: wf.id,
				publishedVersionId: 'v1',
				status: 'completed',
				errorMessage: null,
			}),
		);

		expect(await outboxRepo.findInFlightByWorkflowId(wf.id)).toBeNull();
	});

	it('findInFlightByWorkflowId returns null when no outbox records exist', async () => {
		const wf = await createWorkflow();
		expect(await outboxRepo.findInFlightByWorkflowId(wf.id)).toBeNull();
	});
});

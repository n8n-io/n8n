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
		// Mark the workflow active: `findActivatedInMemoryTriggers` only considers
		// workflows with an `activeVersionId`. Set after seeding to satisfy the FK.
		await workflowRepository.update(workflow.id, { activeVersionId: 'v1' });
	});
	afterEach(async () => {
		await testDb.truncate(['WorkflowPublicationTriggerStatus', 'WorkflowPublicationOutbox']);
	});
	afterAll(async () => await testDb.terminate());

	it('replaceForWorkflow inserts rows then overwrites them', async () => {
		await repo.replaceForWorkflow(workflow.id, [
			{
				nodeId: 'n1',
				versionId: 'v1',
				status: 'activated',
				errorMessage: null,
				triggerKind: 'in-memory',
			},
			{
				nodeId: 'n2',
				versionId: 'v1',
				status: 'failed',
				errorMessage: 'boom',
				triggerKind: 'in-memory',
			},
		]);
		expect(await repo.findByWorkflowId(workflow.id)).toHaveLength(2);

		await repo.replaceForWorkflow(workflow.id, [
			{
				nodeId: 'n1',
				versionId: 'v2',
				status: 'activated',
				errorMessage: null,
				triggerKind: 'in-memory',
			},
		]);
		const rows = await repo.findByWorkflowId(workflow.id);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ nodeId: 'n1', versionId: 'v2', status: 'activated' });
	});

	it('replaceForWorkflow with an empty list clears all rows', async () => {
		await repo.replaceForWorkflow(workflow.id, [
			{
				nodeId: 'n1',
				versionId: 'v1',
				status: 'activated',
				errorMessage: null,
				triggerKind: 'in-memory',
			},
		]);
		await repo.replaceForWorkflow(workflow.id, []);
		expect(await repo.findByWorkflowId(workflow.id)).toHaveLength(0);
	});

	it('FK CASCADE deletes trigger status rows when parent workflow is deleted', async () => {
		const ownWorkflow = await createWorkflow();
		await seedVersions(ownWorkflow, ['v-wf-cascade']);
		await repo.replaceForWorkflow(ownWorkflow.id, [
			{
				nodeId: 'n1',
				versionId: 'v-wf-cascade',
				status: 'activated',
				errorMessage: null,
				triggerKind: 'in-memory',
			},
			{
				nodeId: 'n2',
				versionId: 'v-wf-cascade',
				status: 'failed',
				errorMessage: 'boom',
				triggerKind: 'in-memory',
			},
		]);
		expect(await repo.findByWorkflowId(ownWorkflow.id)).toHaveLength(2);

		await workflowRepository.delete(ownWorkflow.id);

		expect(await repo.findByWorkflowId(ownWorkflow.id)).toEqual([]);
	});

	it('FK CASCADE deletes trigger status rows when the referenced version is deleted', async () => {
		const ownWorkflow = await createWorkflow();
		await seedVersions(ownWorkflow, ['v-version-cascade']);
		await repo.replaceForWorkflow(ownWorkflow.id, [
			{
				nodeId: 'n1',
				versionId: 'v-version-cascade',
				status: 'activated',
				errorMessage: null,
				triggerKind: 'in-memory',
			},
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

	describe('findActivatedInMemoryTriggers', () => {
		it('returns activated in-memory triggers, excluding persisted and failed rows', async () => {
			await repo.replaceForWorkflow(workflow.id, [
				{
					nodeId: 'poll1',
					versionId: 'v1',
					status: 'activated',
					errorMessage: null,
					triggerKind: 'in-memory',
				},
				{
					nodeId: 'trig1',
					versionId: 'v1',
					status: 'activated',
					errorMessage: null,
					triggerKind: 'in-memory',
				},
				{
					nodeId: 'hook1',
					versionId: 'v1',
					status: 'activated',
					errorMessage: null,
					triggerKind: 'persisted',
				},
				{
					nodeId: 'poll2',
					versionId: 'v1',
					status: 'failed',
					errorMessage: 'boom',
					triggerKind: 'in-memory',
				},
			]);

			const rows = await repo.findActivatedInMemoryTriggers();

			expect(rows).toEqual(
				expect.arrayContaining([
					{ workflowId: workflow.id, nodeId: 'poll1' },
					{ workflowId: workflow.id, nodeId: 'trig1' },
				]),
			);
			expect(rows).toHaveLength(2);
		});

		it('spans multiple workflows', async () => {
			const otherWorkflow = await createWorkflow();
			await seedVersions(otherWorkflow, ['v-other']);
			await workflowRepository.update(otherWorkflow.id, { activeVersionId: 'v-other' });

			await repo.replaceForWorkflow(workflow.id, [
				{
					nodeId: 'poll1',
					versionId: 'v1',
					status: 'activated',
					errorMessage: null,
					triggerKind: 'in-memory',
				},
			]);
			await repo.replaceForWorkflow(otherWorkflow.id, [
				{
					nodeId: 'trig1',
					versionId: 'v-other',
					status: 'activated',
					errorMessage: null,
					triggerKind: 'in-memory',
				},
			]);

			const rows = await repo.findActivatedInMemoryTriggers();

			expect(rows).toEqual(
				expect.arrayContaining([
					{ workflowId: workflow.id, nodeId: 'poll1' },
					{ workflowId: otherWorkflow.id, nodeId: 'trig1' },
				]),
			);
			expect(rows).toHaveLength(2);
		});

		it('includes stale rows of workflows without an active version so reconciliation can heal them', async () => {
			// Rows orphaned by an interrupted unpublish: the workflow is no longer
			// active but its `activated` rows were never cleared. They must surface as
			// a deficit so the reconciler re-enqueues the unpublish that clears them.
			const unpublishedWorkflow = await createWorkflow();
			await seedVersions(unpublishedWorkflow, ['v-stale']);
			await repo.replaceForWorkflow(unpublishedWorkflow.id, [
				{
					nodeId: 'poll-stale',
					versionId: 'v-stale',
					status: 'activated',
					errorMessage: null,
					triggerKind: 'in-memory',
				},
			]);

			expect(await repo.findActivatedInMemoryTriggers()).toEqual([
				{ workflowId: unpublishedWorkflow.id, nodeId: 'poll-stale' },
			]);
		});

		it('excludes workflows with an in-flight publication record', async () => {
			await repo.replaceForWorkflow(workflow.id, [
				{
					nodeId: 'poll1',
					versionId: 'v1',
					status: 'activated',
					errorMessage: null,
					triggerKind: 'in-memory',
				},
			]);

			// An in-flight (pending/in_progress) publication is about to reconcile
			// the workflow anyway, so its triggers must not be reported.
			const record = outboxRepo.create({
				workflowId: workflow.id,
				publishedVersionId: 'v1',
				status: 'pending',
				errorMessage: null,
			});
			await outboxRepo.save(record);
			expect(await repo.findActivatedInMemoryTriggers()).toEqual([]);

			// Once the record is terminal the workflow is reported again.
			await outboxRepo.update(record.id, { status: 'completed' });
			expect(await repo.findActivatedInMemoryTriggers()).toEqual([
				{ workflowId: workflow.id, nodeId: 'poll1' },
			]);
		});
	});
});

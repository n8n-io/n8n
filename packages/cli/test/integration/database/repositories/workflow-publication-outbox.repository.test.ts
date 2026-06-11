import { testDb } from '@n8n/backend-test-utils';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import assert from 'node:assert';

describe('WorkflowPublicationOutboxRepository', () => {
	let repository: WorkflowPublicationOutboxRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowPublicationOutboxRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowPublicationOutbox']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('enqueues a pending record that can then be claimed', async () => {
		await repository.enqueue('wf-1', 'v-1');

		const claimed = await repository.claimNextPendingRecord();

		expect(claimed?.workflowId).toBe('wf-1');
		expect(claimed?.publishedVersionId).toBe('v-1');
		expect(claimed?.status).toBe('in_progress');

		const claimedAgain = await repository.claimNextPendingRecord();
		expect(claimedAgain).toBeNull();
	});

	it('supersedes an existing pending record when re-enqueued for the same workflow', async () => {
		await repository.enqueue('wf-1', 'v-1');
		await repository.enqueue('wf-1', 'v-2');

		const claimed = await repository.claimNextPendingRecord();
		expect(claimed?.workflowId).toBe('wf-1');
		expect(claimed?.publishedVersionId).toBe('v-2');

		// Only one record ever existed for the workflow, so nothing else is pending.
		const claimedAgain = await repository.claimNextPendingRecord();
		expect(claimedAgain).toBeNull();
	});

	it('enqueues within a provided transaction and is visible once it commits', async () => {
		await repository.manager.transaction(async (trx) => {
			await repository.enqueue('wf-1', 'v-1', trx);
		});

		const claimed = await repository.claimNextPendingRecord();
		expect(claimed?.workflowId).toBe('wf-1');
		expect(claimed?.publishedVersionId).toBe('v-1');
	});

	it('discards the enqueued record when the surrounding transaction rolls back', async () => {
		await expect(
			repository.manager.transaction(async (trx) => {
				await repository.enqueue('wf-1', 'v-1', trx);
				throw new Error('rollback');
			}),
		).rejects.toThrow('rollback');

		expect(await repository.claimNextPendingRecord()).toBeNull();
	});

	it('claims pending records in FIFO order', async () => {
		await repository.enqueue('wf-1', 'v-1');
		await repository.enqueue('wf-2', 'v-1');

		const first = await repository.claimNextPendingRecord();
		const second = await repository.claimNextPendingRecord();

		expect(first?.workflowId).toBe('wf-1');
		expect(second?.workflowId).toBe('wf-2');
	});

	it('does not claim a second record for a workflow already in progress', async () => {
		// wf-1 is claimed (in progress), then a newer version is enqueued.
		await repository.enqueue('wf-1', 'v-1');
		const inProgress = await repository.claimNextPendingRecord();
		assert(inProgress);
		await repository.enqueue('wf-1', 'v-2');

		// A different workflow is claimable, but wf-1's new pending record is not
		// until its in-progress record is resolved.
		await repository.enqueue('wf-2', 'v-1');
		const claimed = await repository.claimNextPendingRecord();
		expect(claimed?.workflowId).toBe('wf-2');
		expect(await repository.claimNextPendingRecord()).toBeNull();

		// Once wf-1's in-progress record completes, its pending record is claimable.
		await repository.markCompleted(inProgress.id);
		const next = await repository.claimNextPendingRecord();
		expect(next?.workflowId).toBe('wf-1');
		expect(next?.publishedVersionId).toBe('v-2');
	});

	it('enqueues a fresh pending record once the previous one is no longer pending', async () => {
		await repository.enqueue('wf-1', 'v-1');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);
		await repository.markCompleted(claimed.id);

		await repository.enqueue('wf-1', 'v-2');

		const next = await repository.claimNextPendingRecord();
		expect(next?.id).not.toBe(claimed.id);
		expect(next?.publishedVersionId).toBe('v-2');
	});

	it('marks a claimed record as completed', async () => {
		await repository.enqueue('wf-1', 'v-1');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);

		await repository.markCompleted(claimed.id);

		const record = await repository.findOneBy({ id: claimed.id });
		expect(record?.status).toBe('completed');
		expect(record?.errorMessage).toBeNull();
	});

	it('marks a claimed record as failed and records the error', async () => {
		await repository.enqueue('wf-1', 'v-1');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);

		await repository.markFailed(claimed.id, 'boom');

		const record = await repository.findOneBy({ id: claimed.id });
		expect(record?.status).toBe('failed');
		expect(record?.errorMessage).toBe('boom');
	});

	it('throws when transitioning a record that is not in progress', async () => {
		await repository.enqueue('wf-1', 'v-1');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);
		await repository.markCompleted(claimed.id);

		// Record is already completed, so it is no longer in progress.
		await expect(repository.markCompleted(claimed.id)).rejects.toThrow();
		await expect(repository.markFailed(claimed.id, 'boom')).rejects.toThrow();
	});

	// TODO: cover Postgres `FOR UPDATE SKIP LOCKED` concurrency control under
	// parallel claimers in a follow-up.
});

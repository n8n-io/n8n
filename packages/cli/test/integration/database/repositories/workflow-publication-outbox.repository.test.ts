import { createActiveWorkflow, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationOutboxRepository, WorkflowRepository } from '@n8n/db';
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

	describe('returnToPending', () => {
		it('returns a claimed record to the queue so it can be claimed again', async () => {
			await repository.enqueue('wf-1', 'v-1');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);

			await repository.returnToPending(claimed.id);

			const record = await repository.findOneBy({ id: claimed.id });
			expect(record?.status).toBe('pending');

			const reclaimed = await repository.claimNextPendingRecord();
			expect(reclaimed?.id).toBe(claimed.id);
			expect(reclaimed?.publishedVersionId).toBe('v-1');
		});

		it('drops the claimed record when a newer pending record already supersedes it', async () => {
			// wf-1 is claimed (in progress), then a newer version is enqueued as pending.
			await repository.enqueue('wf-1', 'v-1');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await repository.enqueue('wf-1', 'v-2');

			await repository.returnToPending(claimed.id);

			// The in-progress row is gone; only the superseding pending record remains.
			expect(await repository.findOneBy({ id: claimed.id })).toBeNull();
			const next = await repository.claimNextPendingRecord();
			expect(next?.publishedVersionId).toBe('v-2');
			expect(await repository.claimNextPendingRecord()).toBeNull();
		});

		it('is a no-op when the record is no longer in progress', async () => {
			await repository.enqueue('wf-1', 'v-1');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await repository.markCompleted(claimed.id);

			await expect(repository.returnToPending(claimed.id)).resolves.toBeUndefined();

			const record = await repository.findOneBy({ id: claimed.id });
			expect(record?.status).toBe('completed');
		});
	});

	describe('stale in_progress lease reclaim', () => {
		let workflowsConfig: WorkflowsConfig;
		let originalLeaseSeconds: number;

		// Backdate `updatedAt` via raw SQL: `.update()` would re-stamp it.
		const backdateUpdatedAt = async (id: number) => {
			await repository.query(
				`UPDATE ${repository.metadata.tableName} SET "updatedAt" = '2020-01-01 00:00:00.000' WHERE "id" = ${id}`,
			);
		};

		beforeEach(() => {
			workflowsConfig = Container.get(WorkflowsConfig);
			originalLeaseSeconds = workflowsConfig.publicationOutboxLeaseSeconds;
			workflowsConfig.publicationOutboxLeaseSeconds = 60;
		});

		afterEach(() => {
			workflowsConfig.publicationOutboxLeaseSeconds = originalLeaseSeconds;
		});

		it('reclaims a stale in_progress record', async () => {
			await repository.enqueue('wf-1', 'v-1');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await backdateUpdatedAt(claimed.id);

			const reclaimed = await repository.claimNextPendingRecord();

			expect(reclaimed?.id).toBe(claimed.id);
			expect(reclaimed?.status).toBe('in_progress');
		});

		it('does not reclaim a fresh in_progress record', async () => {
			await repository.enqueue('wf-1', 'v-1');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);

			// Just claimed, so it is within the lease window.
			expect(await repository.claimNextPendingRecord()).toBeNull();
		});

		it('bumps updatedAt on reclaim so it is not immediately reclaimable again', async () => {
			await repository.enqueue('wf-1', 'v-1');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await backdateUpdatedAt(claimed.id);

			const reclaimed = await repository.claimNextPendingRecord();
			assert(reclaimed);

			// Reclaim refreshed updatedAt, so it is fresh again.
			expect(await repository.claimNextPendingRecord()).toBeNull();
		});

		it('reclaims the stale in_progress only, leaving a newer pending record untouched', async () => {
			await repository.enqueue('wf-1', 'v-1');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await repository.enqueue('wf-1', 'v-2');
			await backdateUpdatedAt(claimed.id);

			const reclaimed = await repository.claimNextPendingRecord();
			expect(reclaimed?.id).toBe(claimed.id);
			expect(reclaimed?.publishedVersionId).toBe('v-1');

			// No second in_progress row was created; the pending record is untouched.
			const inProgress = await repository.find({ where: { status: 'in_progress' } });
			expect(inProgress).toHaveLength(1);
			const pending = await repository.find({ where: { status: 'pending' } });
			expect(pending).toHaveLength(1);
			expect(pending[0].publishedVersionId).toBe('v-2');
		});
	});

	describe('deleteTerminalOlderThan', () => {
		const TEN_YEARS_SECONDS = 10 * 365 * 24 * 60 * 60;

		// Backdate `updatedAt` via raw SQL: the `mark*` helpers re-stamp it.
		const backdateUpdatedAt = async (id: number) => {
			await repository.query(
				`UPDATE ${repository.metadata.tableName} SET "updatedAt" = '2020-01-01 00:00:00.000' WHERE "id" = ${id}`,
			);
		};

		const createTerminal = async (
			workflowId: string,
			outcome: 'completed' | 'failed' | 'partial',
		) => {
			await repository.enqueue(workflowId, 'v-1');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			if (outcome === 'completed') await repository.markCompleted(claimed.id);
			else if (outcome === 'failed') await repository.markFailed(claimed.id, 'boom');
			else await repository.markPartialSuccess(claimed.id, 'boom');
			return claimed.id;
		};

		it('deletes completed rows past the completed retention but keeps failed/partial of the same age (split retention)', async () => {
			const completedId = await createTerminal('wf-1', 'completed');
			const failedId = await createTerminal('wf-2', 'failed');
			const partialId = await createTerminal('wf-3', 'partial');
			await backdateUpdatedAt(completedId);
			await backdateUpdatedAt(failedId);
			await backdateUpdatedAt(partialId);

			// Completed retention is tiny so the old completed row is past it; failed
			// retention is huge so the equally-old failed/partial rows are kept.
			const deleted = await repository.deleteTerminalOlderThan(60, TEN_YEARS_SECONDS, 100);

			expect(deleted).toBe(1);
			expect(await repository.findOneBy({ id: completedId })).toBeNull();
			expect(await repository.findOneBy({ id: failedId })).not.toBeNull();
			expect(await repository.findOneBy({ id: partialId })).not.toBeNull();
		});

		it('deletes failed and partial rows once they pass the failed retention', async () => {
			const failedId = await createTerminal('wf-1', 'failed');
			const partialId = await createTerminal('wf-2', 'partial');
			await backdateUpdatedAt(failedId);
			await backdateUpdatedAt(partialId);

			const deleted = await repository.deleteTerminalOlderThan(60, 60, 100);

			expect(deleted).toBe(2);
			expect(await repository.findOneBy({ id: failedId })).toBeNull();
			expect(await repository.findOneBy({ id: partialId })).toBeNull();
		});

		it('keeps terminal rows that are still within their retention window', async () => {
			const completedId = await createTerminal('wf-1', 'completed');
			const failedId = await createTerminal('wf-2', 'failed');

			// Just created, so within any positive retention window.
			const deleted = await repository.deleteTerminalOlderThan(60, 60, 100);

			expect(deleted).toBe(0);
			expect(await repository.findOneBy({ id: completedId })).not.toBeNull();
			expect(await repository.findOneBy({ id: failedId })).not.toBeNull();
		});

		it('never deletes pending or in_progress rows', async () => {
			await repository.enqueue('wf-1', 'v-1'); // stays pending
			await repository.enqueue('wf-2', 'v-1');
			const inProgress = await repository.claimNextPendingRecord();
			assert(inProgress);
			await backdateUpdatedAt(inProgress.id);

			const deleted = await repository.deleteTerminalOlderThan(0, 0, 100);

			expect(deleted).toBe(0);
			expect(await repository.find({ where: { status: 'pending' } })).toHaveLength(1);
			expect(await repository.find({ where: { status: 'in_progress' } })).toHaveLength(1);
		});

		it('deletes at most batchSize rows per call and reports the count', async () => {
			const ids: number[] = [];
			for (let i = 0; i < 3; i++) {
				const id = await createTerminal(`wf-${i}`, 'completed');
				await backdateUpdatedAt(id);
				ids.push(id);
			}

			const firstBatch = await repository.deleteTerminalOlderThan(60, 60, 2);
			expect(firstBatch).toBe(2);

			const secondBatch = await repository.deleteTerminalOlderThan(60, 60, 2);
			expect(secondBatch).toBe(1);

			const remaining = await repository.find({ where: { status: 'completed' } });
			expect(remaining).toHaveLength(0);
		});
	});

	// TODO: cover Postgres `FOR UPDATE SKIP LOCKED` concurrency control under
	// parallel claimers in a follow-up.

	describe('enqueueAllActiveWorkflows', () => {
		beforeEach(async () => {
			await testDb.truncate([
				'WorkflowDependency',
				'WorkflowEntity',
				'WorkflowHistory',
				'WorkflowPublishHistory',
			]);
		});

		it('enqueues one pending record per active workflow at its active version', async () => {
			const wf1 = await createActiveWorkflow();
			const wf2 = await createActiveWorkflow();

			await repository.enqueueAllActiveWorkflows();

			const pending = await repository.find({ where: { status: 'pending' } });
			expect(pending).toHaveLength(2);
			expect(pending).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						workflowId: wf1.id,
						publishedVersionId: wf1.activeVersionId,
						status: 'pending',
					}),
					expect.objectContaining({
						workflowId: wf2.id,
						publishedVersionId: wf2.activeVersionId,
						status: 'pending',
					}),
				]),
			);
		});

		it('is idempotent: re-running does not create duplicate pending records', async () => {
			const workflow = await createActiveWorkflow();

			await repository.enqueueAllActiveWorkflows();
			await repository.enqueueAllActiveWorkflows();

			const pending = await repository.find({
				where: { workflowId: workflow.id, status: 'pending' },
			});
			expect(pending).toHaveLength(1);
			expect(pending[0].publishedVersionId).toBe(workflow.activeVersionId);
		});

		it('skips inactive and archived workflows', async () => {
			const active = await createActiveWorkflow();
			await createWorkflow(); // inactive: no activeVersionId
			const archived = await createActiveWorkflow();
			await Container.get(WorkflowRepository).update(archived.id, { isArchived: true });

			await repository.enqueueAllActiveWorkflows();

			const pending = await repository.find({ where: { status: 'pending' } });
			expect(pending).toHaveLength(1);
			expect(pending[0].workflowId).toBe(active.id);
		});
	});
});

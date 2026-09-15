import { createActiveWorkflow, createWorkflow, newWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { UNPUBLISH_VERSION_SENTINEL } from '@n8n/db';
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
		await repository.enqueue('wf-1', 'v-1', 'publish');

		const claimed = await repository.claimNextPendingRecord();

		expect(claimed?.workflowId).toBe('wf-1');
		expect(claimed?.publishedVersionId).toBe('v-1');
		expect(claimed?.status).toBe('in_progress');

		const claimedAgain = await repository.claimNextPendingRecord();
		expect(claimedAgain).toBeNull();
	});

	it('supersedes an existing pending record when re-enqueued for the same workflow', async () => {
		await repository.enqueue('wf-1', 'v-1', 'publish');
		await repository.enqueue('wf-1', 'v-2', 'publish');

		const claimed = await repository.claimNextPendingRecord();
		expect(claimed?.workflowId).toBe('wf-1');
		expect(claimed?.publishedVersionId).toBe('v-2');

		// Only one record ever existed for the workflow, so nothing else is pending.
		const claimedAgain = await repository.claimNextPendingRecord();
		expect(claimedAgain).toBeNull();
	});

	describe('reason', () => {
		it('persists the reason it was enqueued with', async () => {
			await repository.enqueue('wf-1', 'v-1', 'publish');

			const claimed = await repository.claimNextPendingRecord();
			expect(claimed?.reason).toBe('publish');
		});

		it('supersedes the reason of a pending record on re-enqueue, so a fresher intent wins', async () => {
			const workflow = await createActiveWorkflow();
			assert(workflow.activeVersionId);
			await repository.enqueueByWorkflowIds([workflow.id], 'startup');

			// A user publish lands while the startup record is still pending.
			await repository.enqueue(workflow.id, workflow.activeVersionId, 'publish');

			const claimed = await repository.claimNextPendingRecord();
			expect(claimed?.workflowId).toBe(workflow.id);
			expect(claimed?.reason).toBe('publish');
		});

		it('keeps a pending record untouched when the reconciler re-enqueues over it', async () => {
			const workflow = await createActiveWorkflow();
			assert(workflow.activeVersionId);
			await repository.enqueue(workflow.id, workflow.activeVersionId, 'publish');

			// The reconciler's bulk enqueue conflicts with the pending user record
			// and must not overwrite it (DO NOTHING).
			await repository.enqueueByWorkflowIds([workflow.id], 'startup');

			const claimed = await repository.claimNextPendingRecord();
			expect(claimed?.workflowId).toBe(workflow.id);
			expect(claimed?.reason).toBe('publish');
		});

		it('stamps the given reason on bulk-enqueued records', async () => {
			const wf1 = await createActiveWorkflow();
			const wf2 = await createActiveWorkflow();

			await repository.enqueueByWorkflowIds([wf1.id, wf2.id], 'leadership-takeover');

			const pending = await repository.find({ where: { status: 'pending' } });
			expect(pending).toHaveLength(2);
			for (const record of pending) {
				expect(record.reason).toBe('leadership-takeover');
			}
		});
	});

	it('enqueues within a provided transaction and is visible once it commits', async () => {
		await repository.manager.transaction(async (trx) => {
			await repository.enqueue('wf-1', 'v-1', 'publish', trx);
		});

		const claimed = await repository.claimNextPendingRecord();
		expect(claimed?.workflowId).toBe('wf-1');
		expect(claimed?.publishedVersionId).toBe('v-1');
	});

	it('discards the enqueued record when the surrounding transaction rolls back', async () => {
		await expect(
			repository.manager.transaction(async (trx) => {
				await repository.enqueue('wf-1', 'v-1', 'publish', trx);
				throw new Error('rollback');
			}),
		).rejects.toThrow('rollback');

		expect(await repository.claimNextPendingRecord()).toBeNull();
	});

	it('claims pending records in FIFO order', async () => {
		await repository.enqueue('wf-1', 'v-1', 'publish');
		await repository.enqueue('wf-2', 'v-1', 'publish');

		const first = await repository.claimNextPendingRecord();
		const second = await repository.claimNextPendingRecord();

		expect(first?.workflowId).toBe('wf-1');
		expect(second?.workflowId).toBe('wf-2');
	});

	it('does not claim a second record for a workflow already in progress', async () => {
		// wf-1 is claimed (in progress), then a newer version is enqueued.
		await repository.enqueue('wf-1', 'v-1', 'publish');
		const inProgress = await repository.claimNextPendingRecord();
		assert(inProgress);
		await repository.enqueue('wf-1', 'v-2', 'publish');

		// A different workflow is claimable, but wf-1's new pending record is not
		// until its in-progress record is resolved.
		await repository.enqueue('wf-2', 'v-1', 'publish');
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
		await repository.enqueue('wf-1', 'v-1', 'publish');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);
		await repository.markCompleted(claimed.id);

		await repository.enqueue('wf-1', 'v-2', 'publish');

		const next = await repository.claimNextPendingRecord();
		expect(next?.id).not.toBe(claimed.id);
		expect(next?.publishedVersionId).toBe('v-2');
	});

	it('marks a claimed record as completed', async () => {
		await repository.enqueue('wf-1', 'v-1', 'publish');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);

		await repository.markCompleted(claimed.id);

		const record = await repository.findOneBy({ id: claimed.id });
		expect(record?.status).toBe('completed');
		expect(record?.errorMessage).toBeNull();
	});

	it('marks a claimed record as completed with a warning message', async () => {
		// A record can complete with a non-fatal side effect (e.g. an abandoned
		// external webhook deregistration); the warning lands in `errorMessage`
		// for diagnostics while the status stays `completed`.
		await repository.enqueue('wf-1', 'v-1', 'publish');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);

		await repository.markCompleted(claimed.id, undefined, 'external deregistration abandoned');

		const record = await repository.findOneBy({ id: claimed.id });
		expect(record?.status).toBe('completed');
		expect(record?.errorMessage).toBe('external deregistration abandoned');
	});

	it('marks a claimed record as failed and records the error', async () => {
		await repository.enqueue('wf-1', 'v-1', 'publish');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);

		await repository.markFailed(claimed.id, 'boom');

		const record = await repository.findOneBy({ id: claimed.id });
		expect(record?.status).toBe('failed');
		expect(record?.errorMessage).toBe('boom');
	});

	it('throws when transitioning a record that is not in progress', async () => {
		await repository.enqueue('wf-1', 'v-1', 'publish');
		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);
		await repository.markCompleted(claimed.id);

		// Record is already completed, so it is no longer in progress.
		await expect(repository.markCompleted(claimed.id)).rejects.toThrow();
		await expect(repository.markFailed(claimed.id, 'boom')).rejects.toThrow();
	});

	describe('returnToPending', () => {
		it('returns a claimed record to the queue so it can be claimed again', async () => {
			await repository.enqueue('wf-1', 'v-1', 'publish');
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
			await repository.enqueue('wf-1', 'v-1', 'publish');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await repository.enqueue('wf-1', 'v-2', 'publish');

			await repository.returnToPending(claimed.id);

			// The in-progress row is gone; only the superseding pending record remains.
			expect(await repository.findOneBy({ id: claimed.id })).toBeNull();
			const next = await repository.claimNextPendingRecord();
			expect(next?.publishedVersionId).toBe('v-2');
			expect(await repository.claimNextPendingRecord()).toBeNull();
		});

		it('is a no-op when the record is no longer in progress', async () => {
			await repository.enqueue('wf-1', 'v-1', 'publish');
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
			await repository.enqueue('wf-1', 'v-1', 'publish');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await backdateUpdatedAt(claimed.id);

			const reclaimed = await repository.claimNextPendingRecord();

			expect(reclaimed?.id).toBe(claimed.id);
			expect(reclaimed?.status).toBe('in_progress');
		});

		it('does not reclaim a fresh in_progress record', async () => {
			await repository.enqueue('wf-1', 'v-1', 'publish');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);

			// Just claimed, so it is within the lease window.
			expect(await repository.claimNextPendingRecord()).toBeNull();
		});

		it('bumps updatedAt on reclaim so it is not immediately reclaimable again', async () => {
			await repository.enqueue('wf-1', 'v-1', 'publish');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await backdateUpdatedAt(claimed.id);

			const reclaimed = await repository.claimNextPendingRecord();
			assert(reclaimed);

			// Reclaim refreshed updatedAt, so it is fresh again.
			expect(await repository.claimNextPendingRecord()).toBeNull();
		});

		it('reclaims the stale in_progress only, leaving a newer pending record untouched', async () => {
			await repository.enqueue('wf-1', 'v-1', 'publish');
			const claimed = await repository.claimNextPendingRecord();
			assert(claimed);
			await repository.enqueue('wf-1', 'v-2', 'publish');
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
			await repository.enqueue(workflowId, 'v-1', 'publish');
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
			await repository.enqueue('wf-1', 'v-1', 'publish'); // stays pending
			await repository.enqueue('wf-2', 'v-1', 'publish');
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

	describe('enqueueByWorkflowIds', () => {
		beforeEach(async () => {
			await testDb.truncate([
				'WorkflowDependency',
				'WorkflowEntity',
				'WorkflowHistory',
				'WorkflowPublishHistory',
			]);
		});

		it('enqueues pending records only for the listed active workflows', async () => {
			const wf1 = await createActiveWorkflow();
			const wf2 = await createActiveWorkflow();
			const wf3 = await createActiveWorkflow();

			await repository.enqueueByWorkflowIds([wf1.id, wf3.id], 'reconcile');

			const pending = await repository.find({ where: { status: 'pending' } });
			expect(pending).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ workflowId: wf1.id, publishedVersionId: wf1.activeVersionId }),
					expect.objectContaining({ workflowId: wf3.id, publishedVersionId: wf3.activeVersionId }),
				]),
			);
			expect(pending).toHaveLength(2);
			expect(pending.map((record) => record.workflowId)).not.toContain(wf2.id);
		});

		it('enqueues unpublished and archived workflows with the unpublish sentinel so stale trigger-status rows can be healed', async () => {
			// The reconciler enqueues whatever its detection query returns; refusing
			// any of it here would re-detect the same workflow forever. The sentinel
			// is inert — the applier dispatches an unpublish on the workflow's null
			// `activeVersionId` and never reads the record's version.
			const unpublished = await createWorkflow(); // no activeVersionId
			const archived = await createWorkflow();
			await Container.get(WorkflowRepository).update(archived.id, { isArchived: true });

			await repository.enqueueByWorkflowIds([unpublished.id, archived.id], 'reconcile');

			const pending = await repository.find({ where: { status: 'pending' } });
			expect(pending).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						workflowId: unpublished.id,
						publishedVersionId: UNPUBLISH_VERSION_SENTINEL,
					}),
					expect.objectContaining({
						workflowId: archived.id,
						publishedVersionId: UNPUBLISH_VERSION_SENTINEL,
					}),
				]),
			);
			expect(pending).toHaveLength(2);
		});

		it('is idempotent: re-running does not create duplicate pending records', async () => {
			const workflow = await createActiveWorkflow();

			await repository.enqueueByWorkflowIds([workflow.id], 'reconcile');
			await repository.enqueueByWorkflowIds([workflow.id], 'reconcile');

			const pending = await repository.find({
				where: { workflowId: workflow.id, status: 'pending' },
			});
			expect(pending).toHaveLength(1);
			expect(pending[0].publishedVersionId).toBe(workflow.activeVersionId);
		});

		it('does not overwrite an existing pending record', async () => {
			// Reconciliation's detection and its enqueue are two separate statements:
			// a publish can commit a pending record in the gap between them. That
			// record is at least as fresh as reconciliation's snapshot and must win —
			// overwriting it could roll the workflow back to a stale version.
			const workflow = await createActiveWorkflow();
			await repository.enqueue(workflow.id, 'v-concurrent', 'publish');

			await repository.enqueueByWorkflowIds([workflow.id], 'reconcile');

			const pending = await repository.find({
				where: { workflowId: workflow.id, status: 'pending' },
			});
			expect(pending).toHaveLength(1);
			expect(pending[0].publishedVersionId).toBe('v-concurrent');
		});

		it('is a no-op for an empty list', async () => {
			await createActiveWorkflow();

			await expect(repository.enqueueByWorkflowIds([], 'reconcile')).resolves.toBeUndefined();

			expect(await repository.find({ where: { status: 'pending' } })).toHaveLength(0);
		});

		it('enqueues every workflow in a batch larger than one statement chunk', async () => {
			// A fresh leader detects every active workflow as missing at once, so
			// this call sees fleet-sized input. Sqlite binds one placeholder per id
			// and caps bound variables per statement, so large batches are split
			// into chunks; a boundary bug here would silently drop workflows.
			const workflowIds = Array.from({ length: 1100 }, (_, i) => `bulk-wf-${i}`);
			// Seed in slices: a single multi-row VALUES of this size exceeds sqlite's
			// expression-tree depth, which is not the limit under test here.
			for (let i = 0; i < workflowIds.length; i += 250) {
				await Container.get(WorkflowRepository).insert(
					workflowIds.slice(i, i + 250).map((id) => newWorkflow({ id })),
				);
			}

			await repository.enqueueByWorkflowIds(workflowIds, 'reconcile');

			expect(await repository.countBy({ status: 'pending' })).toBe(1100);
		});
	});

	describe('getRecordStatsByStatus', () => {
		it('returns the count and oldest createdAt grouped by status in one query', async () => {
			await repository.insert([
				{ workflowId: 'wf-1', publishedVersionId: 'v', status: 'pending' },
				{ workflowId: 'wf-2', publishedVersionId: 'v', status: 'pending' },
				{ workflowId: 'wf-3', publishedVersionId: 'v', status: 'in_progress' },
				{ workflowId: 'wf-4', publishedVersionId: 'v', status: 'completed' },
				{ workflowId: 'wf-5', publishedVersionId: 'v', status: 'completed' },
				{ workflowId: 'wf-6', publishedVersionId: 'v', status: 'failed' },
				{ workflowId: 'wf-7', publishedVersionId: 'v', status: 'partial_success' },
			]);

			const all = await repository.find();
			const oldestPending = Math.min(
				...all
					.filter((record) => record.status === 'pending')
					.map((record) => record.createdAt.getTime()),
			);

			const stats = await repository.getRecordStatsByStatus();

			const counts = Object.fromEntries([...stats].map(([status, s]) => [status, s.count]));
			expect(counts).toEqual({
				pending: 2,
				in_progress: 1,
				completed: 2,
				failed: 1,
				partial_success: 1,
			});

			expect(stats.get('pending')?.oldestCreatedAt.getTime()).toBe(oldestPending);
			expect(stats.get('completed')?.oldestCreatedAt).toBeInstanceOf(Date);
		});

		it('returns an empty map when there are no records', async () => {
			expect((await repository.getRecordStatsByStatus()).size).toBe(0);
		});
	});
});

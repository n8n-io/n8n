import { mock } from 'vitest-mock-extended';

import type { ReconciliationOptions } from '../options';
import { ScheduledJobOwnerRegistry, type ScheduledJobOwnerResolver } from '../owner';
import type { ReconciliationHooks } from '../reconcile';
import { reconcile } from '../reconcile';
import type { QuarantinedJob, ReconciliationJobStore } from '../store';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const SETTLE_SECONDS = 300;
const QUARANTINE_SECONDS = 86_400;
const BATCH_SIZE = 2;

const SETTLED_BEFORE = new Date(NOW.getTime() - SETTLE_SECONDS * 1000);
const QUARANTINED_BEFORE = new Date(NOW.getTime() - QUARANTINE_SECONDS * 1000);

const options: ReconciliationOptions = {
	settleSeconds: SETTLE_SECONDS,
	quarantineGraceSeconds: QUARANTINE_SECONDS,
	batchSize: BATCH_SIZE,
	maxPagesPerPass: 1000,
	defaultTimezone: 'UTC',
};

/** A quarantined interval job row. */
const quarantinedJob = (over: Partial<QuarantinedJob> = {}): QuarantinedJob => ({
	id: 1,
	ownerId: 'wf-1',
	kind: 'interval',
	intervalSeconds: 3600,
	cronExpression: null,
	timezone: null,
	recurrenceUnit: null,
	recurrenceSize: null,
	fireAt: null,
	...over,
});

describe('reconcile', () => {
	const store = mock<ReconciliationJobStore>();
	const now = async () => await Promise.resolve(NOW);

	let registry: ScheduledJobOwnerRegistry;

	const run = async (hooks: ReconciliationHooks = {}, signal?: AbortSignal) =>
		await reconcile(store, registry, now, options, hooks, signal);

	/** One page of owner ids for `ownerType`, then an empty page. */
	const onePageOfOwners = (ownerIds: string[]) => {
		store.findOwnerIds.mockResolvedValueOnce(ownerIds).mockResolvedValue([]);
	};

	beforeEach(() => {
		// Reset, not clear: several tests queue one-shot pages with
		// `mockResolvedValueOnce`, which `clearAllMocks` would leave behind.
		vi.resetAllMocks();
		store.findOwnerTypes.mockResolvedValue([]);
		store.findOwnerIds.mockResolvedValue([]);
		store.quarantineByOwnerIds.mockResolvedValue(0);
		store.deleteQuarantinedByOwnerIds.mockResolvedValue(0);
		store.findQuarantinedByOwnerIds.mockResolvedValue([]);
		store.liftQuarantine.mockResolvedValue(1);
		registry = new ScheduledJobOwnerRegistry();
	});

	describe('quarantine', () => {
		it('quarantines only the owners the resolver says are gone', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.resolve(new Set(['wf-alive'])),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-alive', 'wf-gone']);
			store.quarantineByOwnerIds.mockResolvedValue(2);

			const summary = await run();

			expect(store.quarantineByOwnerIds).toHaveBeenCalledWith(
				'workflow',
				['wf-gone'],
				NOW,
				SETTLED_BEFORE,
			);
			expect(summary).toMatchObject({ ownersChecked: 2, quarantined: 2, drained: true });
		});

		it('leaves an owner the resolver still finds alone', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1', 'wf-2']);

			const summary = await run();

			expect(store.quarantineByOwnerIds).not.toHaveBeenCalled();
			expect(store.deleteQuarantinedByOwnerIds).not.toHaveBeenCalled();
			expect(summary).toMatchObject({ ownersChecked: 2, quarantined: 0, deleted: 0 });
		});

		it('reports nothing quarantined when every job of a gone owner already was', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.resolve(new Set()),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-gone']);
			store.quarantineByOwnerIds.mockResolvedValue(0);

			const summary = await run();

			expect(summary.quarantined).toBe(0);
		});
	});

	describe('deletion after the grace period', () => {
		it('deletes only the quarantine stamps older than the grace, and only for owners still gone', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.resolve(new Set(['wf-alive'])),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-alive', 'wf-gone']);
			store.deleteQuarantinedByOwnerIds.mockResolvedValue(3);

			const summary = await run();

			expect(store.deleteQuarantinedByOwnerIds).toHaveBeenCalledWith(
				'workflow',
				['wf-gone'],
				QUARANTINED_BEFORE,
			);
			expect(summary.deleted).toBe(3);
		});

		it('quarantines before deleting, so a job stamped this pass survives its grace', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.resolve(new Set()),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-gone']);
			const order: string[] = [];
			store.quarantineByOwnerIds.mockImplementation(async () => {
				order.push('quarantine');
				return await Promise.resolve(1);
			});
			store.deleteQuarantinedByOwnerIds.mockImplementation(async () => {
				order.push('delete');
				return await Promise.resolve(0);
			});

			await run();

			expect(order).toEqual(['quarantine', 'delete']);
		});
	});

	describe('revival', () => {
		it('re-enables a quarantined job whose owner is alive again, restarting its clock', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1']);
			store.findQuarantinedByOwnerIds.mockResolvedValue([quarantinedJob({ id: 42 })]);

			const summary = await run();

			// An hourly interval, restarted from the shared clock.
			expect(store.liftQuarantine).toHaveBeenCalledWith(42, new Date(NOW.getTime() + 3600 * 1000));
			expect(summary.revived).toBe(1);
		});

		it('revives a job whose stored schedule can no longer be planned with no clock, rather than failing the sweep', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1']);
			store.findQuarantinedByOwnerIds.mockResolvedValue([
				quarantinedJob({ id: 42, kind: 'cron', cronExpression: 'not a cron' }),
			]);
			const onReviveClockFailed = vi.fn();

			const summary = await run({ onReviveClockFailed });

			expect(store.liftQuarantine).toHaveBeenCalledWith(42, null);
			expect(onReviveClockFailed).toHaveBeenCalledWith({
				jobId: 42,
				error: expect.any(Error) as Error,
			});
			expect(summary.revived).toBe(1);
		});

		it('does not count a job a concurrent lift or delete got to first', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1']);
			store.findQuarantinedByOwnerIds.mockResolvedValue([quarantinedJob({ id: 42 })]);
			store.liftQuarantine.mockResolvedValue(0);
			const onRevived = vi.fn();

			const summary = await run({ onRevived });

			expect(summary.revived).toBe(0);
			expect(onRevived).not.toHaveBeenCalled();
		});
	});

	describe('when an answer cannot be trusted', () => {
		it('leaves an owner type with no registered resolver entirely alone', async () => {
			store.findOwnerTypes.mockResolvedValue(['agent']);
			onePageOfOwners(['agent-1']);
			const onUnclaimedOwnerType = vi.fn();

			const summary = await run({ onUnclaimedOwnerType });

			expect(store.findOwnerIds).not.toHaveBeenCalled();
			expect(store.quarantineByOwnerIds).not.toHaveBeenCalled();
			expect(store.deleteQuarantinedByOwnerIds).not.toHaveBeenCalled();
			expect(onUnclaimedOwnerType).toHaveBeenCalledWith('agent');
			expect(summary.skippedOwnerTypes).toEqual(['agent']);
		});

		it('leaves an owner type whose resolver threw entirely alone', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.reject(new Error('lookup failed')),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1', 'wf-2']);
			const onResolverFailed = vi.fn();

			const summary = await run({ onResolverFailed });

			expect(store.quarantineByOwnerIds).not.toHaveBeenCalled();
			expect(store.deleteQuarantinedByOwnerIds).not.toHaveBeenCalled();
			expect(store.liftQuarantine).not.toHaveBeenCalled();
			expect(onResolverFailed).toHaveBeenCalledWith('workflow', expect.any(Error));
			expect(summary).toMatchObject({ ownersChecked: 0, skippedOwnerTypes: ['workflow'] });
		});

		it('still sweeps the other owner types when one resolver fails', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.reject(new Error('lookup failed')),
			});
			registry.register('system-task', {
				findExisting: async () => await Promise.resolve(new Set()),
			});
			store.findOwnerTypes.mockResolvedValue(['system-task', 'workflow']);
			store.findOwnerIds.mockImplementation(
				async (ownerType) =>
					await Promise.resolve(ownerType === 'system-task' ? ['system:prune'] : ['wf-1']),
			);
			store.quarantineByOwnerIds.mockResolvedValue(1);

			const summary = await run();

			expect(store.quarantineByOwnerIds).toHaveBeenCalledWith(
				'system-task',
				['system:prune'],
				NOW,
				SETTLED_BEFORE,
			);
			expect(summary).toMatchObject({ quarantined: 1, skippedOwnerTypes: ['workflow'] });
		});
	});

	describe('paging', () => {
		it('walks owners in pages, resuming after the last id of the previous page', async () => {
			const resolver = mock<ScheduledJobOwnerResolver>();
			resolver.findExisting.mockImplementation(
				async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			);
			registry.register('workflow', resolver);
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			store.findOwnerIds
				.mockResolvedValueOnce(['wf-1', 'wf-2'])
				.mockResolvedValueOnce(['wf-3'])
				.mockResolvedValue([]);

			const summary = await run();

			expect(store.findOwnerIds).toHaveBeenNthCalledWith(
				1,
				'workflow',
				SETTLED_BEFORE,
				BATCH_SIZE,
				undefined,
			);
			expect(store.findOwnerIds).toHaveBeenNthCalledWith(
				2,
				'workflow',
				SETTLED_BEFORE,
				BATCH_SIZE,
				'wf-2',
			);
			// A short page ends the walk, so no third query.
			expect(store.findOwnerIds).toHaveBeenCalledTimes(2);
			expect(summary).toMatchObject({ ownersChecked: 3, drained: true });
		});

		it('stops at the page budget and reports the pass not drained', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			store.findOwnerIds.mockResolvedValue(['wf-1', 'wf-2']);

			const summary = await reconcile(store, registry, now, { ...options, maxPagesPerPass: 2 });

			expect(store.findOwnerIds).toHaveBeenCalledTimes(2);
			expect(summary).toMatchObject({ ownersChecked: 4, drained: false });
		});
	});

	describe('cancellation', () => {
		it('reads no pages once aborted, keeps what it wrote, and reports the pass not drained', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.resolve(new Set()),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			store.findOwnerIds.mockResolvedValue(['wf-1', 'wf-2']);
			store.quarantineByOwnerIds.mockResolvedValue(2);
			const controller = new AbortController();
			store.deleteQuarantinedByOwnerIds.mockImplementation(async () => {
				controller.abort();
				return await Promise.resolve(0);
			});

			const summary = await run({}, controller.signal);

			expect(store.findOwnerIds).toHaveBeenCalledTimes(1);
			expect(summary).toMatchObject({ quarantined: 2, drained: false });
		});
	});
});

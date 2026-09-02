import { mock } from 'vitest-mock-extended';

import type { ReconciliationOptions } from '../options';
import { ScheduledJobOwnerRegistry, type ScheduledJobOwnerResolver } from '../owner';
import type { ReconciliationCursor, ReconciliationHooks } from '../reconcile';
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

		it('reports only the jobs this pass quarantined, not the owners it read', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.resolve(new Set()),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-gone-1', 'wf-gone-2']);
			// Both owners are gone, but only one had a job left to quarantine.
			store.quarantineByOwnerIds.mockResolvedValue(1);
			const onQuarantined = vi.fn();

			await run({ onQuarantined });

			expect(onQuarantined).toHaveBeenCalledWith({ ownerType: 'workflow', jobs: 1 });
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

		it('reports only the owners whose jobs it lifted', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1', 'wf-2']);
			store.findQuarantinedByOwnerIds.mockResolvedValue([
				quarantinedJob({ id: 42, ownerId: 'wf-1' }),
				quarantinedJob({ id: 43, ownerId: 'wf-2' }),
			]);
			// A concurrent lift or delete got to the second job first.
			store.liftQuarantine.mockResolvedValueOnce(1).mockResolvedValue(0);
			const onRevived = vi.fn();

			const summary = await run({ onRevived });

			expect(onRevived).toHaveBeenCalledWith({
				ownerType: 'workflow',
				ownerIds: ['wf-1'],
				jobs: 1,
			});
			expect(summary.revived).toBe(1);
		});

		it('stops between lifts when the pass is cancelled, leaving the page to a later one', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1']);
			store.findQuarantinedByOwnerIds.mockResolvedValue([
				quarantinedJob({ id: 42 }),
				quarantinedJob({ id: 43 }),
			]);
			const controller = new AbortController();
			store.liftQuarantine.mockImplementation(async () => {
				controller.abort();
				return await Promise.resolve(1);
			});

			const summary = await run({}, controller.signal);

			expect(store.liftQuarantine).toHaveBeenCalledTimes(1);
			expect(summary).toMatchObject({ revived: 1, drained: false });
			expect(summary.resumeFrom).toEqual({ ownerType: 'workflow' });
		});

		it('reads at most a batch of quarantined jobs, leaving the rest to a later pass', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1']);
			// A full read, so more may be waiting behind it.
			store.findQuarantinedByOwnerIds.mockResolvedValue([
				quarantinedJob({ id: 42 }),
				quarantinedJob({ id: 43 }),
			]);

			const summary = await run();

			expect(store.findQuarantinedByOwnerIds).toHaveBeenCalledWith(
				'workflow',
				['wf-1'],
				BATCH_SIZE,
			);
			expect(summary).toMatchObject({ revived: 2, drained: false });
			expect(summary.resumeFrom).toEqual({ ownerType: 'workflow' });
		});

		it('resumes at the page whose quarantines it could not finish, not past it', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			store.findOwnerIds
				.mockResolvedValueOnce(['wf-1', 'wf-2'])
				.mockResolvedValueOnce(['wf-3', 'wf-4'])
				.mockResolvedValue([]);
			store.findQuarantinedByOwnerIds
				.mockResolvedValueOnce([])
				.mockResolvedValue([quarantinedJob({ id: 42 }), quarantinedJob({ id: 43 })]);

			const summary = await run();

			expect(summary.resumeFrom).toEqual({ ownerType: 'workflow', after: 'wf-2' });
		});

		it('finishes an unfinished page on the next pass and moves past it', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			// The first pass re-reads nothing past the page: a full batch of
			// quarantines leaves it unfinished. The second pass lifts the one left
			// behind, then walks on.
			store.findOwnerIds
				.mockResolvedValueOnce(['wf-1', 'wf-2'])
				.mockResolvedValueOnce(['wf-1', 'wf-2'])
				.mockResolvedValueOnce(['wf-3'])
				.mockResolvedValue([]);
			store.findQuarantinedByOwnerIds
				.mockResolvedValueOnce([quarantinedJob({ id: 42 }), quarantinedJob({ id: 43 })])
				.mockResolvedValueOnce([quarantinedJob({ id: 44 })])
				.mockResolvedValue([]);

			const first = await run();
			const second = await reconcile(
				store,
				registry,
				now,
				options,
				{},
				undefined,
				first.resumeFrom,
			);

			expect(first).toMatchObject({
				revived: 2,
				drained: false,
				resumeFrom: { ownerType: 'workflow' },
			});
			expect(store.findOwnerIds).toHaveBeenCalledTimes(3);
			expect(store.findOwnerIds).toHaveBeenNthCalledWith(
				2,
				'workflow',
				SETTLED_BEFORE,
				BATCH_SIZE,
				undefined,
			);
			expect(store.findOwnerIds).toHaveBeenNthCalledWith(
				3,
				'workflow',
				SETTLED_BEFORE,
				BATCH_SIZE,
				'wf-2',
			);
			expect(second).toMatchObject({ revived: 1, drained: true });
			expect(second.resumeFrom).toBeUndefined();
		});

		it('resumes at the first unfinished page when a later owner type also leaves one', async () => {
			const aliveResolver = {
				findExisting: async (ownerIds: string[]) => await Promise.resolve(new Set(ownerIds)),
			};
			registry.register('agent', aliveResolver);
			registry.register('workflow', aliveResolver);
			store.findOwnerTypes.mockResolvedValue(['workflow', 'agent']);
			store.findOwnerIds.mockResolvedValueOnce(['agent-1']).mockResolvedValueOnce(['wf-1']);
			// A full read on both pages: each type leaves quarantines behind.
			store.findQuarantinedByOwnerIds.mockResolvedValue([
				quarantinedJob({ id: 42 }),
				quarantinedJob({ id: 43 }),
			]);

			const summary = await run();

			expect(summary).toMatchObject({ drained: false });
			expect(summary.resumeFrom).toEqual({ ownerType: 'agent', after: undefined });
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
			expect(summary).toMatchObject({ skippedOwnerTypes: ['agent'], drained: false });
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
			expect(summary).toMatchObject({
				ownersChecked: 0,
				skippedOwnerTypes: ['workflow'],
				drained: false,
			});
		});

		it('keeps the pages a resolver answered for before it failed, and reports the pass not drained', async () => {
			const resolver = mock<ScheduledJobOwnerResolver>();
			resolver.findExisting
				.mockResolvedValueOnce(new Set())
				.mockRejectedValue(new Error('lookup failed'));
			registry.register('workflow', resolver);
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			store.findOwnerIds
				.mockResolvedValueOnce(['wf-1', 'wf-2'])
				.mockResolvedValueOnce(['wf-3', 'wf-4'])
				.mockResolvedValue([]);
			store.quarantineByOwnerIds.mockResolvedValue(2);
			const onResolverFailed = vi.fn();

			const summary = await run({ onResolverFailed });

			expect(onResolverFailed).toHaveBeenCalledWith('workflow', expect.any(Error));
			// Part of the type was swept, so it counts as touched and not covered.
			expect(summary).toMatchObject({
				ownersChecked: 2,
				quarantined: 2,
				skippedOwnerTypes: [],
				drained: false,
			});
			// The failed page is retried from the start of the type.
			expect(summary.resumeFrom).toBeUndefined();
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
			expect(summary).toMatchObject({
				quarantined: 1,
				skippedOwnerTypes: ['workflow'],
				drained: false,
			});
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

	describe('resuming a budget-bound pass', () => {
		const aliveResolver: ScheduledJobOwnerResolver = {
			findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
		};
		const onePagePass = async (resumeFrom?: ReconciliationCursor) =>
			await reconcile(
				store,
				registry,
				now,
				{ ...options, maxPagesPerPass: 1 },
				{},
				undefined,
				resumeFrom,
			);

		it('reports where the budget stopped and continues there instead of re-walking the prefix', async () => {
			registry.register('workflow', aliveResolver);
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			store.findOwnerIds.mockResolvedValue(['wf-1', 'wf-2']);

			const first = await onePagePass();
			await onePagePass(first.resumeFrom);

			expect(first).toMatchObject({
				drained: false,
				resumeFrom: { ownerType: 'workflow', after: 'wf-2' },
			});
			expect(store.findOwnerIds).toHaveBeenNthCalledWith(
				2,
				'workflow',
				SETTLED_BEFORE,
				BATCH_SIZE,
				'wf-2',
			);
		});

		it('walks owner types in a stable order and continues with the one the budget never reached', async () => {
			registry.register('project', aliveResolver);
			registry.register('workflow', aliveResolver);
			// Unsorted, one short page per type, so the budget runs out between them.
			store.findOwnerTypes.mockResolvedValue(['workflow', 'project']);
			store.findOwnerIds.mockResolvedValue(['owner-1']);

			const first = await onePagePass();
			await onePagePass(first.resumeFrom);

			expect(first).toMatchObject({ drained: false, resumeFrom: { ownerType: 'workflow' } });
			expect(store.findOwnerIds).toHaveBeenNthCalledWith(
				1,
				'project',
				SETTLED_BEFORE,
				BATCH_SIZE,
				undefined,
			);
			expect(store.findOwnerIds).toHaveBeenNthCalledWith(
				2,
				'workflow',
				SETTLED_BEFORE,
				BATCH_SIZE,
				undefined,
			);
		});

		it('continues with the owner type after the one it stopped on, once that one is gone', async () => {
			registry.register('member', aliveResolver);
			registry.register('project', aliveResolver);
			registry.register('workflow', aliveResolver);
			store.findOwnerTypes.mockResolvedValue(['workflow', 'member', 'project']);
			store.findOwnerIds.mockResolvedValue(['owner-1']);

			// 'other' sorts between the types that are left.
			const summary = await reconcile(store, registry, now, options, {}, undefined, {
				ownerType: 'other',
				after: 'other-9',
			});

			const queriedTypes = store.findOwnerIds.mock.calls.map(([ownerType]) => ownerType);
			expect(queriedTypes).toEqual(['project', 'workflow']);
			expect(summary).toMatchObject({ drained: true });
			expect(summary.resumeFrom).toBeUndefined();
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

	describe('when a hook throws', () => {
		const thrower = () => {
			throw new Error('broken reporter');
		};

		it('keeps quarantining and still reports what it wrote', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.resolve(new Set()),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1']);
			store.quarantineByOwnerIds.mockResolvedValue(3);
			store.deleteQuarantinedByOwnerIds.mockResolvedValue(1);

			const summary = await run({ onQuarantined: thrower, onDeleted: thrower });

			expect(store.deleteQuarantinedByOwnerIds).toHaveBeenCalledTimes(1);
			expect(summary).toMatchObject({ quarantined: 3, deleted: 1, drained: true });
		});

		it('still abandons only the owner type whose resolver threw', async () => {
			registry.register('workflow', {
				findExisting: async () => await Promise.reject(new Error('lookup failed')),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1']);

			const summary = await run({ onResolverFailed: thrower });

			expect(store.quarantineByOwnerIds).not.toHaveBeenCalled();
			expect(summary).toMatchObject({ skippedOwnerTypes: ['workflow'], drained: false });
		});

		it('still leaves an unclaimed owner type alone', async () => {
			store.findOwnerTypes.mockResolvedValue(['agent']);

			const summary = await run({ onUnclaimedOwnerType: thrower });

			expect(store.findOwnerIds).not.toHaveBeenCalled();
			expect(summary).toMatchObject({ skippedOwnerTypes: ['agent'], drained: false });
		});

		it('lifts every quarantine of the page even when the per-job hooks throw', async () => {
			registry.register('workflow', {
				findExisting: async (ownerIds) => await Promise.resolve(new Set(ownerIds)),
			});
			store.findOwnerTypes.mockResolvedValue(['workflow']);
			onePageOfOwners(['wf-1']);
			store.findQuarantinedByOwnerIds.mockResolvedValue([
				quarantinedJob({ id: 1, kind: 'cron', cronExpression: 'not a cron' }),
				quarantinedJob({ id: 2 }),
			]);

			const summary = await run({ onReviveClockFailed: thrower, onRevived: thrower });

			expect(store.liftQuarantine).toHaveBeenCalledWith(1, null);
			expect(store.liftQuarantine).toHaveBeenCalledWith(2, expect.any(Date));
			expect(summary.revived).toBe(2);
		});
	});
});

import { ScheduledTaskStatus } from '@n8n/constants';

import { DEFAULT_RETENTION_OPTIONS, type RetentionOptions } from '../options';
import { prune } from '../prune';
import type { RetentionBatch, RetentionStore } from '../store';

const CLEAN = [ScheduledTaskStatus.Succeeded, ScheduledTaskStatus.Cancelled];
const WRONG = [ScheduledTaskStatus.Failed, ScheduledTaskStatus.Missed];

/** A store that records every batch and replays scripted per-call row counts (0 once exhausted). */
class RecordingStore implements RetentionStore {
	readonly batches: RetentionBatch[] = [];

	constructor(private readonly results: number[] = []) {}

	async deleteFinishedOlderThan(batch: RetentionBatch): Promise<number> {
		this.batches.push(batch);
		return await Promise.resolve(this.results[this.batches.length - 1] ?? 0);
	}
}

const options: RetentionOptions = {
	retentionSeconds: 60,
	failedRetentionSeconds: 3600,
	batchSize: 10,
	maxBatchesPerPass: 100,
};

describe('prune', () => {
	it('prunes each window with its own statuses and cutoff', async () => {
		const store = new RecordingStore();

		const summary = await prune(store, options);

		expect(summary).toEqual({ deleted: 0, drained: true });
		expect(store.batches).toEqual([
			{ statuses: CLEAN, olderThanMs: 60_000, limit: 10 },
			{ statuses: WRONG, olderThanMs: 3_600_000, limit: 10 },
		]);
	});

	it('keeps deleting a window until a batch comes back short', async () => {
		// Two full batches then a short one drain the clean window; the second
		// window is empty on its first probe.
		const store = new RecordingStore([10, 10, 3, 0]);

		const summary = await prune(store, options);

		expect(summary).toEqual({ deleted: 23, drained: true });
		expect(store.batches.map((batch) => batch.statuses)).toEqual([CLEAN, CLEAN, CLEAN, WRONG]);
	});

	it('spends one extra batch to prove a boundary-exact window is empty', async () => {
		// The first batch is full by coincidence (exactly 10 rows were eligible),
		// so only the following empty batch ends the window's drain.
		const store = new RecordingStore([10, 0, 0]);

		const summary = await prune(store, options);

		expect(summary).toEqual({ deleted: 10, drained: true });
		expect(store.batches.map((batch) => batch.statuses)).toEqual([CLEAN, CLEAN, WRONG]);
	});

	it('stops at the pass budget and reports the pass undrained', async () => {
		// Every batch full: the backlog outlives the budget. The second window's
		// reserved probe still runs, so a saturated first window can't starve it.
		const store = new RecordingStore([10, 10, 10, 10]);

		const summary = await prune(store, { ...options, maxBatchesPerPass: 2 });

		expect(summary).toEqual({ deleted: 20, drained: false });
		expect(store.batches.map((batch) => batch.statuses)).toEqual([CLEAN, WRONG]);
	});

	it('probes the second window when the first drains on the last unreserved batch', async () => {
		// Window 1's full batch spends all the budget it may take; the reserved
		// statement still proves window 2's state instead of skipping it.
		const store = new RecordingStore([10, 3]);

		const summary = await prune(store, { ...options, maxBatchesPerPass: 2 });

		expect(summary).toEqual({ deleted: 13, drained: false });
		expect(store.batches.map((batch) => batch.statuses)).toEqual([CLEAN, WRONG]);
	});

	it('proves an empty table drained with exactly one probe per window', async () => {
		const store = new RecordingStore();

		const summary = await prune(store, { ...options, maxBatchesPerPass: 2 });

		expect(summary).toEqual({ deleted: 0, drained: true });
		expect(store.batches.map((batch) => batch.statuses)).toEqual([CLEAN, WRONG]);
	});

	it('cannot prove both windows drained with a single-statement budget', async () => {
		// One statement can only ever probe the first window; the second stays
		// unprobed, so the pass is honestly reported undrained.
		const store = new RecordingStore();

		const summary = await prune(store, { ...options, maxBatchesPerPass: 1 });

		expect(summary).toEqual({ deleted: 0, drained: false });
		expect(store.batches.map((batch) => batch.statuses)).toEqual([CLEAN]);
	});

	it.each([0, -1, 1.5, NaN])(
		'rejects batch size %p before issuing any statement',
		async (batchSize) => {
			const store = new RecordingStore([10]);

			await expect(prune(store, { ...options, batchSize })).rejects.toThrow(
				'batchSize must be a positive integer',
			);
			expect(store.batches).toHaveLength(0);
		},
	);

	it('shares one budget across both windows', async () => {
		// The clean window drains in two batches, leaving one for the other
		// window; its full batch exhausts the budget before proving emptiness.
		const store = new RecordingStore([10, 4, 10]);

		const summary = await prune(store, { ...options, maxBatchesPerPass: 3 });

		expect(summary).toEqual({ deleted: 24, drained: false });
		expect(store.batches.map((batch) => batch.statuses)).toEqual([CLEAN, CLEAN, WRONG]);
	});

	it('deletes nothing and reports undrained when the budget is zero', async () => {
		const store = new RecordingStore([10]);

		const summary = await prune(store, { ...options, maxBatchesPerPass: 0 });

		expect(summary).toEqual({ deleted: 0, drained: false });
		expect(store.batches).toHaveLength(0);
	});

	it('cancelled mid-pass, it issues no further statements and cannot claim drained', async () => {
		// Plenty of backlog and budget; only the cancellation ends the pass.
		const store = new RecordingStore([10, 10, 10, 10]);
		const controller = new AbortController();
		const deleteFinishedOlderThan = store.deleteFinishedOlderThan.bind(store);
		// The cancellation lands while the first delete statement is in flight.
		store.deleteFinishedOlderThan = async (batch) => {
			controller.abort();
			return await deleteFinishedOlderThan(batch);
		};

		const summary = await prune(store, options, controller.signal);

		expect(summary).toEqual({ deleted: 10, drained: false });
		expect(store.batches.map((batch) => batch.statuses)).toEqual([CLEAN]);
	});

	it('cancelled before the first batch, it issues nothing', async () => {
		const store = new RecordingStore([10]);
		const controller = new AbortController();
		controller.abort();

		const summary = await prune(store, options, controller.signal);

		expect(summary).toEqual({ deleted: 0, drained: false });
		expect(store.batches).toHaveLength(0);
	});

	it('falls back to the default windows and batch bounds', async () => {
		const store = new RecordingStore();

		await prune(store);

		expect(store.batches).toEqual([
			{
				statuses: CLEAN,
				olderThanMs: DEFAULT_RETENTION_OPTIONS.retentionSeconds * 1000,
				limit: DEFAULT_RETENTION_OPTIONS.batchSize,
			},
			{
				statuses: WRONG,
				olderThanMs: DEFAULT_RETENTION_OPTIONS.failedRetentionSeconds * 1000,
				limit: DEFAULT_RETENTION_OPTIONS.batchSize,
			},
		]);
	});
});

import fc from 'fast-check';
import { mock } from 'vitest-mock-extended';

import { backoff } from '../../executor/backoff';
import type { ExpiredLeaseRow, ReaperTaskStore } from '../reap';
import { reap } from '../reap';

/**
 * The reaper's per-row decision over arbitrary expired-lease batches: every row
 * gets exactly one terminal-or-retry decision (never two, never none). The effect
 * boundary is the primary split: a dispatched row (`dispatchedAt` set) is completed
 * as succeeded whatever its attempts, never redelivered. Only a never-dispatched row
 * splits on the attempt count: reclaimed if it has attempts left, else dead-lettered.
 * Reclaim always uses the shared backoff curve.
 */
describe('reap decision (fast-check)', () => {
	const arbRows = fc
		.array(
			fc.record({
				attempts: fc.integer({ min: 0, max: 10 }),
				maxAttempts: fc.integer({ min: 1, max: 10 }),
				leaseEpoch: fc.integer({ min: 1, max: 100 }),
				// The effect-boundary marker: dispatched (a timestamp) or not (null).
				dispatched: fc.boolean(),
			}),
			{ maxLength: 30 },
		)
		// Ids must be unique, so derive them from the position.
		.map((rows) =>
			rows.map(
				({ dispatched, ...row }, index): ExpiredLeaseRow => ({
					id: `task-${index}`,
					jobId: 1,
					taskType: 'test',
					payload: {},
					scheduledFor: new Date('2026-01-01T00:00:00.000Z'),
					runAt: new Date('2026-01-01T00:00:00.000Z'),
					status: 'running',
					dispatchedAt: dispatched ? new Date('2026-01-01T00:00:00.000Z') : null,
					...row,
				}),
			),
		);

	it('reclaims, completes, or dead-letters each row exactly once, split on attempts and the effect boundary', async () => {
		await fc.assert(
			fc.asyncProperty(arbRows, async (rows) => {
				const store = mock<ReaperTaskStore>();
				store.findExpiredLeases.mockResolvedValue(rows);
				store.reclaimExpired.mockResolvedValue(1);
				store.deadLetterExpired.mockResolvedValue(1);
				store.completeExpired.mockResolvedValue(1);

				const result = await reap(store, { batchSize: rows.length || 1 });

				const lastAttempt = (r: ExpiredLeaseRow) => r.attempts + 1 >= r.maxAttempts;
				// Effect boundary first: any dispatched row is completed regardless of attempts.
				// A never-dispatched row then splits on the attempt count.
				const expectedComplete = rows.filter((r) => r.dispatchedAt !== null);
				const expectedReclaim = rows.filter((r) => r.dispatchedAt === null && !lastAttempt(r));
				const expectedDeadLetter = rows.filter((r) => r.dispatchedAt === null && lastAttempt(r));

				const reclaimCalls = store.reclaimExpired.mock.calls;
				const completeIds = store.completeExpired.mock.calls.map(([ref]) => ref.id);
				const deadLetterIds = store.deadLetterExpired.mock.calls.map(([ref]) => ref.id);

				// Every row got exactly one decision, split by attempts then effect boundary.
				expect(reclaimCalls.map(([ref]) => ref.id).sort()).toEqual(
					expectedReclaim.map((r) => r.id).sort(),
				);
				expect([...completeIds].sort()).toEqual(expectedComplete.map((r) => r.id).sort());
				expect([...deadLetterIds].sort()).toEqual(expectedDeadLetter.map((r) => r.id).sort());

				// Counts reflect the decisions. `deadLettered` is genuine terminal failures
				// only; a post-dispatch completion is a success, reported via the hook and not
				// counted here. The three decisions together still cover the whole batch.
				expect(result.reclaimed).toBe(expectedReclaim.length);
				expect(result.deadLettered).toBe(expectedDeadLetter.length);
				expect(result.reclaimed + result.deadLettered + completeIds.length).toBe(rows.length);

				// Reclaim waits the shared backoff for the just-counted attempt, and the
				// guarded update fences on the epoch read during the sweep.
				for (const [ref, backoffMs] of reclaimCalls) {
					const row = rows.find((r) => r.id === ref.id)!;
					expect(backoffMs).toBe(backoff(row.attempts + 1));
					expect(ref.claimedEpoch).toBe(row.leaseEpoch);
				}
			}),
		);
	});
});

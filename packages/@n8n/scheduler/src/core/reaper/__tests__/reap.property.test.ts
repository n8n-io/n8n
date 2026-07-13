import fc from 'fast-check';
import { mock } from 'vitest-mock-extended';

import { backoff } from '../../executor/backoff';
import type { ExpiredLeaseRow, ReaperTaskStore } from '../reap';
import { reap } from '../reap';

/**
 * The reaper's per-row decision over arbitrary expired-lease batches: every row
 * gets exactly one terminal-or-retry decision (never two, never none). A row with
 * attempts left is reclaimed; a last-attempt row is resolved by the effect boundary
 * — completed as succeeded if it was already dispatched (`dispatchedAt` set), else
 * dead-lettered. Reclaim always uses the shared backoff curve.
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
				const expectedReclaim = rows.filter((r) => !lastAttempt(r));
				// A last-attempt row that was already dispatched is completed, not failed.
				const expectedComplete = rows.filter((r) => lastAttempt(r) && r.dispatchedAt !== null);
				const expectedDeadLetter = rows.filter((r) => lastAttempt(r) && r.dispatchedAt === null);

				const reclaimCalls = store.reclaimExpired.mock.calls;
				const completeIds = store.completeExpired.mock.calls.map(([ref]) => ref.id);
				const deadLetterIds = store.deadLetterExpired.mock.calls.map(([ref]) => ref.id);

				// Every row got exactly one decision, split by attempts then effect boundary.
				expect(reclaimCalls.map(([ref]) => ref.id).sort()).toEqual(
					expectedReclaim.map((r) => r.id).sort(),
				);
				expect([...completeIds].sort()).toEqual(expectedComplete.map((r) => r.id).sort());
				expect([...deadLetterIds].sort()).toEqual(expectedDeadLetter.map((r) => r.id).sort());

				// Counts reflect the decisions and cover the whole batch. Completions and
				// dead-letters are both terminal reaper resolutions, so both count as
				// `deadLettered`.
				expect(result.reclaimed).toBe(expectedReclaim.length);
				expect(result.deadLettered).toBe(expectedComplete.length + expectedDeadLetter.length);
				expect(result.reclaimed + result.deadLettered).toBe(rows.length);

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

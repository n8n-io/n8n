import fc from 'fast-check';
import { mock } from 'vitest-mock-extended';

import { backoff } from '../../executor/backoff';
import type { ExpiredLeaseRow, ReaperTaskStore } from '../reap';
import { reap } from '../reap';

/**
 * The reaper's per-row decision over arbitrary expired-lease batches: every row
 * is either reclaimed or dead-lettered (never both, never neither), the choice
 * is exactly "attempts left?", and reclaim always uses the shared backoff curve.
 */
describe('reap decision (fast-check)', () => {
	const arbRows = fc
		.array(
			fc.record({
				attempts: fc.integer({ min: 0, max: 10 }),
				maxAttempts: fc.integer({ min: 1, max: 10 }),
				leaseEpoch: fc.integer({ min: 1, max: 100 }),
			}),
			{ maxLength: 30 },
		)
		// Ids must be unique, so derive them from the position.
		.map((rows) => rows.map((row, index): ExpiredLeaseRow => ({ id: `task-${index}`, ...row })));

	it('reclaims xor dead-letters each row, split on remaining attempts', async () => {
		await fc.assert(
			fc.asyncProperty(arbRows, async (rows) => {
				const store = mock<ReaperTaskStore>();
				store.findExpiredLeases.mockResolvedValue(rows);
				store.reclaimExpired.mockResolvedValue(1);
				store.deadLetterExpired.mockResolvedValue(1);

				const result = await reap(store, { batchSize: rows.length || 1 });

				const expectedDeadLetter = rows.filter((r) => r.attempts + 1 >= r.maxAttempts);
				const expectedReclaim = rows.filter((r) => r.attempts + 1 < r.maxAttempts);

				const reclaimCalls = store.reclaimExpired.mock.calls;
				const deadLetterIds = store.deadLetterExpired.mock.calls.map(([ref]) => ref.id);

				// Every row got exactly one decision, and the split is by attempts.
				expect(reclaimCalls.map(([ref]) => ref.id).sort()).toEqual(
					expectedReclaim.map((r) => r.id).sort(),
				);
				expect([...deadLetterIds].sort()).toEqual(expectedDeadLetter.map((r) => r.id).sort());

				// Counts reflect the decisions and cover the whole batch.
				expect(result.reclaimed).toBe(expectedReclaim.length);
				expect(result.deadLettered).toBe(expectedDeadLetter.length);
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

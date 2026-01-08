/**
 * Tests for evaluation helper utilities.
 */

import pLimit from 'p-limit';

import { withTimeout } from '../harness/evaluation-helpers';

describe('evaluation-helpers', () => {
	describe('withTimeout()', () => {
		it('should allow p-limit slot to be released when timeout triggers (best-effort)', async () => {
			jest.useFakeTimers();
			const limit = pLimit(1);
			const started: string[] = [];

			const never = new Promise<void>(() => {
				// never resolves
			});

			const p1 = limit(async () => {
				started.push('p1');
				await withTimeout({ promise: never, timeoutMs: 10, label: 'p1' });
			}).catch(() => {
				// expected timeout
			});

			// Give p1 a chance to start.
			await Promise.resolve();

			const p2 = limit(async () => {
				started.push('p2');
			});

			jest.advanceTimersByTime(11);
			await Promise.resolve();
			await Promise.resolve();

			await expect(p2).resolves.toBeUndefined();
			expect(started).toEqual(['p1', 'p2']);

			await p1;
			jest.useRealTimers();
		});
	});
});

import type { Logger } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { FoldFailureStreaks } from '../fold-failure-streaks';

describe('FoldFailureStreaks', () => {
	let cacheService: ReturnType<typeof mock<CacheService>>;
	let scopedLogger: ReturnType<typeof mock<Logger>>;
	let streaks: FoldFailureStreaks;

	beforeEach(() => {
		cacheService = mock<CacheService>();
		scopedLogger = mock<Logger>();
		streaks = new FoldFailureStreaks(
			cacheService,
			mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) }),
		);
	});

	describe('get', () => {
		it('returns the saved count for the same batch', async () => {
			cacheService.get.mockResolvedValue({ batchKey: '10', failures: 2 });

			expect(await streaks.get('first', '10')).toBe(2);
			expect(cacheService.get).toHaveBeenCalledWith(expect.stringContaining('first'));
		});

		it('returns 0 on a cache miss', async () => {
			cacheService.get.mockResolvedValue(undefined);

			expect(await streaks.get('first', '10')).toBe(0);
		});

		it('returns 0 when the saved count belongs to another batch', async () => {
			cacheService.get.mockResolvedValue({ batchKey: '10', failures: 2 });

			expect(await streaks.get('first', '11')).toBe(0);
		});

		it.each([
			['null', null],
			['a string', 'oops'],
			['a number', 3],
			['a missing batch key', { failures: 2 }],
			['a missing count', { batchKey: '10' }],
			['a count that is a string', { batchKey: '10', failures: '2' }],
			['a batch key that is a number', { batchKey: 10, failures: 2 }],
		])('returns 0 for a malformed value: %s', async (_case, value) => {
			cacheService.get.mockResolvedValue(value);

			expect(await streaks.get('first', '10')).toBe(0);
		});

		it('returns 0 and warns when the cache fails', async () => {
			cacheService.get.mockRejectedValue(new Error('redis down'));

			expect(await streaks.get('first', '10')).toBe(0);
			expect(scopedLogger.warn).toHaveBeenCalledTimes(1);
		});
	});

	describe('set', () => {
		it('saves the batch key and the count with a time to live', async () => {
			await streaks.set('first', '10', 2);

			expect(cacheService.set).toHaveBeenCalledWith(
				expect.stringContaining('first'),
				{ batchKey: '10', failures: 2 },
				Time.hours.toMilliseconds,
			);
		});

		it('writes one key for each step', async () => {
			await streaks.set('first', '10', 1);
			await streaks.set('second', '10', 1);
			await streaks.set('first', '20', 1);

			const keys = cacheService.set.mock.calls.map(([key]) => key);
			expect(keys[0]).not.toBe(keys[1]);
			expect(keys[2]).toBe(keys[0]);
		});

		it('does not throw and warns when the cache fails', async () => {
			cacheService.set.mockRejectedValue(new Error('redis down'));

			await expect(streaks.set('first', '10', 1)).resolves.toBeUndefined();
			expect(scopedLogger.warn).toHaveBeenCalledTimes(1);
		});
	});
});

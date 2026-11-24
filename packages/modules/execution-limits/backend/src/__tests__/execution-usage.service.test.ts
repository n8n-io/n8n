import { mock } from 'vitest-mock-extended';

import type { ExecutionLimitUsageRepository } from '../execution-limit-usage.repository';
import type { ExecutionUsageCache } from '../execution-usage-cache';
import { ExecutionUsageService } from '../execution-usage.service';
import type { ExecutionUsage, UsageTotals } from '../execution-usage';

const TOTALS: UsageTotals = {
	startedCount: 7,
	blockedCount: 2,
	lastFoldAt: new Date('2026-11-19T10:00:00.000Z'),
};

describe('ExecutionUsageService', () => {
	const cache = mock<ExecutionUsageCache>();
	const repository = mock<ExecutionLimitUsageRepository>();
	let service: ExecutionUsageService;

	beforeEach(() => {
		vi.resetAllMocks();
		repository.sumProjectUsage.mockResolvedValue(TOTALS);
		repository.sumInstanceUsage.mockResolvedValue(TOTALS);
		service = new ExecutionUsageService(cache, repository);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('getUsage', () => {
		it('reads only the project table for a project scope', async () => {
			const at = new Date('2026-11-18T12:00:00.000Z');

			const usage = await service.getUsage({
				scope: { type: 'project', projectId: 'p1' },
				period: 'week',
				at,
			});

			expect(repository.sumProjectUsage).toHaveBeenCalledExactlyOnceWith(
				'p1',
				'2026-11-16',
				'2026-11-22',
				{},
			);
			expect(repository.sumInstanceUsage).not.toHaveBeenCalled();
			expect(usage.executions).toBe(5);
			expect(usage.lastFoldAt).toEqual(TOTALS.lastFoldAt);
		});

		it('reads only the instance table for an instance scope', async () => {
			const at = new Date('2026-11-18T12:00:00.000Z');

			const usage = await service.getUsage({ scope: { type: 'instance' }, period: 'month', at });

			expect(repository.sumInstanceUsage).toHaveBeenCalledExactlyOnceWith(
				'2026-11-01',
				'2026-11-30',
				{},
			);
			expect(repository.sumProjectUsage).not.toHaveBeenCalled();
			expect(usage.period.unit).toBe('month');
		});

		it('uses the current time when no time is given', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-12-31T23:00:00.000Z'));

			await service.getUsage({ scope: { type: 'instance' }, period: 'day' });

			expect(repository.sumInstanceUsage).toHaveBeenCalledWith('2026-12-31', '2026-12-31', {});
		});
	});

	describe('getCachedUsage', () => {
		it('returns what the cache returns, read at the current time', () => {
			vi.useFakeTimers();
			const now = new Date('2026-11-20T10:00:00.000Z');
			vi.setSystemTime(now);
			const usage = mock<ExecutionUsage>();
			cache.read.mockReturnValue(usage);
			const scope = { type: 'instance' } as const;

			expect(service.getCachedUsage(scope)).toBe(usage);
			expect(cache.read).toHaveBeenCalledExactlyOnceWith(scope, now);
		});

		it('returns null when the cache does not know the usage', () => {
			cache.read.mockReturnValue(null);

			expect(service.getCachedUsage({ type: 'project', projectId: 'p1' })).toBeNull();
		});
	});
});

import type { ClockRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { DbClock } from '@/services/db-clock.service';

jest.useFakeTimers({ advanceTimers: true });

describe('DbClock', () => {
	const clockRepository = mock<ClockRepository>();
	let dbClock: DbClock;

	beforeEach(() => {
		dbClock = new DbClock(clockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.clearAllTimers();
	});

	it('should fetch DB time from the repository on first call', async () => {
		const dbTime = new Date();
		clockRepository.getDbTime.mockResolvedValue(dbTime);

		const result = await dbClock.getApproximateDbTime();

		expect(clockRepository.getDbTime).toHaveBeenCalledTimes(1);
		expect(result.getTime()).toBeCloseTo(dbTime.getTime(), -1);
	});

	it('should reuse cached DB time within 60s TTL', async () => {
		clockRepository.getDbTime.mockResolvedValue(new Date());

		await dbClock.getApproximateDbTime();
		await dbClock.getApproximateDbTime();

		expect(clockRepository.getDbTime).toHaveBeenCalledTimes(1);
	});

	it('should refresh DB time after 60s TTL expires', async () => {
		clockRepository.getDbTime.mockResolvedValue(new Date());

		await dbClock.getApproximateDbTime();

		jest.advanceTimersByTime(60_001);

		await dbClock.getApproximateDbTime();

		expect(clockRepository.getDbTime).toHaveBeenCalledTimes(2);
	});

	it('should interpolate DB time between cache refreshes', async () => {
		const dbTimeAtFetch = new Date(Date.now() - 5_000);
		clockRepository.getDbTime.mockResolvedValue(dbTimeAtFetch);

		await dbClock.getApproximateDbTime();

		jest.advanceTimersByTime(10_000);

		const result = await dbClock.getApproximateDbTime();

		// Approximate = dbTimeAtFetch + 10s elapsed (RTT is ~0 with mocks)
		const expected = dbTimeAtFetch.getTime() + 10_000;
		expect(result.getTime()).toBe(expected);
		expect(clockRepository.getDbTime).toHaveBeenCalledTimes(1);
	});

	it('should clear cache on resetCache()', async () => {
		clockRepository.getDbTime.mockResolvedValue(new Date());

		await dbClock.getApproximateDbTime();
		dbClock.resetCache();
		await dbClock.getApproximateDbTime();

		expect(clockRepository.getDbTime).toHaveBeenCalledTimes(2);
	});
});

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

	it('should fetch server time from the repository on first call', async () => {
		const serverTime = new Date();
		clockRepository.getServerTime.mockResolvedValue(serverTime);

		const result = await dbClock.getApproximateServerTime();

		expect(clockRepository.getServerTime).toHaveBeenCalledTimes(1);
		expect(result.getTime()).toBe(serverTime.getTime());
	});

	it('should reuse cached server time within 60s TTL', async () => {
		clockRepository.getServerTime.mockResolvedValue(new Date());

		await dbClock.getApproximateServerTime();
		await dbClock.getApproximateServerTime();

		expect(clockRepository.getServerTime).toHaveBeenCalledTimes(1);
	});

	it('should refresh server time after 60s TTL expires', async () => {
		clockRepository.getServerTime.mockResolvedValue(new Date());

		await dbClock.getApproximateServerTime();

		jest.advanceTimersByTime(60_001);

		await dbClock.getApproximateServerTime();

		expect(clockRepository.getServerTime).toHaveBeenCalledTimes(2);
	});

	it('should interpolate server time between cache refreshes', async () => {
		const serverTimeAtFetch = new Date(Date.now() - 5_000);
		clockRepository.getServerTime.mockResolvedValue(serverTimeAtFetch);

		await dbClock.getApproximateServerTime();

		jest.advanceTimersByTime(10_000);

		const result = await dbClock.getApproximateServerTime();

		// Approximate = serverTimeAtFetch + 10s elapsed
		const expected = serverTimeAtFetch.getTime() + 10_000;
		expect(result.getTime()).toBe(expected);
		expect(clockRepository.getServerTime).toHaveBeenCalledTimes(1);
	});

	it('should clear cache on resetCache()', async () => {
		clockRepository.getServerTime.mockResolvedValue(new Date());

		await dbClock.getApproximateServerTime();
		dbClock.resetCache();
		await dbClock.getApproximateServerTime();

		expect(clockRepository.getServerTime).toHaveBeenCalledTimes(2);
	});
});

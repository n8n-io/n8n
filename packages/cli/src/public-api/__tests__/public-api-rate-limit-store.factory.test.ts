import { MemoryStore } from 'express-rate-limit';
import type { Options } from 'express-rate-limit';
import RedisMock from 'ioredis-mock';
import { RedisStore } from 'rate-limit-redis';

import { createStoreFactory, redisCluster } from './fake-redis.factory';

describe('PublicApiRateLimitStoreFactory', () => {
	beforeEach(async () => {
		await new RedisMock().flushall();
	});

	it('keeps the counts in memory and does not connect to Redis on a single main', () => {
		const createRedisClient = vi.fn();

		const store = createStoreFactory('single main', { createRedisClient }).create('test');

		expect(store).toBeInstanceOf(MemoryStore);
		expect(createRedisClient).not.toHaveBeenCalled();
	});

	it('loads the scripts on every Redis Cluster node', async () => {
		const store = createStoreFactory('multi-main', { createRedisClient: redisCluster }).create(
			'test',
		);
		store.init?.({ windowMs: 60_000 } as Options);

		expect(store).toBeInstanceOf(RedisStore);
		expect((await store.increment('key-1')).totalHits).toBe(1);
		expect((await store.increment('key-1')).totalHits).toBe(2);
	});
});

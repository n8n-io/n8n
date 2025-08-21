import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'jest-mock-extended';

import config from '@/config';
import type { RedisClientService } from '@/services/redis-client.service';

import { Subscriber } from '../subscriber.service';

describe('Subscriber', () => {
	beforeEach(() => {
		config.set('executions.mode', 'queue');
		jest.restoreAllMocks();
	});

	const client = mock<SingleNodeClient>();
	const redisClientService = mock<RedisClientService>({ createClient: () => client });

	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const subscriber = new Subscriber(mock(), mock(), mock(), redisClientService);

			expect(subscriber.getClient()).toEqual(client);
		});

		it('should not init Redis client in regular mode', () => {
			config.set('executions.mode', 'regular');
			const subscriber = new Subscriber(mock(), mock(), mock(), redisClientService);

			expect(subscriber.getClient()).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		it('should disconnect Redis client', () => {
			const subscriber = new Subscriber(mock(), mock(), mock(), redisClientService);
			subscriber.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});

	describe('subscribe', () => {
		it('should subscribe to pubsub channel', async () => {
			const subscriber = new Subscriber(mock(), mock(), mock(), redisClientService);

			await subscriber.subscribe('n8n.commands');

			expect(client.subscribe).toHaveBeenCalledWith('n8n.commands', expect.any(Function));
		});
	});
});

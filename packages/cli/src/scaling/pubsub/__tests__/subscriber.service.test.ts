import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'jest-mock-extended';

import type { RedisClientService } from '@/services/redis-client.service';

import { Subscriber } from '../subscriber.service';

describe('Subscriber', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	const client = mock<SingleNodeClient>();
	const redisClientService = mock<RedisClientService>({ createClient: () => client });
	const executionsConfig = mockInstance(ExecutionsConfig, { mode: 'queue' });

	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
			);

			expect(subscriber.getClient()).toEqual(client);
		});

		it('should not init Redis client in regular mode', () => {
			const regularModeConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				regularModeConfig,
			);

			expect(subscriber.getClient()).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		it('should disconnect Redis client', () => {
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
			);
			subscriber.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});

	describe('subscribe', () => {
		it('should subscribe to pubsub channel', async () => {
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
			);

			await subscriber.subscribe('n8n.commands');

			expect(client.subscribe).toHaveBeenCalledWith('n8n.commands', expect.any(Function));
		});
	});
});

import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
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
	const globalConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n' } });

	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
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
				globalConfig,
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
				globalConfig,
			);
			subscriber.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});

	describe('subscribe', () => {
		it('should subscribe to pubsub channel with prefix', async () => {
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				globalConfig,
			);

			const commandChannel = subscriber.getCommandChannel();
			await subscriber.subscribe(commandChannel);

			expect(client.subscribe).toHaveBeenCalledWith('n8n:n8n.commands', expect.any(Function));
		});
	});

	describe('prefix isolation', () => {
		it('should apply configured prefix when subscribing to channels', async () => {
			const customConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n-instance-1' } });
			const subscriber = new Subscriber(
				mock(),
				mock(),
				mock(),
				redisClientService,
				executionsConfig,
				customConfig,
			);

			await subscriber.subscribe(subscriber.getCommandChannel());
			await subscriber.subscribe(subscriber.getWorkerResponseChannel());

			expect(client.subscribe).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.commands',
				expect.any(Function),
			);
			expect(client.subscribe).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.worker-response',
				expect.any(Function),
			);
		});
	});
});

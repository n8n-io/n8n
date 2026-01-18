import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { RedisClientService } from '@/services/redis-client.service';

import { Publisher } from '../publisher.service';
import type { PubSub } from '../pubsub.types';

describe('Publisher', () => {
	const client = mock<SingleNodeClient>();
	const logger = mockLogger();
	const hostId = 'main-bnxa1riryKUNHtln';
	const instanceSettings = mock<InstanceSettings>({ hostId });
	const redisClientService = mock<RedisClientService>({ createClient: () => client });
	const executionsConfig = mockInstance(ExecutionsConfig, { mode: 'queue' });
	const globalConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n' } });

	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);

			expect(publisher.getClient()).toEqual(client);
		});

		it('should not init Redis client in regular mode', () => {
			const regularModeConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				regularModeConfig,
				globalConfig,
			);

			expect(publisher.getClient()).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		it('should disconnect Redis client', () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			publisher.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});

	describe('publishCommand', () => {
		it('should do nothing if not in scaling mode', async () => {
			const regularModeConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				regularModeConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'reload-license' });

			await publisher.publishCommand(msg);

			expect(client.publish).not.toHaveBeenCalled();
		});

		it('should publish command into prefixed pubsub channel', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'reload-license' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				JSON.stringify({ ...msg, senderId: hostId, selfSend: false, debounce: true }),
			);
		});

		it('should not debounce `add-webhooks-triggers-and-pollers`', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'add-webhooks-triggers-and-pollers' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				JSON.stringify({
					...msg,
					_isMockObject: true,
					senderId: hostId,
					selfSend: true,
					debounce: false,
				}),
			);
		});

		it('should not debounce `remove-triggers-and-pollers`', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.Command>({ command: 'remove-triggers-and-pollers' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n:n8n.commands',
				JSON.stringify({
					...msg,
					_isMockObject: true,
					senderId: hostId,
					selfSend: true,
					debounce: false,
				}),
			);
		});
	});

	describe('publishWorkerResponse', () => {
		it('should publish worker response into prefixed pubsub channel', async () => {
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				globalConfig,
			);
			const msg = mock<PubSub.WorkerResponse>({
				response: 'response-to-get-worker-status',
			});

			await publisher.publishWorkerResponse(msg);

			expect(client.publish).toHaveBeenCalledWith('n8n:n8n.worker-response', JSON.stringify(msg));
		});
	});

	describe('prefix isolation', () => {
		it('should apply configured prefix to both command and worker response channels', async () => {
			const customConfig = mockInstance(GlobalConfig, { redis: { prefix: 'n8n-instance-1' } });
			const publisher = new Publisher(
				logger,
				redisClientService,
				instanceSettings,
				executionsConfig,
				customConfig,
			);

			const commandMsg = mock<PubSub.Command>({ command: 'reload-license' });
			await publisher.publishCommand(commandMsg);
			expect(client.publish).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.commands',
				expect.any(String),
			);

			const workerMsg = mock<PubSub.WorkerResponse>({
				response: 'response-to-get-worker-status',
			});
			await publisher.publishWorkerResponse(workerMsg);
			expect(client.publish).toHaveBeenCalledWith(
				'n8n-instance-1:n8n.worker-response',
				JSON.stringify(workerMsg),
			);
		});
	});
});

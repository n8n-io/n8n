import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import config from '@/config';
import type { RedisClientService } from '@/services/redis-client.service';
import { mockLogger } from '@test/mocking';

import { Publisher } from '../pubsub/publisher.service';
import type { PubSub } from '../pubsub/pubsub.types';

describe('Publisher', () => {
	beforeEach(() => {
		config.set('executions.mode', 'queue');
	});

	const client = mock<SingleNodeClient>();
	const logger = mockLogger();
	const hostId = 'main-bnxa1riryKUNHtln';
	const instanceSettings = mock<InstanceSettings>({ hostId });
	const redisClientService = mock<RedisClientService>({ createClient: () => client });

	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const publisher = new Publisher(logger, redisClientService, instanceSettings);

			expect(publisher.getClient()).toEqual(client);
		});

		it('should not init Redis client in regular mode', () => {
			config.set('executions.mode', 'regular');
			const publisher = new Publisher(logger, redisClientService, instanceSettings);

			expect(publisher.getClient()).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		it('should disconnect Redis client', () => {
			const publisher = new Publisher(logger, redisClientService, instanceSettings);
			publisher.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});

	describe('publishCommand', () => {
		it('should publish command into `n8n.commands` pubsub channel', async () => {
			const publisher = new Publisher(logger, redisClientService, instanceSettings);
			const msg = mock<PubSub.Command>({ command: 'reload-license' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n.commands',
				JSON.stringify({ ...msg, senderId: hostId, selfSend: false, debounce: true }),
			);
		});
	});

	describe('publishWorkerResponse', () => {
		it('should publish worker response into `n8n.worker-response` pubsub channel', async () => {
			const publisher = new Publisher(logger, redisClientService, instanceSettings);
			const msg = mock<PubSub.WorkerResponse>({
				response: 'response-to-get-worker-status',
			});

			await publisher.publishWorkerResponse(msg);

			expect(client.publish).toHaveBeenCalledWith('n8n.worker-response', JSON.stringify(msg));
		});
	});
});

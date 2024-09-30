import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'jest-mock-extended';

import config from '@/config';
import { generateNanoId } from '@/databases/utils/generators';
import type { RedisClientService } from '@/services/redis-client.service';

import { Publisher } from '../pubsub/publisher.service';
import type { PubSub } from '../pubsub/pubsub.types';

describe('Publisher', () => {
	let queueModeId: string;

	beforeEach(() => {
		config.set('executions.mode', 'queue');
		queueModeId = generateNanoId();
		config.set('redis.queueModeId', queueModeId);
	});

	const client = mock<SingleNodeClient>();
	const redisClientService = mock<RedisClientService>({ createClient: () => client });

	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const publisher = new Publisher(mock(), redisClientService);

			expect(publisher.getClient()).toEqual(client);
		});

		it('should not init Redis client in regular mode', () => {
			config.set('executions.mode', 'regular');
			const publisher = new Publisher(mock(), redisClientService);

			expect(publisher.getClient()).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		it('should disconnect Redis client', () => {
			const publisher = new Publisher(mock(), redisClientService);
			publisher.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});

	describe('publishCommand', () => {
		it('should publish command into `n8n.commands` pubsub channel', async () => {
			const publisher = new Publisher(mock(), redisClientService);
			const msg = mock<PubSub.Command>({ command: 'reload-license' });

			await publisher.publishCommand(msg);

			expect(client.publish).toHaveBeenCalledWith(
				'n8n.commands',
				JSON.stringify({ ...msg, senderId: queueModeId }),
			);
		});
	});

	describe('publishWorkerResponse', () => {
		it('should publish worker response into `n8n.worker-response` pubsub channel', async () => {
			const publisher = new Publisher(mock(), redisClientService);
			const msg = mock<PubSub.WorkerResponse>({
				command: 'reload-external-secrets-providers',
			});

			await publisher.publishWorkerResponse(msg);

			expect(client.publish).toHaveBeenCalledWith('n8n.worker-response', JSON.stringify(msg));
		});
	});
});

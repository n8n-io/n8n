import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import Redis from 'ioredis';

import { RedisClientService } from '@/services/redis-client.service';

jest.mock('ioredis', () => {
	return jest.fn().mockImplementation(() => {
		return {
			on: jest.fn(),
		};
	});
});

describe('RedisClientService', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);

	const globalConfig = mockInstance(GlobalConfig, {
		queue: {
			bull: {
				redis: {
					host: 'localhost',
					port: 6379,
					db: 0,
					timeoutThreshold: 10000,
					clusterNodes: '',
					keepAlive: undefined,
				},
			},
		},
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should create client with basic options', () => {
		const service = new RedisClientService(logger, globalConfig);
		service.createClient({ type: 'client(bull)' });

		expect(Redis).toHaveBeenCalledWith(
			expect.objectContaining({
				host: 'localhost',
				port: 6379,
				db: 0,
				enableReadyCheck: false,
				maxRetriesPerRequest: null,
			}),
		);

		const callArgs = (Redis as unknown as jest.Mock).mock.calls[0][0];
		expect(callArgs).not.toHaveProperty('keepAlive');
	});

	it('should add keepAlive options when configured', () => {
		globalConfig.queue.bull.redis.keepAlive = true;
		globalConfig.queue.bull.redis.keepAliveDelay = 123;
		globalConfig.queue.bull.redis.keepAliveInterval = 456;

		const service = new RedisClientService(logger, globalConfig);
		service.createClient({ type: 'client(bull)' });

		expect(Redis).toHaveBeenCalledWith(
			expect.objectContaining({
				keepAlive: 123,
				keepAliveInterval: 456,
			}),
		);
	});
});

import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { RedisClientService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { createRedisWorkQueues } from '@n8n/engine';

import { createInstanceRedisWorkQueues } from '../work-queue/redis-work-queues';

vi.mock('@n8n/engine', { spy: true });

const publisher = { lpush: vi.fn(), rpush: vi.fn() };

mockInstance(GlobalConfig, { redis: { prefix: 'acme' } });
const redisClientService = mockInstance(RedisClientService);

describe('createInstanceRedisWorkQueues', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('gives the engine the publisher, the limits and the key prefix that RedisClientService makes valid', async () => {
		redisClientService.toValidPrefix.mockReturnValue('{acme}');
		const logger = mockLogger();
		const concurrency = { orchestration: 2, step: 3 };

		await createInstanceRedisWorkQueues(publisher, logger, concurrency);

		expect(redisClientService.toValidPrefix).toHaveBeenCalledWith('acme');
		expect(createRedisWorkQueues).toHaveBeenCalledExactlyOnceWith({
			publisher,
			createConsumer: expect.any(Function),
			keyPrefix: '{acme}',
			concurrency,
			logger,
		});
	});

	it('opens a consuming connection as a work queue consumer of this instance when a consumer starts', async () => {
		const { queues } = await createInstanceRedisWorkQueues(publisher, mockLogger(), {
			orchestration: 1,
			step: 1,
		});
		expect(redisClientService.createClient).not.toHaveBeenCalled();

		queues.consumers.step.start(async () => {});
		await queues.consumers.step.stop();

		expect(redisClientService.createClient.mock.calls).toEqual([
			[{ type: 'work-queue-consumer(n8n)' }],
		]);
	});
});

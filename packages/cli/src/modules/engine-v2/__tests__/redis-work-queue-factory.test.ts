import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { RedisClientService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';

import { createInstanceRedisWorkQueueFactory } from '../work-queue/redis-work-queue-factory';

const publisher = {
	lpush: vi.fn(async () => 1),
	rpush: vi.fn(async () => 1),
	disconnect: vi.fn(),
};

mockInstance(GlobalConfig, { redis: { prefix: 'acme' } });
const redisClientService = mockInstance(RedisClientService);

const consumerOptions = { concurrency: 1, parse: (value: unknown) => value, logger: mockLogger() };

describe('createInstanceRedisWorkQueueFactory', () => {
	let connections: Array<{ brpop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }>;

	beforeEach(() => {
		vi.clearAllMocks();
		redisClientService.toValidPrefix.mockReturnValue('{acme}');
		connections = [];
		redisClientService.createClient.mockImplementation(() => {
			const connection = {
				brpop: vi.fn(
					async () => await new Promise((resolve) => setTimeout(() => resolve(null), 10)),
				),
				disconnect: vi.fn(),
			};
			connections.push(connection);
			return connection as never;
		});
	});

	it('publishes each queue to its own list under the key prefix that RedisClientService makes valid', async () => {
		const workQueueFactory = await createInstanceRedisWorkQueueFactory(publisher);

		await workQueueFactory.createPublisher('orchestration').publish({ n: 1 });
		await workQueueFactory.createPublisher('step').publish({ n: 2 });

		expect(redisClientService.toValidPrefix).toHaveBeenCalledWith('acme');
		expect(publisher.lpush.mock.calls).toEqual([
			['{acme}:engine-v2-queue:orchestration', '{"n":1}'],
			['{acme}:engine-v2-queue:step', '{"n":2}'],
		]);
		expect(redisClientService.createClient).not.toHaveBeenCalled();
	});

	it.each(['step', 'orchestration'])(
		'opens a connection as a work queue consumer of this instance for each consumer, and the %s consumer reads its own list',
		async (name) => {
			const workQueueFactory = await createInstanceRedisWorkQueueFactory(publisher);
			const names = ['step', 'orchestration'];
			const consumers = names.map((queue) =>
				workQueueFactory.createConsumer(queue, consumerOptions),
			);
			const started = names.indexOf(name);
			const [startedConnection, otherConnection] = [connections[started], connections[1 - started]];

			consumers[started].start(async () => {});
			await vi.waitFor(() =>
				expect(startedConnection.brpop).toHaveBeenCalledWith(`{acme}:engine-v2-queue:${name}`, 1),
			);
			await consumers[started].stop();

			expect(redisClientService.createClient.mock.calls).toEqual([
				[{ type: 'work-queue-consumer(n8n)' }],
				[{ type: 'work-queue-consumer(n8n)' }],
			]);
			expect(otherConnection.brpop).not.toHaveBeenCalled();
			for (const connection of connections) expect(connection.disconnect).not.toHaveBeenCalled();
		},
	);

	it('disconnects each consumer connection once on close, and never the publisher', async () => {
		const workQueueFactory = await createInstanceRedisWorkQueueFactory(publisher);
		workQueueFactory.createConsumer('orchestration', consumerOptions);
		workQueueFactory.createConsumer('step', consumerOptions);

		workQueueFactory.close();
		workQueueFactory.close();

		expect(connections).toHaveLength(2);
		for (const connection of connections) expect(connection.disconnect).toHaveBeenCalledOnce();
		expect(publisher.disconnect).not.toHaveBeenCalled();
	});
});

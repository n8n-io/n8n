import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { RedisClientService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';

import { createRedisWorkQueues } from '../work-queue/redis-work-queues';

type FakeClient = {
	type: string;
	brpop: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
};

const publisher = { lpush: vi.fn(), rpush: vi.fn(), disconnect: vi.fn() };

mockInstance(GlobalConfig, { redis: { prefix: 'n8n' } });
const redisClientService = mockInstance(RedisClientService);

describe('createRedisWorkQueues', () => {
	let clients: FakeClient[];

	beforeEach(() => {
		vi.clearAllMocks();
		publisher.lpush.mockResolvedValue(1);
		clients = [];
		redisClientService.toValidPrefix.mockImplementation((prefix) => prefix);
		redisClientService.createClient.mockImplementation(({ type }) => {
			const client: FakeClient = {
				type,
				// An empty list: each fetch waits out its timeout, as a real blocking pop does.
				brpop: vi.fn(async (_key: string, timeoutSeconds: number) => {
					await new Promise((resolve) => setTimeout(resolve, timeoutSeconds * 1000));
					return null;
				}),
				disconnect: vi.fn(),
			};
			clients.push(client);
			return client as unknown as ReturnType<RedisClientService['createClient']>;
		});
	});

	it('opens one consuming connection per queue and no publishing connection', async () => {
		await createRedisWorkQueues(publisher, mockLogger());

		expect(clients.map(({ type }) => type)).toEqual([
			'work-queue-consumer(n8n)',
			'work-queue-consumer(n8n)',
		]);
	});

	it.each([
		['n8n', 'n8n'],
		['n8n', '{n8n}'],
	])(
		'publishes each queue to its own list under the valid prefix %s -> %s',
		async (prefix, validPrefix) => {
			redisClientService.toValidPrefix.mockReturnValue(validPrefix);
			const { queues } = await createRedisWorkQueues(publisher, mockLogger());

			await queues.orchestration.publish({ type: 'execution:enqueued', executionId: 'exec-1' });
			await queues.step.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' });

			expect(redisClientService.toValidPrefix).toHaveBeenCalledWith(prefix);
			expect(publisher.lpush.mock.calls).toEqual([
				[
					`${validPrefix}:engine-v2-queue:orchestration`,
					JSON.stringify({ type: 'execution:enqueued', executionId: 'exec-1' }),
				],
				[
					`${validPrefix}:engine-v2-queue:step`,
					JSON.stringify({ type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' }),
				],
			]);
		},
	);

	it('consumes each queue from its own list over its own connection', async () => {
		const { queues } = await createRedisWorkQueues(publisher, mockLogger());
		const consumers = clients.filter(({ type }) => type === 'work-queue-consumer(n8n)');

		queues.orchestration.start(vi.fn());
		queues.step.start(vi.fn());
		await vi.waitFor(() => consumers.forEach(({ brpop }) => expect(brpop).toHaveBeenCalled()));
		await Promise.all([queues.orchestration.stop(), queues.step.stop()]);

		const keys = consumers.map(({ brpop }) => new Set(brpop.mock.calls.map(([key]) => key)));
		expect(keys).toEqual([
			new Set(['n8n:engine-v2-queue:orchestration']),
			new Set(['n8n:engine-v2-queue:step']),
		]);
	});

	it('closes its consuming connections but not the publishing connection it was given', async () => {
		const { close } = await createRedisWorkQueues(publisher, mockLogger());

		close();

		expect(clients).toHaveLength(2);
		clients.forEach(({ disconnect }) => expect(disconnect).toHaveBeenCalledOnce());
		expect(publisher.disconnect).not.toHaveBeenCalled();
	});
});

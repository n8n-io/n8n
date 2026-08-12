import { mockLogger } from '@n8n/backend-test-utils';
import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'vitest-mock-extended';

import type { RedisClientService } from '@/services/redis-client.service';

import { RedisMessageTransport } from '../redis-message-transport';

describe('RedisMessageTransport', () => {
	const publisherClient = mock<SingleNodeClient>();
	const subscriberClient = mock<SingleNodeClient>();
	const logger = mockLogger();
	const redisClientService = mock<RedisClientService>();

	let transport: RedisMessageTransport;

	beforeEach(() => {
		vi.clearAllMocks();
		redisClientService.createClient.mockImplementation(({ type }) =>
			type === 'publisher(n8n)' ? publisherClient : subscriberClient,
		);
		transport = new RedisMessageTransport(logger, redisClientService);
	});

	describe('publish', () => {
		it('should lazily create a dedicated publisher client and publish through it', async () => {
			expect(redisClientService.createClient).not.toHaveBeenCalled();

			await transport.publish('chan', 'hello');

			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'publisher(n8n)' });
			expect(publisherClient.publish).toHaveBeenCalledWith('chan', 'hello');
		});

		it('should reuse the same publisher client across calls', async () => {
			await transport.publish('chan', 'one');
			await transport.publish('chan', 'two');

			expect(redisClientService.createClient).toHaveBeenCalledTimes(1);
		});
	});

	describe('subscribe', () => {
		it('should lazily create a dedicated subscriber client and subscribe through it', async () => {
			await transport.subscribe('chan', vi.fn());

			expect(redisClientService.createClient).toHaveBeenCalledWith({ type: 'subscriber(n8n)' });
			expect(subscriberClient.subscribe).toHaveBeenCalledWith('chan', expect.any(Function));
		});

		it('should dispatch incoming messages only to handlers for the matching channel', async () => {
			const chanHandler = vi.fn();
			const otherHandler = vi.fn();
			await transport.subscribe('chan', chanHandler);
			await transport.subscribe('other', otherHandler);

			const [, onMessage] = subscriberClient.on.mock.calls.find(([event]) => event === 'message')!;
			(onMessage as (channel: string, message: string) => void)('chan', 'payload');

			expect(chanHandler).toHaveBeenCalledWith('payload', 'chan');
			expect(otherHandler).not.toHaveBeenCalled();
		});

		it('should support multiple handlers on the same channel', async () => {
			const first = vi.fn();
			const second = vi.fn();
			await transport.subscribe('chan', first);
			await transport.subscribe('chan', second);

			const [, onMessage] = subscriberClient.on.mock.calls.find(([event]) => event === 'message')!;
			(onMessage as (channel: string, message: string) => void)('chan', 'payload');

			expect(first).toHaveBeenCalledWith('payload', 'chan');
			expect(second).toHaveBeenCalledWith('payload', 'chan');
		});
	});

	describe('shutdown', () => {
		it('should disconnect only the clients that were created', () => {
			transport.shutdown();
			expect(publisherClient.disconnect).not.toHaveBeenCalled();
			expect(subscriberClient.disconnect).not.toHaveBeenCalled();
		});

		it('should disconnect created clients', async () => {
			await transport.publish('chan', 'hello');
			await transport.subscribe('chan', vi.fn());

			transport.shutdown();

			expect(publisherClient.disconnect).toHaveBeenCalled();
			expect(subscriberClient.disconnect).toHaveBeenCalled();
		});
	});
});

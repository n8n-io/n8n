import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { IpcMessageTransport } from '../ipc-message-transport';

/**
 * These exercise real Unix domain sockets (via `node:net`), not mocks - the point
 * is to prove messages actually cross a socket connection between independently
 * constructed transport instances, standing in for separate main/worker processes,
 * with no Redis involved. Each test uses its own random prefix so the socket path
 * doesn't collide with other tests or leftover files from a previous run.
 */
describe('IpcMessageTransport', () => {
	const transports: IpcMessageTransport[] = [];

	afterEach(() => {
		for (const transport of transports.splice(0)) transport.shutdown();
	});

	function spawn(prefix: string) {
		const globalConfig = mock<GlobalConfig>({ redis: { prefix } });
		const transport = new IpcMessageTransport(mockLogger(), globalConfig);
		transports.push(transport);
		return transport;
	}

	async function settle(ms = 50) {
		await new Promise((resolve) => setTimeout(resolve, ms));
	}

	it('delivers a published message to a subscriber on a different transport instance', async () => {
		const prefix = `test-${randomUUID()}`;
		const publisherSide = spawn(prefix);
		const subscriberSide = spawn(prefix);

		const received = new Promise<[string, string]>((resolve) => {
			void subscriberSide.subscribe('chan', (message, channel) => resolve([message, channel]));
		});
		await settle();

		await publisherSide.publish('chan', 'hello over ipc');

		await expect(received).resolves.toEqual(['hello over ipc', 'chan']);
	});

	it('delivers to every subscriber of a channel, including the publisher itself if subscribed', async () => {
		const prefix = `test-${randomUUID()}`;
		const a = spawn(prefix);
		const b = spawn(prefix);

		const aReceived = vi.fn();
		const bReceived = vi.fn();
		await a.subscribe('chan', aReceived);
		await b.subscribe('chan', bReceived);
		await settle();

		await a.publish('chan', 'broadcast');
		await settle();

		expect(aReceived).toHaveBeenCalledWith('broadcast', 'chan');
		expect(bReceived).toHaveBeenCalledWith('broadcast', 'chan');
	});

	it('does not deliver to a transport subscribed to a different channel', async () => {
		const prefix = `test-${randomUUID()}`;
		const publisherSide = spawn(prefix);
		const subscriberSide = spawn(prefix);

		const otherChannelHandler = vi.fn();
		await subscriberSide.subscribe('other-chan', otherChannelHandler);
		await settle();

		await publisherSide.publish('chan', 'hello');
		await settle();

		expect(otherChannelHandler).not.toHaveBeenCalled();
	});

	it('lets a third transport join after the first two are already connected', async () => {
		const prefix = `test-${randomUUID()}`;
		const first = spawn(prefix);
		const second = spawn(prefix);
		await first.publish('warm-up', 'noop'); // first becomes the broker
		await settle();

		const third = spawn(prefix);
		const received = vi.fn();
		await third.subscribe('chan', received);
		await settle();

		await second.publish('chan', 'late joiner');
		await settle();

		expect(received).toHaveBeenCalledWith('late joiner', 'chan');
	});
});

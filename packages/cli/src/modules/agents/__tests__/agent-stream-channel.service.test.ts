import { mockLogger } from '@n8n/backend-test-utils';
import { RedisClientService } from '@n8n/backend-services';
import type { AgentsConfig, GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { Redis } from 'ioredis';
import { EventEmitter } from 'node:events';

import { AgentStreamChannel, type AgentStreamBatch } from '../queue/agent-stream-channel.service';
import { testCluster } from './test-utils/cluster';

describe('AgentStreamChannel', () => {
	const channelName = 'n8n:n8n.agent-stream';
	const batch: AgentStreamBatch = {
		queueId: 'mine',
		sequence: 1,
		entries: [{ event: { type: 'text-delta', id: 'text', delta: 'a' } }],
	};

	function setup() {
		const client = Object.assign(new EventEmitter(), {
			subscribe: vi.fn(async () => {}),
			publish: vi.fn(async (_channel: string, _message: string) => 1),
			disconnect: vi.fn(),
			status: 'ready',
		});
		Container.set(RedisClientService, {
			createClient: () => client as unknown as Redis,
		} as unknown as RedisClientService);
		const channel = new AgentStreamChannel(
			{ queueModeEnabled: true } as AgentsConfig,
			testCluster({ queue: true }),
			{ redis: { prefix: 'n8n' } } as GlobalConfig,
			mockLogger(),
		);
		return { channel, client };
	}

	it('delivers a published batch to the main that wants its queue ID', async () => {
		const { channel, client } = setup();
		const handler = vi.fn();
		await channel.subscribe(handler, (queueId) => queueId === 'mine');

		await channel.publish(batch);
		const [, message] = client.publish.mock.calls[0];
		client.emit('message', channelName, message);

		expect(handler).toHaveBeenCalledExactlyOnceWith(batch);
	});

	it('does not parse a batch of a stream that another main holds', async () => {
		const { channel, client } = setup();
		const handler = vi.fn();
		await channel.subscribe(handler, (queueId) => queueId === 'mine');

		// Not JSON after the queue ID, so a parse would show as a handler call or a throw.
		client.emit('message', channelName, 'other\n{"queueId":"other","sequence":1,"entries":[]}');
		client.emit('message', channelName, 'no line break');

		expect(handler).not.toHaveBeenCalled();
	});
});

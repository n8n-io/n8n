import { mockLogger } from '@n8n/backend-test-utils';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';

import {
	LEADER_CHANNEL_REQUEST_TIMEOUT_MS,
	LeaderChannelRelayService,
} from '../leader-channel-relay.service';

type Request = PubSubCommandMap['agent-chat-leader-channel-request'];

const telegram = { type: 'telegram' as const, credentialId: 'cred-1' };

function buildRelay() {
	const publisher = mock<Publisher>();
	publisher.publishCommand.mockResolvedValue();
	const instanceSettings = mock<InstanceSettings>({ hostId: 'follower-1' });
	const relay = new LeaderChannelRelayService(mockLogger(), publisher, instanceSettings);

	/** The request payload the relay just published, including its generated id. */
	const publishedRequest = (): Request => {
		const call = publisher.publishCommand.mock.calls.find(
			([msg]) => msg.command === 'agent-chat-leader-channel-request',
		);
		if (!call) throw new Error('No request was published');
		return call[0].payload as Request;
	};

	/** Issue the request under test; `publishedRequest()` reads back its id. */
	const start = async (action: 'connect' | 'disconnect' = 'connect') =>
		await relay.request({ agentId: 'agent-1', integration: telegram, action });

	return { relay, publisher, publishedRequest, start };
}

describe('LeaderChannelRelayService', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('request', () => {
		it('resolves only once the leader acknowledges success', async () => {
			const { relay, publishedRequest, start } = buildRelay();

			const pending = start();
			let settled = false;
			void pending.then(() => {
				settled = true;
			});

			// The leader has not answered yet, so the caller must still be waiting.
			await vi.advanceTimersByTimeAsync(LEADER_CHANNEL_REQUEST_TIMEOUT_MS - 1);
			expect(settled).toBe(false);

			relay.handleResult({ requestId: publishedRequest().requestId, ok: true });

			await expect(pending).resolves.toBeUndefined();
		});

		it('carries this host as the reply address so the ack can be targeted back', async () => {
			const { relay, publishedRequest, start } = buildRelay();

			const pending = start();

			expect(publishedRequest()).toMatchObject({
				replyTo: 'follower-1',
				agentId: 'agent-1',
				action: 'connect',
			});

			relay.handleResult({ requestId: publishedRequest().requestId, ok: true });
			await pending;
		});

		it("rejects with the leader's reason on a negative acknowledgement", async () => {
			const { relay, publishedRequest, start } = buildRelay();

			const pending = start();
			const rejection = expect(pending).rejects.toThrow(
				/could not connect telegram for agent agent-1: bot token already in use/,
			);

			relay.handleResult({
				requestId: publishedRequest().requestId,
				ok: false,
				error: 'bot token already in use',
			});

			await rejection;
		});

		it('rejects when no acknowledgement arrives within the timeout', async () => {
			const { start } = buildRelay();

			const pending = start();
			const rejection = expect(pending).rejects.toThrow(
				/did not acknowledge the request to connect telegram for agent agent-1/,
			);

			await vi.advanceTimersByTimeAsync(LEADER_CHANNEL_REQUEST_TIMEOUT_MS);

			await rejection;
		});

		it('rejects immediately when the request cannot be published', async () => {
			const { publisher, start } = buildRelay();
			publisher.publishCommand.mockRejectedValue(new Error('redis is down'));

			await expect(start()).rejects.toThrow(/Could not reach the leader instance.*redis is down/);
		});

		it('ignores an acknowledgement for an unknown request', () => {
			const { relay } = buildRelay();

			expect(() => relay.handleResult({ requestId: 'lch_gone', ok: true })).not.toThrow();
		});

		it('ignores a late acknowledgement for a request that already timed out', async () => {
			const { relay, publishedRequest, start } = buildRelay();

			const pending = start();
			const rejection = expect(pending).rejects.toThrow();
			await vi.advanceTimersByTimeAsync(LEADER_CHANNEL_REQUEST_TIMEOUT_MS);
			await rejection;

			expect(() =>
				relay.handleResult({ requestId: publishedRequest().requestId, ok: true }),
			).not.toThrow();
		});
	});

	describe('pending requests on lifecycle events', () => {
		it('rejects pending requests when this main becomes the leader', async () => {
			const { relay, start } = buildRelay();

			const pending = start();
			const rejection = expect(pending).rejects.toThrow(/leadership changed/);

			relay.rejectPendingOnTakeover();

			await rejection;
		});

		it('rejects pending requests on shutdown instead of leaving the caller hanging', async () => {
			const { relay, start } = buildRelay();

			const pending = start('disconnect');
			const rejection = expect(pending).rejects.toThrow(/shutting down/);

			relay.rejectPendingOnShutdown();

			await rejection;
		});
	});

	describe('requestWithoutAck', () => {
		it('publishes without registering a pending request', async () => {
			const { relay, publishedRequest } = buildRelay();

			await relay.requestWithoutAck({
				agentId: 'agent-1',
				integration: telegram,
				action: 'disconnect',
			});

			expect(publishedRequest()).toMatchObject({ action: 'disconnect', replyTo: 'follower-1' });
			// No pending entry and no live timer: an ack for this would be dropped, and
			// nothing here can keep the process from exiting.
			expect(vi.getTimerCount()).toBe(0);
		});

		it('propagates a publish failure to the caller', async () => {
			const { relay, publisher } = buildRelay();
			publisher.publishCommand.mockRejectedValue(new Error('redis is down'));

			await expect(
				relay.requestWithoutAck({
					agentId: 'agent-1',
					integration: telegram,
					action: 'disconnect',
				}),
			).rejects.toThrow('redis is down');
		});
	});

	describe('respond', () => {
		const request: Request = {
			requestId: 'lch_1',
			replyTo: 'follower-2',
			agentId: 'agent-1',
			integration: telegram,
			action: 'connect',
		};

		it('targets the acknowledgement at the requesting main', async () => {
			const { relay, publisher } = buildRelay();

			await relay.respond(request);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'agent-chat-leader-channel-result',
				payload: { requestId: 'lch_1', ok: true },
				targets: ['follower-2'],
			});
		});

		it('reports the failure reason on a negative acknowledgement', async () => {
			const { relay, publisher } = buildRelay();

			await relay.respond(request, new Error('bot token already in use'));

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'agent-chat-leader-channel-result',
				payload: { requestId: 'lch_1', ok: false, error: 'bot token already in use' },
				targets: ['follower-2'],
			});
		});

		it('swallows a publish failure so the leader keeps its own teardown path', async () => {
			const { relay, publisher } = buildRelay();
			publisher.publishCommand.mockRejectedValue(new Error('redis is down'));

			await expect(relay.respond(request)).resolves.toBeUndefined();
		});
	});
});

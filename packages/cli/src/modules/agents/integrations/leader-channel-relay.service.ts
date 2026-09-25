import { Logger } from '@n8n/backend-common';
import { OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { DistributiveOmit } from '@n8n/utils/types';
import { InstanceSettings } from 'n8n-core';
import { nanoid } from 'nanoid';

import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';

/**
 * How long a requesting main waits for the leader to acknowledge a leader-only
 * channel operation. Connect runs external setup (a Telegram `getMe` probe, a
 * `setWebhook` call), so the budget has to cover a slow platform API while
 * still failing inside a request the user is waiting on.
 */
export const LEADER_CHANNEL_REQUEST_TIMEOUT_MS = 20_000;

type LeaderChannelRequest = PubSubCommandMap['agent-chat-leader-channel-request'];

/** A request as the caller states it; the relay fills in the correlation fields. */
export type LeaderChannelRequestInput = DistributiveOmit<
	LeaderChannelRequest,
	'requestId' | 'replyTo'
>;

interface PendingRequest {
	resolve: () => void;
	reject: (error: Error) => void;
	label: string;
}

/**
 * Correlated request/acknowledgement transport for channel operations that only
 * the leader main may perform (e.g. Telegram polling).
 *
 * A follower publishes a request and awaits the leader's acknowledgement, so it
 * never builds the runtime itself and never reports success for a startup that
 * did not happen. This class is only the transport — `ChatIntegrationService`
 * decides what to route and executes the leader side.
 */
@Service()
export class LeaderChannelRelayService {
	/** Requests this main is waiting on an acknowledgement for. */
	private readonly pending = new Map<string, PendingRequest>();

	constructor(
		private readonly logger: Logger,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/**
	 * Ask the leader to run this operation and resolve once it acknowledges.
	 * Rejects on timeout, on a negative acknowledgement, and if this main becomes
	 * leader or shuts down while waiting — never silently, so the caller can
	 * surface it.
	 */
	async request(input: LeaderChannelRequestInput): Promise<void> {
		const requestId = `lch_${nanoid()}`;
		const label = this.describe(input);

		return await new Promise<void>((resolve, reject) => {
			// Dropping the entry is the settle-once guard: `handleResult` and
			// `rejectPending` both reach a request through the map, and re-rejecting an
			// already-settled promise is a no-op.
			const settle = (action: () => void) => {
				clearTimeout(timer);
				this.pending.delete(requestId);
				action();
			};

			const timer = setTimeout(() => {
				settle(() => {
					reject(
						new ServiceUnavailableError(
							`The leader instance did not acknowledge the request to ${label} within ${LEADER_CHANNEL_REQUEST_TIMEOUT_MS}ms`,
						),
					);
				});
			}, LEADER_CHANNEL_REQUEST_TIMEOUT_MS);

			this.pending.set(requestId, {
				resolve: () => settle(resolve),
				reject: (error) => settle(() => reject(error)),
				label,
			});

			this.publish(input, requestId).catch((error: unknown) => {
				// Nothing is listening for this request, so waiting out the timeout
				// would only delay the same failure.
				settle(() =>
					reject(
						new ServiceUnavailableError(
							`Could not reach the leader instance to ${label}: ${error instanceof Error ? error.message : String(error)}`,
						),
					),
				);
			});
		});
	}

	/**
	 * Publish a request without waiting for an acknowledgement.
	 *
	 * For a compensating teardown, where the outcome changes nothing the caller
	 * can act on. Correlating it would cost a pending entry and a live timeout for
	 * an answer nobody reads — and when the request it compensates for timed out,
	 * that answer is the one already known not to be coming.
	 */
	async requestWithoutAck(input: LeaderChannelRequestInput): Promise<void> {
		await this.publish(input, `lch_${nanoid()}`);
	}

	/** Acknowledge a request back to the main that sent it. */
	async respond(request: LeaderChannelRequest, error?: Error): Promise<void> {
		try {
			await this.publisher.publishCommand({
				command: 'agent-chat-leader-channel-result',
				payload: error
					? { requestId: request.requestId, ok: false, error: error.message }
					: { requestId: request.requestId, ok: true },
				targets: [request.replyTo],
			});
		} catch (publishError) {
			// The requester falls back to its timeout, and its compensating
			// disconnect releases whatever this main started.
			this.logger.warn(
				`[LeaderChannelRelayService] Could not acknowledge request ${request.requestId}: ${publishError instanceof Error ? publishError.message : String(publishError)}`,
			);
		}
	}

	@OnPubSubEvent('agent-chat-leader-channel-result', { instanceType: 'main' })
	handleResult(payload: PubSubCommandMap['agent-chat-leader-channel-result']): void {
		const pending = this.pending.get(payload.requestId);
		// Already settled by a timeout, or an acknowledgement for another main.
		if (!pending) return;

		if (payload.ok) {
			pending.resolve();
			return;
		}

		pending.reject(
			new ServiceUnavailableError(
				`The leader instance could not ${pending.label}: ${payload.error ?? 'unknown error'}`,
			),
		);
	}

	/**
	 * We are the leader now, so the main we were waiting on is gone or demoted and
	 * its acknowledgement is never arriving. Fail fast instead of waiting out the
	 * timeout — the caller's next attempt runs locally.
	 */
	@OnLeaderTakeover()
	rejectPendingOnTakeover(): void {
		this.rejectPending('leadership changed while the request was in flight');
	}

	@OnShutdown()
	rejectPendingOnShutdown(): void {
		this.rejectPending('this instance is shutting down');
	}

	private rejectPending(reason: string): void {
		for (const pending of [...this.pending.values()]) {
			pending.reject(new ServiceUnavailableError(`Could not ${pending.label} — ${reason}`));
		}
	}

	private async publish(input: LeaderChannelRequestInput, requestId: string): Promise<void> {
		await this.publisher.publishCommand({
			command: 'agent-chat-leader-channel-request',
			payload: { ...input, requestId, replyTo: this.instanceSettings.hostId },
		});
	}

	private describe(input: LeaderChannelRequestInput): string {
		return `${input.action} ${input.integration.type} for agent ${input.agentId}`;
	}
}

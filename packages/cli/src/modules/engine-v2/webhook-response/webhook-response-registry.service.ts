import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { ExecutionResponse, ResponseExpectation } from '@n8n/engine';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import type { ResponseStream } from '@/webhooks/streaming-webhook-response-heartbeat';

import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from '../response-channel/execution-response-receiver';
import { StreamingResponseWriter } from './streaming-response-writer';
import { toWebhookOutcome, type WebhookRunOutcome } from './webhook-outcome';

/** The caller's view of an open webhook request that waits for its run. */
export interface WebhookResponseWait {
	readonly executionId: ExecutionIdV2;
	/** Resolves when the run answers the request, or when the hold runs out. */
	readonly outcome: Promise<WebhookRunOutcome>;
	/**
	 * Stops the wait. The registry releases the wait by itself when the outcome
	 * settles, so call this only to give up early. It is safe to call again.
	 */
	release(): void;
}

/** A request that is still open, and the subscription that feeds its answer. */
type PendingWebhook = {
	executionId: ExecutionIdV2;
	expectation: ResponseExpectation;
	answer: IDeferredPromise<WebhookRunOutcome>;
	/**
	 * Held so an answered run does not leave a timer behind for the whole hold.
	 * A streaming request refreshes it on each chunk.
	 */
	timeoutTimer: NodeJS.Timeout;
	/** Set when the subscription is ready. */
	unsubscribe?: UnsubscribeExecutionResponse;
	/** Set only when the request waits for a stream. */
	writer?: StreamingResponseWriter;
	released: boolean;
};

/**
 * How many runs this replica listens for at once. Every entry has its own
 * response timeout, so the map drains on its own; this only bounds it.
 */
export const MAX_PENDING_WEBHOOKS = 5000;

/** How long to wait for the transport to start listening for a run. */
export const SUBSCRIBE_TIMEOUT_MS = 30_000;

/**
 * Keeps track of the webhook requests that wait for a data-plane run. It owns
 * the lifecycle of each wait: the capacity limit, the subscription, the
 * response timeout, and the release. For a streaming request, it passes the
 * chunks to a `StreamingResponseWriter`.
 *
 * `waitForResponse` should be called before starting the execution in case a
 * fast execution sends a response before we're listening for it.
 */
@Service()
export class EngineV2WebhookResponseRegistry {
	private receiver?: ExecutionResponseReceiver;

	private readonly pendingWebhooks = new Map<string, PendingWebhook>();

	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	/** The host calls this once with the receiver for execution responses. */
	useReceiver(receiver: ExecutionResponseReceiver): void {
		if (this.receiver) {
			throw new UnexpectedError('Engine v2 webhook response receiver is already set');
		}
		this.receiver = receiver;
	}

	/**
	 * Call this before starting the execution. Otherwise, a fast execution can
	 * finish before we are waiting for its response.
	 *
	 * @param executionId The caller must mint this ID, use it here, and pass it to
	 * `StartExecution`.
	 * @param expectation What the request waits for. Pass the same value to
	 * `StartExecution`.
	 * @param responseStream The HTTP response to write chunks to. The service
	 * uses it only when the expectation is `stream`, and then it is required.
	 * @throws {UnexpectedError} If the execution response receiver is not set,
	 * if the service already waits for this execution, or if a stream is
	 * expected without a response stream.
	 * @throws {OperationalError} If the service is at capacity, or if it cannot
	 * listen for the response within `SUBSCRIBE_TIMEOUT_MS`.
	 */
	async waitForResponse(
		executionId: ExecutionIdV2,
		expectation: ResponseExpectation,
		responseStream?: ResponseStream,
	): Promise<WebhookResponseWait> {
		const { receiver } = this;
		if (!receiver) {
			throw new UnexpectedError('Engine v2 cannot wait for a response without a receiver');
		}

		if (this.pendingWebhooks.size >= MAX_PENDING_WEBHOOKS) {
			throw new OperationalError(
				`Engine v2 already awaits ${MAX_PENDING_WEBHOOKS} webhook responses. Try again later.`,
			);
		}

		// A second entry would take over the first one's slot and release.
		if (this.pendingWebhooks.has(executionId)) {
			throw new UnexpectedError('Engine v2 already waits for a response for this execution', {
				extra: { executionId },
			});
		}

		if (expectation.kind === 'stream' && !responseStream) {
			throw new UnexpectedError('Engine v2 cannot stream a response without a response stream', {
				extra: { executionId },
			});
		}

		const pending: PendingWebhook = {
			executionId,
			expectation,
			answer: createDeferredPromise<WebhookRunOutcome>(),
			timeoutTimer: setTimeout(
				() => this.settle(pending, { status: 'timeout' }),
				this.engineConfig.webhookResponseTimeout,
			).unref(),
			released: false,
			writer:
				expectation.kind === 'stream' && responseStream
					? new StreamingResponseWriter(responseStream)
					: undefined,
		};

		// Hold the slot before the subscription is ready, so requests that arrive
		// meanwhile still count against the limit.
		this.pendingWebhooks.set(executionId, pending);

		await this.subscribe(receiver, pending);

		return {
			executionId,
			outcome: pending.answer.promise,
			release: () => this.release(pending),
		};
	}

	/**
	 * A transport can wait for its broker, for example Redis while it reconnects.
	 * A separate timer bounds that wait, so the request cannot stay open while
	 * the broker is down. The run is not started when the wait runs out.
	 *
	 * If the subscription fails or times out, this releases the slot.
	 */
	private async subscribe(
		receiver: ExecutionResponseReceiver,
		pending: PendingWebhook,
	): Promise<void> {
		const { executionId } = pending;
		const subscription = receiver.receive(executionId, (received) =>
			this.handle(received, pending),
		);
		let subscribeTimeoutTimer: NodeJS.Timeout | undefined;
		const timedOut = new Promise<'timed-out'>((resolve) => {
			subscribeTimeoutTimer = setTimeout(() => resolve('timed-out'), SUBSCRIBE_TIMEOUT_MS).unref();
		});

		let result: UnsubscribeExecutionResponse | 'timed-out';
		try {
			result = await Promise.race([subscription, timedOut]);
		} catch (error) {
			this.release(pending);
			throw error;
		} finally {
			clearTimeout(subscribeTimeoutTimer);
		}

		if (result === 'timed-out') {
			this.release(pending);
			// The subscription can still complete. It must not outlive the request.
			void subscription.then(
				(unsubscribe) => unsubscribe(),
				() => {},
			);
			throw new OperationalError(
				`Engine v2 could not listen for the execution response within ${SUBSCRIBE_TIMEOUT_MS / 1000}s.`,
				{ extra: { executionId } },
			);
		}

		const unsubscribe = result;

		// The wait can settle while the subscription is still pending.
		if (pending.released) {
			unsubscribe();
			return;
		}

		pending.unsubscribe = unsubscribe;
	}

	private handle(received: ExecutionResponse, pending: PendingWebhook): void {
		if (pending.released) return;

		try {
			if (received.type === 'chunk' && pending.writer) {
				pending.writer.writeChunk(received.payload);
				// A chunk shows that the run is alive
				pending.timeoutTimer.refresh();
			}

			const outcome = toWebhookOutcome(received, pending.expectation);
			if (outcome) this.settle(pending, outcome);
		} catch (error) {
			this.logger.error('Failed to relay an engine v2 response', {
				executionId: received.executionId,
				type: received.type,
				error,
			});
		}
	}

	/** The first outcome wins. Nothing more is needed from the run after it. */
	private settle(pending: PendingWebhook, outcome: WebhookRunOutcome): void {
		if (pending.released) return;

		try {
			pending.writer?.finish(outcome);
		} catch (error) {
			// A closed connection must not keep the request from settling.
			this.logger.error('Failed to end an engine v2 webhook stream', {
				executionId: pending.executionId,
				error,
			});
		}

		pending.answer.resolve(outcome);
		this.release(pending);
	}

	/** Ends the run's subscription: nothing more can arrive for it. */
	private release(pending: PendingWebhook): void {
		if (pending.released) return;
		pending.released = true;

		clearTimeout(pending.timeoutTimer);
		pending.writer?.stop();
		pending.unsubscribe?.();
		this.pendingWebhooks.delete(pending.executionId);
	}
}

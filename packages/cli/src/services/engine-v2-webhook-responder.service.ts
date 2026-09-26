import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { ExecutionResponse, ResponseExpectation } from '@n8n/engine';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from '@/modules/engine-v2/response-channel/execution-response-receiver';
import type {
	ResponseStream,
	WebhookResponseDelivery,
} from '@/services/engine-v2-webhook-response-delivery';
import { NonStreamingWebhookResponseDelivery } from '@/services/non-streaming-webhook-response-delivery';
import { PendingWebhookResponse } from '@/services/pending-webhook-response';
import { StreamingWebhookResponseDelivery } from '@/services/streaming-webhook-response-delivery';

export type { ResponseStream } from '@/services/engine-v2-webhook-response-delivery';

/** A request that is still open, and the subscription that feeds its answer. */
type PendingWebhook = {
	response: PendingWebhookResponse;
	delivery: WebhookResponseDelivery;
	unsubscribe: UnsubscribeExecutionResponse;
};

/**
 * How many runs this replica listens for at once. Every entry has its own
 * response timeout, so the map drains on its own; this only bounds it.
 */
export const MAX_PENDING_WEBHOOKS = 5000;

/** How long to wait for the transport to start listening for a run. */
export const SUBSCRIBE_TIMEOUT_MS = 30_000;

/**
 * A service for hooking up responses from the data plane with webhook callers
 * expecting that response.
 *
 * `waitForResponse` should be called before starting the execution in case a
 * fast execution sends a response before we're listening for it.
 */
@Service()
export class EngineV2WebhookResponder {
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
	): Promise<PendingWebhookResponse> {
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

		const response = new PendingWebhookResponse({
			executionId,
			expectation,
			timeoutMs: this.engineConfig.webhookResponseTimeout,
			onRelease: (id) => this.release(id),
		});
		const delivery: WebhookResponseDelivery =
			expectation.kind === 'stream' && responseStream
				? new StreamingWebhookResponseDelivery(response, responseStream)
				: new NonStreamingWebhookResponseDelivery(response);

		// Hold the slot before the subscription is ready, so requests that arrive
		// meanwhile still count against the limit. A failed subscription releases
		// the slot, which also stops the delivery.
		const pending: PendingWebhook = { response, delivery, unsubscribe: () => {} };
		this.pendingWebhooks.set(executionId, pending);

		pending.unsubscribe = await this.subscribe(receiver, response, delivery);

		return response;
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
		response: PendingWebhookResponse,
		delivery: WebhookResponseDelivery,
	): Promise<UnsubscribeExecutionResponse> {
		const { executionId } = response;
		const subscription = receiver.receive(executionId, (received) =>
			this.handle(received, delivery),
		);
		let timeoutTimer: NodeJS.Timeout | undefined;
		const timedOut = new Promise<'timed-out'>((resolve) => {
			timeoutTimer = setTimeout(() => resolve('timed-out'), SUBSCRIBE_TIMEOUT_MS).unref();
		});

		let result: UnsubscribeExecutionResponse | 'timed-out';
		try {
			result = await Promise.race([subscription, timedOut]);
		} catch (error) {
			response.release();
			throw error;
		} finally {
			clearTimeout(timeoutTimer);
		}

		if (result === 'timed-out') {
			response.release();
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

		return result;
	}

	private handle(received: ExecutionResponse, delivery: WebhookResponseDelivery): void {
		try {
			delivery.handle(received);
		} catch (error) {
			this.logger.error('Failed to relay an engine v2 response', {
				executionId: received.executionId,
				type: received.type,
				error,
			});
		}
	}

	/** Ends the run's subscription: nothing more can arrive for it. */
	private release(executionId: string): void {
		const pending = this.pendingWebhooks.get(executionId);
		pending?.delivery.dispose?.();
		pending?.unsubscribe();
		this.pendingWebhooks.delete(executionId);
	}
}

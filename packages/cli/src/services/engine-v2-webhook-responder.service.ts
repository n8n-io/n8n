import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { ExecutionResponse, ExecutionResponseReceiver, Unsubscribe } from '@n8n/engine';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IExecuteResponsePromiseData, WebhookResponseMode } from 'n8n-workflow';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import {
	type ResponseStream,
	type WebhookResponseDelivery,
} from '@/services/engine-v2-webhook-response-delivery';
import { NonStreamingWebhookResponseDelivery } from '@/services/non-streaming-webhook-response-delivery';
import { PendingWebhookResponse } from '@/services/pending-webhook-response';
import { StreamingWebhookResponseDelivery } from '@/services/streaming-webhook-response-delivery';

export type { ResponseStream } from '@/services/engine-v2-webhook-response-delivery';

/** What the request waiting on a run needs, beyond the run's own answer. */
export interface WaitOptions {
	responseMode: WebhookResponseMode;
	/** Set for `responseNode`: what the Respond node's answer resolves. */
	responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>;
	/** Chunks are written to it when the response mode is `streaming`. */
	responseStream: ResponseStream;
}

/** A request that is still open, and the subscription that feeds its answer. */
type PendingWebhook = {
	response: PendingWebhookResponse;
	delivery: WebhookResponseDelivery;
	unsubscribe: Unsubscribe;
};

/**
 * How many runs this replica listens for at once. Every entry has its own
 * response timeout, so the map drains on its own; this only bounds it.
 */
export const MAX_PENDING_WEBHOOKS = 5000;

/**
 * Answers a webhook request from the responses its data-plane run sends.
 *
 * The control-plane half: a listener is created for one run, and it hears that
 * run alone. A run this replica did not start is another replica's business,
 * and nothing here ever hears about it.
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
		this.receiver = receiver;
	}

	/**
	 * Listens for one run's answer. Call this before dispatch, with the id the
	 * run is started under: a short workflow answers before `startExecution`
	 * returns.
	 *
	 * Refuses at capacity, so the run never starts. Dropping an older listener
	 * instead would hold its request open until the response timeout, and the
	 * answer it was waiting for would arrive with nobody to take it.
	 */
	waitForResponse(executionId: ExecutionIdV2, options: WaitOptions): PendingWebhookResponse {
		const { receiver } = this;
		if (!receiver) {
			throw new UnexpectedError('Engine 2.0 cannot wait for a response without a receiver');
		}

		if (this.pendingWebhooks.size >= MAX_PENDING_WEBHOOKS) {
			throw new OperationalError(
				`Engine 2.0 already awaits ${MAX_PENDING_WEBHOOKS} webhook responses. Try again later.`,
			);
		}

		const response = new PendingWebhookResponse({
			executionId,
			timeoutMs: this.engineConfig.webhookResponseTimeout,
			onRelease: (id) => this.release(id),
		});
		const delivery: WebhookResponseDelivery =
			options.responseMode === 'streaming'
				? new StreamingWebhookResponseDelivery(response, options.responseStream)
				: new NonStreamingWebhookResponseDelivery(response, options.responsePromise);
		let unsubscribe: Unsubscribe;
		try {
			unsubscribe = receiver.receive(executionId, (received) => this.handle(received, delivery));
		} catch (error) {
			delivery.dispose?.();
			response.release();
			throw error;
		}
		this.pendingWebhooks.set(executionId, { response, delivery, unsubscribe });

		return response;
	}

	private handle(received: ExecutionResponse, delivery: WebhookResponseDelivery): void {
		try {
			delivery.handle(received);
		} catch (error) {
			this.logger.error('Failed to relay an engine 2.0 response', {
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

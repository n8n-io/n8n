import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { EndedMessage, ExecutionResponse } from '@n8n/engine';
import { decodeBufferBody } from 'n8n-core';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from '@/modules/engine-v2/response-channel/execution-response-receiver';
import { PendingWebhookResponse } from '@/services/pending-webhook-response';

/** A request that is still open, and the subscription that feeds its answer. */
type PendingWebhook = {
	response: PendingWebhookResponse;
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
	 * @throws {UnexpectedError} If the execution response receiver is not set, or
	 * if the service already waits for this execution.
	 * @throws {OperationalError} If the service is at capacity, or if it cannot
	 * listen for the response within `SUBSCRIBE_TIMEOUT_MS`.
	 */
	async waitForResponse(
		executionId: ExecutionIdV2,
		acceptsResponse = false,
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

		const response = new PendingWebhookResponse({
			executionId,
			acceptsResponse,
			timeoutMs: this.engineConfig.webhookResponseTimeout,
			onRelease: (id) => this.release(id),
		});

		// Hold the slot before the subscription is ready, so requests that arrive
		// meanwhile still count against the limit.
		const pending: PendingWebhook = { response, unsubscribe: () => {} };
		this.pendingWebhooks.set(executionId, pending);

		try {
			pending.unsubscribe = await this.subscribe(receiver, response);
		} catch (error) {
			response.release();
			throw error;
		}

		return response;
	}

	/**
	 * A transport can wait for its broker, for example Redis while it reconnects.
	 * A separate timer bounds that wait, so the request cannot stay open while
	 * the broker is down. The run is not started when the wait runs out.
	 */
	private async subscribe(
		receiver: ExecutionResponseReceiver,
		response: PendingWebhookResponse,
	): Promise<UnsubscribeExecutionResponse> {
		const { executionId } = response;
		const subscription = receiver.receive(executionId, (received) =>
			this.handle(received, response),
		);
		let timeoutTimer: NodeJS.Timeout | undefined;
		const timedOut = new Promise<'timed-out'>((resolve) => {
			timeoutTimer = setTimeout(() => resolve('timed-out'), SUBSCRIBE_TIMEOUT_MS).unref();
		});

		const result = await Promise.race([subscription, timedOut]).finally(() =>
			clearTimeout(timeoutTimer),
		);
		if (result === 'timed-out') {
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

	private handle(received: ExecutionResponse, response: PendingWebhookResponse): void {
		try {
			this.route(received, response);
		} catch (error) {
			this.logger.error('Failed to relay an engine v2 response', {
				executionId: received.executionId,
				type: received.type,
				error,
			});
		}
	}

	private route(received: ExecutionResponse, response: PendingWebhookResponse): void {
		switch (received.type) {
			case 'undeliverable':
				response.resolve({
					status: 'undeliverable',
					error: { name: received.error.code, message: received.error.message },
				});
				return;

			case 'response':
				// A Buffer body arrives base64-encoded, because the channel is JSON.
				response.resolveResponse(decodeBufferBody(received.payload));
				return;

			case 'ended':
				this.onEnded(received, response);
				return;
		}
	}

	private onEnded(received: EndedMessage, response: PendingWebhookResponse): void {
		const { nodeName, outputs, error } = received.lastStep;

		if (received.status === 'failed') {
			// The step that ended a failed run is the one that failed, so its name
			// and error are what the caller reports.
			response.resolve({ status: 'failed', nodeName, error });
			return;
		}

		response.resolve({
			status: 'completed',
			// A skipped or failed step carries nothing to answer with.
			lastNode: outputs ? { nodeName, outputs } : undefined,
		});
	}

	/** Ends the run's subscription: nothing more can arrive for it. */
	private release(executionId: string): void {
		this.pendingWebhooks.get(executionId)?.unsubscribe();
		this.pendingWebhooks.delete(executionId);
	}
}

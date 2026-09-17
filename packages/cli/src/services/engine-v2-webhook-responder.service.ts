import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { EndedMessage, ExecutionResponse } from '@n8n/engine';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IExecuteResponsePromiseData, IN8nHttpFullResponse } from 'n8n-workflow';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from '@/modules/engine-v2/response-channel/execution-response-receiver';
import { PendingWebhookResponse } from '@/services/pending-webhook-response';
import { EXECUTION_ENDED_WITHOUT_RESPONSE } from '@/webhooks/constants';

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
			throw new UnexpectedError('Engine 2.0 webhook response receiver is already set');
		}
		this.receiver = receiver;
	}

	/**
	 * Call this before starting the execution. Otherwise, a fast execution can
	 * finish before we are waiting for its response.
	 *
	 * @param executionId The caller must mint this ID, use it here, and pass it to
	 * `StartExecution`.
	 * @throws {UnexpectedError} If the execution response receiver is not set.
	 * @throws {OperationalError} If the service is at capacity.
	 */
	waitForResponse(
		executionId: ExecutionIdV2,
		/** Set for `responseNode`: what the Respond node's answer resolves. */
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): PendingWebhookResponse {
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
		const unsubscribe = receiver.receive(executionId, (received) =>
			this.handle(received, response, responsePromise),
		);
		this.pendingWebhooks.set(executionId, { response, unsubscribe });

		return response;
	}

	private handle(
		received: ExecutionResponse,
		response: PendingWebhookResponse,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		try {
			this.route(received, response, responsePromise);
		} catch (error) {
			this.logger.error('Failed to relay an engine 2.0 response', {
				executionId: received.executionId,
				type: received.type,
				error,
			});
		}
	}

	private route(
		received: ExecutionResponse,
		response: PendingWebhookResponse,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		switch (received.type) {
			case 'undeliverable':
				responsePromise?.reject(new Error(received.error.message));
				response.resolve({
					status: 'undeliverable',
					error: { name: received.error.code, message: received.error.message },
				});
				return;

			case 'response':
				// Opaque on the channel by design: only this plane knows a v1 response.
				responsePromise?.resolve(received.payload as unknown as IN8nHttpFullResponse);
				return;

			case 'ended':
				// A run that never reached the Respond node still has to answer. The
				// sentinel tells `setupResponseNodePromise` to stand down, so the
				// handler decides instead. Resolving a settled promise is a no-op.
				responsePromise?.resolve(EXECUTION_ENDED_WITHOUT_RESPONSE);
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

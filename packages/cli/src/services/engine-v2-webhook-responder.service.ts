import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type {
	EndedMessage,
	ExecutionResponse,
	ExecutionResponseChannel,
	Unsubscribe,
} from '@n8n/engine';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IExecuteResponsePromiseData, IN8nHttpFullResponse } from 'n8n-workflow';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import { PendingWebhookResponse } from '@/services/pending-webhook-response';
import { EXECUTION_ENDED_WITHOUT_RESPONSE } from '@/webhooks/constants';

/** A request that is still open, and the subscription that feeds its answer. */
type PendingWebhook = { response: PendingWebhookResponse; unsubscribe: Unsubscribe };

/**
 * How many runs this replica listens for at once. Every entry has its own
 * response timeout, so the map drains on its own; this only bounds it.
 */
export const MAX_PENDING_WEBHOOKS = 5000;

/**
 * Answers a webhook request from the responses its data-plane run publishes.
 *
 * The control-plane half: a listener is created for one run, and it hears that
 * run alone. A run this replica did not start is another replica's business,
 * and nothing here ever hears about it.
 */
@Service()
export class EngineV2WebhookResponder {
	private channel?: ExecutionResponseChannel;

	private readonly pendingWebhooks = new Map<string, PendingWebhook>();

	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	/** The host calls this once, with the channel both planes share. */
	useChannel(channel: ExecutionResponseChannel): void {
		this.channel = channel;
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
	waitForResponse(
		executionId: ExecutionIdV2,
		/** Set for `responseNode`: what the Respond node's answer resolves. */
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): PendingWebhookResponse {
		const { channel } = this;
		if (!channel) {
			throw new UnexpectedError('Engine 2.0 cannot wait for a response without a channel');
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
		const unsubscribe = channel.subscribe(executionId, (published) =>
			this.handle(published, response, responsePromise),
		);
		this.pendingWebhooks.set(executionId, { response, unsubscribe });

		return response;
	}

	private handle(
		published: ExecutionResponse,
		response: PendingWebhookResponse,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		try {
			this.route(published, response, responsePromise);
		} catch (error) {
			this.logger.error('Failed to relay an engine 2.0 response', {
				executionId: published.executionId,
				type: published.type,
				error,
			});
		}
	}
	private route(
		published: ExecutionResponse,
		response: PendingWebhookResponse,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): void {
		switch (published.type) {
			case 'failure':
				responsePromise?.reject(new Error(published.error.message));
				response.resolve({
					status: 'failed',
					error: { name: published.error.code, message: published.error.message },
				});
				return;

			case 'response':
				// Opaque on the channel by design: only this plane knows a v1 response.
				responsePromise?.resolve(published.payload as unknown as IN8nHttpFullResponse);
				return;

			case 'ended':
				// A run that never reached the Respond node still has to answer. The
				// sentinel tells `setupResponseNodePromise` to stand down, so the
				// handler decides instead. Resolving a settled promise is a no-op.
				responsePromise?.resolve(EXECUTION_ENDED_WITHOUT_RESPONSE);
				this.onEnded(published, response);
				return;
		}
	}

	private onEnded(published: EndedMessage, response: PendingWebhookResponse): void {
		const { nodeName, outputs, error } = published.lastStep;

		if (published.status === 'failed') {
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

import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type {
	EndedMessage,
	ExecutionResponse,
	ExecutionResponseChannel,
	Unsubscribe,
} from '@n8n/engine';
import { UnexpectedError } from 'n8n-workflow';

import { createExecutionIdV2 } from '@/executions/execution-id';
import { PendingWebhookResponse } from '@/services/pending-webhook-response';

/** One open wait: the handle the request holds, and the subscription feeding it. */
type Wait = { pending: PendingWebhookResponse; unsubscribe: Unsubscribe };

/** Long enough to outlive a slow run, short enough to bound the map. */
const ENTRY_TTL_MS = 1 * Time.hours.toMilliseconds;
const MAX_ENTRIES = 5000;

/**
 * Answers a webhook request from the responses its data-plane run publishes.
 *
 * The control-plane half: a wait is opened for one run, and it listens to that
 * run alone. A run this replica did not open is another replica's business, and
 * nothing here ever hears about it.
 */
@Service()
export class EngineV2WebhookResponder {
	private channel?: ExecutionResponseChannel;

	private readonly waits = new Map<string, Wait>();

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
	 * Opens the wait for one run. Call this before dispatch: a short workflow
	 * answers before `startExecution` returns.
	 *
	 * Mints the execution id, because the run has to use the one being waited on.
	 */
	expect(): PendingWebhookResponse {
		const { channel } = this;
		if (!channel) {
			throw new UnexpectedError('Engine 2.0 cannot wait for a response without a channel');
		}

		this.evict();

		const pending = new PendingWebhookResponse(
			createExecutionIdV2(),
			this.engineConfig.webhookResponseTimeout,
			(executionId) => this.release(executionId),
		);
		const unsubscribe = channel.subscribe(pending.executionId, (response) =>
			this.handle(response, pending),
		);
		this.waits.set(pending.executionId, { pending, unsubscribe });

		return pending;
	}

	private handle(response: ExecutionResponse, pending: PendingWebhookResponse): void {
		pending.lastSeenAt = Date.now();

		try {
			this.onEnded(response, pending);
		} catch (error) {
			this.logger.error('Failed to relay an engine 2.0 response', {
				executionId: response.executionId,
				type: response.type,
				error,
			});
		}
	}

	private onEnded(response: EndedMessage, pending: PendingWebhookResponse): void {
		const { nodeName, outputs, error } = response.lastStep;

		if (response.status === 'failed') {
			// The step that ended a failed run is the one that failed, so its name
			// and error are what the caller reports.
			pending.resolve({ status: 'failed', nodeName, error });
			return;
		}

		pending.resolve({
			status: 'completed',
			// A skipped or failed step carries nothing to answer with.
			lastNode: outputs ? { nodeName, outputs } : undefined,
		});
	}

	/** Ends the run's subscription: nothing more can arrive for it. */
	private release(executionId: string): void {
		this.waits.get(executionId)?.unsubscribe();
		this.waits.delete(executionId);
	}

	/** Swept on write, so there is no interval to manage. */
	private evict(): void {
		const cutoff = Date.now() - ENTRY_TTL_MS;
		for (const { pending } of this.waits.values()) {
			if (pending.lastSeenAt < cutoff) pending.release();
		}

		// Leave room for the caller's entry, so the cap holds after the insert.
		const excess = this.waits.size - MAX_ENTRIES + 1;
		if (excess <= 0) return;

		const oldestFirst = [...this.waits.values()].sort(
			(a, b) => a.pending.lastSeenAt - b.pending.lastSeenAt,
		);
		for (const { pending } of oldestFirst.slice(0, excess)) pending.release();
	}
}

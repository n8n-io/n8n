import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type {
	EndedMessage,
	ExecutionResponse,
	ExecutionResponseChannel,
	StepSlots,
} from '@n8n/engine';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { createExecutionIdV2, type ExecutionIdV2 } from '@/executions/execution-id';

/** Long enough to outlive a slow run, short enough to bound the map. */
const ENTRY_TTL_MS = 1 * Time.hours.toMilliseconds;
const MAX_ENTRIES = 1000;

/** The last node that ran, as the `lastNode` response mode answers with. */
export type LastNode = { nodeName: string; outputs: StepSlots };

/** What a data-plane run produced, from the waiting request's point of view. */
export type WebhookRunOutcome =
	| { status: 'completed'; lastNode?: LastNode }
	| { status: 'failed' }
	| { status: 'timeout' };

/**
 * One run's answer, awaited by the request that started it.
 *
 * Created before dispatch, so the subscriber exists before the data plane can
 * publish. Holding this object is what makes this replica the one that answers:
 * the channel broadcasts every response, and the others find nothing to do.
 */
export class PendingWebhookResponse {
	/** Resolves when the run ends, or when the wait runs out. */
	readonly settled: Promise<WebhookRunOutcome>;

	lastSeenAt = Date.now();

	private readonly ended = createDeferredPromise<WebhookRunOutcome>();

	constructor(
		readonly executionId: ExecutionIdV2,
		timeoutMs: number,
		private readonly onRelease: (executionId: string) => void,
	) {
		const timeout = new Promise<WebhookRunOutcome>((resolve) =>
			setTimeout(() => resolve({ status: 'timeout' }), timeoutMs).unref(),
		);
		this.settled = Promise.race([this.ended.promise, timeout]);
	}

	resolve(outcome: WebhookRunOutcome): void {
		this.ended.resolve(outcome);
	}

	release(): void {
		this.onRelease(this.executionId);
	}
}

/**
 * Answers a webhook request from the responses its data-plane run publishes.
 *
 * The control-plane half: every replica receives every response, and only the
 * one holding a `PendingWebhookResponse` for that execution acts on it. An
 * execution this replica does not hold belongs to another, so it is dropped
 * without a word.
 */
@Service()
export class EngineV2WebhookResponder {
	private readonly pending = new Map<string, PendingWebhookResponse>();

	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	/** Starts listening. The host calls this once, with the channel both planes share. */
	subscribeTo(channel: ExecutionResponseChannel): void {
		channel.subscribe((response) => this.handle(response));
	}

	/**
	 * Opens the wait for one run. Call this before dispatch: a short workflow
	 * answers before `startExecution` returns.
	 *
	 * Mints the execution id, because the run has to use the one being waited on.
	 */
	expect(): PendingWebhookResponse {
		this.evict();

		const pending = new PendingWebhookResponse(
			createExecutionIdV2(),
			this.engineConfig.webhookResponseTimeout,
			(executionId) => this.pending.delete(executionId),
		);
		this.pending.set(pending.executionId, pending);

		return pending;
	}

	private handle(response: ExecutionResponse): void {
		const pending = this.pending.get(response.executionId);
		// Not ours: another replica holds this run, or it was already answered.
		if (!pending) return;

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
		if (response.status === 'failed') {
			pending.resolve({ status: 'failed' });
			return;
		}

		const { nodeName, outputs } = response.lastStep;
		pending.resolve({
			status: 'completed',
			// A skipped or failed step carries nothing to answer with.
			lastNode: outputs ? { nodeName, outputs } : undefined,
		});
	}

	/** Swept on write, so there is no interval to manage. */
	private evict(): void {
		const cutoff = Date.now() - ENTRY_TTL_MS;
		for (const [, pending] of this.pending) {
			if (pending.lastSeenAt < cutoff) pending.release();
		}

		// Leave room for the caller's entry, so the cap holds after the insert.
		const excess = this.pending.size - MAX_ENTRIES + 1;
		if (excess <= 0) return;

		const oldestFirst = [...this.pending].sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);
		for (const [, pending] of oldestFirst.slice(0, excess)) pending.release();
	}
}

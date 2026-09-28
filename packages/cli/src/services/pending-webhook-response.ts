import type { StepSlots } from '@n8n/engine';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import type { ExecutionIdV2 } from '@/executions/execution-id';

/** The last node that ran, as the `lastNode` response mode answers with. */
export type LastNode = { nodeName: string; outputs: StepSlots };

/** What a data-plane run produced, from the open request's point of view. */
export type WebhookRunOutcome =
	| { status: 'response'; response: unknown }
	| { status: 'completed'; lastNode?: LastNode }
	| { status: 'failed'; nodeName: string; error?: { name: string; message: string } }
	/** The execution response could not be produced or delivered. */
	| { status: 'undeliverable'; error: { name: string; message: string } }
	| { status: 'timeout' };

export type PendingWebhookResponseOptions = {
	/** The run whose answer this handle carries. */
	executionId: ExecutionIdV2;
	/** Whether a Respond to Webhook result answers this request. */
	acceptsResponse: boolean;
	/** How long to hold the request before it is answered without the run. */
	timeoutMs: number;
	/** Called once the answer is no longer needed, so the listener can go. */
	onRelease: (executionId: string) => void;
};

/**
 * This represents a pending webhook response. The webhook responder connects it
 * to the execution responses coming from the engine.
 */
export class PendingWebhookResponse {
	/** Resolves when the request gets an answer, or when the hold runs out. */
	readonly settled: Promise<WebhookRunOutcome>;

	readonly executionId: ExecutionIdV2;

	private readonly acceptsResponse: boolean;

	private readonly onRelease: (executionId: string) => void;

	private readonly answer = createDeferredPromise<WebhookRunOutcome>();

	/** Held so an answered run does not leave a timer behind for the whole hold. */
	private readonly timer: NodeJS.Timeout;

	constructor({
		executionId,
		acceptsResponse,
		timeoutMs,
		onRelease,
	}: PendingWebhookResponseOptions) {
		this.executionId = executionId;
		this.acceptsResponse = acceptsResponse;
		this.onRelease = onRelease;
		this.settled = this.answer.promise;
		this.timer = setTimeout(() => this.answer.resolve({ status: 'timeout' }), timeoutMs).unref();
	}

	resolve(outcome: WebhookRunOutcome): void {
		this.answer.resolve(outcome);
	}

	resolveResponse(response: unknown): void {
		if (this.acceptsResponse) this.answer.resolve({ status: 'response', response });
	}

	release(): void {
		clearTimeout(this.timer);
		this.onRelease(this.executionId);
	}
}

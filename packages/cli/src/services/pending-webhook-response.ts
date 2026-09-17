import type { StepSlots } from '@n8n/engine';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import type { ExecutionIdV2 } from '@/executions/execution-id';

/** The last node that ran, as the `lastNode` response mode answers with. */
export type LastNode = { nodeName: string; outputs: StepSlots };

/** What a data-plane run produced, from the open request's point of view. */
export type WebhookRunOutcome =
	| { status: 'completed'; lastNode?: LastNode }
	| { status: 'failed'; nodeName?: string; error?: { name: string; message: string } }
	| { status: 'timeout' };

export type PendingWebhookResponseOptions = {
	/** The run whose answer this handle carries. */
	executionId: ExecutionIdV2;
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
	/** Resolves when the run ends, or when the hold runs out — whichever is first. */
	readonly settled: Promise<WebhookRunOutcome>;

	readonly executionId: ExecutionIdV2;

	private readonly onRelease: (executionId: string) => void;

	private readonly answer = createDeferredPromise<WebhookRunOutcome>();

	/** Held so an answered run does not leave a timer behind for the whole hold. */
	private readonly timer: NodeJS.Timeout;

	constructor({ executionId, timeoutMs, onRelease }: PendingWebhookResponseOptions) {
		this.executionId = executionId;
		this.onRelease = onRelease;
		this.settled = this.answer.promise;
		this.timer = setTimeout(() => this.answer.resolve({ status: 'timeout' }), timeoutMs).unref();
	}

	resolve(outcome: WebhookRunOutcome): void {
		this.answer.resolve(outcome);
	}

	release(): void {
		clearTimeout(this.timer);
		this.onRelease(this.executionId);
	}
}

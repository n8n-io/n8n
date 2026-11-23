import { messageToText } from './message-text';
import type { AgentMessageList } from '../model/message-list';
import type { TokenCounter } from '../model/model-token-counter';

/**
 * Tracks the size of the next model request as the provider counts it.
 *
 * Message estimates alone miss the system prompt, the tool definitions and the
 * injected notes. So after each model call, the tracker keeps the input tokens
 * the provider reported. The next request is that measurement plus the
 * estimated change in visible messages since the call. Per-message estimates
 * are cached by id, so no message is counted twice.
 */
export class RequestSizeTracker {
	private readonly perMessage = new Map<string, number>();

	private visibleTotal = 0;

	private measurement: { promptTokens: number; visibleTokens: number } | undefined;

	/** Prompt tokens outside the visible messages at the last measurement. */
	private overhead = 0;

	constructor(private readonly tokenCounter: TokenCounter) {}

	/** Estimated tokens of the visible messages. Non-text blocks such as files are excluded. */
	async visibleTokens(list: AgentMessageList): Promise<number> {
		const visible = list.llmVisibleMessages();
		const ids = new Set<string>();
		for (const message of visible) {
			ids.add(message.id);
			if (this.perMessage.has(message.id)) continue;
			const estimate = await this.tokenCounter(messageToText(message));
			this.perMessage.set(message.id, estimate);
			this.visibleTotal += estimate;
		}
		// Masked messages leave the request, so they leave the total.
		for (const [id, estimate] of this.perMessage) {
			if (ids.has(id)) continue;
			this.perMessage.delete(id);
			this.visibleTotal -= estimate;
		}
		return this.visibleTotal;
	}

	/** Cached estimate of one visible message. */
	messageTokens(id: string): number {
		return this.perMessage.get(id) ?? 0;
	}

	/**
	 * Record the input size the provider reported for a model call. Call it
	 * before the response joins the list, so the visible estimate matches what
	 * the call sent. Calls without reported usage keep the previous state.
	 */
	async record(list: AgentMessageList, promptTokens: number): Promise<void> {
		if (promptTokens <= 0) return;
		this.seed(promptTokens, await this.visibleTokens(list));
	}

	/** Start from a size measured earlier, such as the last request of the previous turn. */
	seed(promptTokens: number, visibleTokens: number): void {
		if (promptTokens <= 0) return;
		this.measurement = { promptTokens, visibleTokens };
		this.overhead = Math.max(0, promptTokens - visibleTokens);
	}

	/** Estimated tokens of the next request. */
	async estimate(list: AgentMessageList): Promise<number> {
		const visible = await this.visibleTokens(list);
		if (!this.measurement) return visible + this.overhead;
		return Math.max(0, this.measurement.promptTokens + visible - this.measurement.visibleTokens);
	}

	/**
	 * Drop the measurement when the history changes shape, for example after
	 * observed messages are masked. The overhead stays as the best guess for
	 * the parts of the prompt that are not messages.
	 */
	invalidate(): void {
		this.measurement = undefined;
	}

	/** Start a new run. The overhead stays: the run sends the same system prompt and tools. */
	reset(): void {
		this.perMessage.clear();
		this.visibleTotal = 0;
		this.measurement = undefined;
	}
}

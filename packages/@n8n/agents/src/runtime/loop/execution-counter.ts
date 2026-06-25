import type { AgentExecutionCounter } from '../../types/sdk/agent';

interface TokenUsageLike {
	totalTokens?: number;
	inputTokens?: number;
	outputTokens?: number;
	tokens?: number;
}

/**
 * Run a counter mutation, swallowing any error. Aggregate execution counters are
 * best-effort instrumentation and must never affect agent execution.
 */
export function recordExecutionCounter(fn: () => void): void {
	try {
		fn();
	} catch {
		// Aggregate counters are best-effort and must never affect agent execution.
	}
}

export function incrementMessageCount(counter: AgentExecutionCounter | undefined): void {
	if (!counter) return;
	recordExecutionCounter(() => counter.incrementMessageCount());
}

export function incrementToolCallCount(counter: AgentExecutionCounter | undefined): void {
	if (!counter) return;
	recordExecutionCounter(() => counter.incrementToolCallCount());
}

export function incrementTokenCountFromUsage(
	counter: AgentExecutionCounter | undefined,
	usage: TokenUsageLike | undefined,
): void {
	if (!counter || !usage) return;
	const tokenCount =
		usage.totalTokens ?? usage.tokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
	if (tokenCount <= 0) return;

	try {
		counter.incrementTokenCount(tokenCount);
	} catch {
		// Aggregate counters are best-effort and must never affect agent execution.
	}
}

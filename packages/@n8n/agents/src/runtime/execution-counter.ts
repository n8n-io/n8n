import type { AgentExecutionCounter } from '../types/sdk/agent';

interface TokenUsageLike {
	totalTokens?: number;
	inputTokens?: number;
	outputTokens?: number;
}

export function incrementTokenCountFromUsage(
	counter: AgentExecutionCounter | undefined,
	usage: TokenUsageLike | undefined,
): void {
	if (!counter || !usage) return;
	const tokenCount = usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
	if (tokenCount <= 0) return;

	try {
		counter.incrementTokenCount(tokenCount);
	} catch {
		// Aggregate counters are best-effort and must never affect agent execution.
	}
}

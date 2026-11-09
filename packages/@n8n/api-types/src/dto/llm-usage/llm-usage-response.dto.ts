import type { LlmUsageTopGroup } from './llm-usage-query.dto';

export interface LlmUsageTotals {
	calls: number;
	/** Calls without a catalog price. They are left out of `costUsd`. */
	unpricedCalls: number;
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	/** Estimated from the price catalog, in US dollars. */
	costUsd: number;
}

export interface LlmUsageGroup extends LlmUsageTotals {
	key: string;
	label: string;
	/** The caller type, when the group stands for a caller. */
	caller?: string;
}

/** One call in the calls list. */
export interface LlmUsageCallItem {
	callId: string;
	startedAt: string | null;
	finishedAt: string;
	durationMs: number | null;
	callerType: string;
	subType: string | null;
	workflowId: string | null;
	workflowName: string | null;
	executionId: string | null;
	executionMode: string | null;
	nodeName: string | null;
	agentId: string | null;
	agentName: string | null;
	threadId: string | null;
	/** The session title of an agent or n8n Assistant call. */
	threadTitle: string | null;
	projectId: string | null;
	projectName: string | null;
	userId: string | null;
	userEmail: string | null;
	/** The name of the credential that paid for the call. The API never returns its ID. */
	credentialName: string | null;
	/** Set when n8n credits paid for the call instead of a credential. */
	managedBy: 'aiGateway' | 'assistant' | null;
	provider: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	estimatedCostUsd: number | null;
	priced: boolean;
}

export interface LlmUsageDay {
	/** UTC day, `YYYY-MM-DD`. */
	date: string;
	calls: number;
	costUsd: number;
}

export interface LlmUsageSummaryResponse {
	totals: LlmUsageTotals;
	/** One entry for each day with calls, oldest first. */
	daily: LlmUsageDay[];
	/** The five most expensive entries of each group. */
	top: Record<LlmUsageTopGroup, LlmUsageGroup[]>;
}

export interface LlmUsageCallsResponse {
	count: number;
	items: LlmUsageCallItem[];
}

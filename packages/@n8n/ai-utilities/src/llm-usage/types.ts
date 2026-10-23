/** What made an LLM call. The `llm_usage` migration checks the same values. */
export type LlmCallerType = 'node' | 'agent' | 'instance-ai' | 'workflow-builder' | 'unknown';

/** Who made an LLM call. All records of one scope share the same object. */
export interface LlmCallContext {
	callerType: LlmCallerType;
	workflowId?: string;
	executionId?: string;
	/** Mode of the run that started the work: manual, trigger, webhook, evaluation, ... */
	executionMode?: string;
	nodeName?: string;
	nodeType?: string;
	agentId?: string;
	threadId?: string;
	projectId?: string;
	userId?: string;
}

/** One LLM call as an adapter reports it. */
export interface LlmUsage {
	provider: string;
	/** The model that answered, as the response reports it. */
	model: string;
	/** The provider's own response ID, for example `chatcmpl-...` or `msg_...`. */
	providerResponseId?: string;
	/** All input tokens, cached ones included. */
	inputTokens: number;
	/** All output tokens, reasoning included. */
	outputTokens: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
	startedAt?: Date;
	finishedAt: Date;
	/** `llm` when a model client reports the call, `http` when a captured HTTP response does. */
	subType?: 'llm' | 'http';
}

export interface LlmUsageRecord extends LlmUsage {
	/** Call identity: the same provider call always gets the same ID. */
	id: string;
	context: LlmCallContext;
}

/** Receives every reported call. The llm-usage module sets it at startup. */
export interface LlmUsageSink {
	/** Must not block and must not throw. */
	write(record: LlmUsageRecord): void;
}

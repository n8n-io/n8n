/** What made an LLM call. The `llm_usage` migration checks the same values. */
export type LlmCallerType = 'node' | 'agent' | 'instance-ai' | 'workflow-builder' | 'unknown';

/** Who pays for an LLM call: an n8n credential, or n8n credits when n8n manages the key. */
export type LlmUsageCredential = { id: string } | { managedBy: 'aiGateway' | 'assistant' };

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
	/** The credential of every call in the scope, when they all share one. A call's own wins. */
	credential?: LlmUsageCredential;
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
	/** The credential of this call. It wins over the credential of the scope. */
	credential?: LlmUsageCredential;
}

export interface LlmUsageRecord extends LlmUsage {
	/** Call identity: the same provider call always gets the same ID. */
	id: string;
	context: LlmCallContext;
}

/** What a capture site knows about an LLM call before it sends it. */
export interface LlmGuardedCall {
	context: LlmCallContext;
	credential?: LlmUsageCredential;
	provider?: string;
	model?: string;
}

/** Decides if an LLM call may be sent. Throws to block it. The host sets it at startup. */
export type LlmCallGuard = (call: LlmGuardedCall) => Promise<void>;

/** Receives every reported call. The llm-usage module sets it at startup. */
export interface LlmUsageSink {
	/** Must not block and must not throw. */
	write(record: LlmUsageRecord): void;
}

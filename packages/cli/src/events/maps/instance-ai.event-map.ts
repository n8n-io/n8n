import type { InstanceAiRunLimitReason } from '@n8n/api-types';

export type InstanceAiEventMap = {
	/** One durable-log batch persisted by the writer's per-thread drain. */
	'instance-ai-durable-log-drained': {
		rows: number;
		bytes: number;
	};
	/** publish() enqueue to batch persisted, per published event. */
	'instance-ai-durable-log-queue-latency': {
		ms: number;
	};
	/** (threadId, seq) append collision, retried after a reseed (multi-main). */
	'instance-ai-durable-log-append-conflict': {
		attempt: number;
	};
	/** A batch dropped after exhausting append retries. */
	'instance-ai-durable-log-append-failure': {
		events: number;
	};
	/** An SSE reconnect served a replay from the durable log. */
	'instance-ai-durable-log-replayed': {
		events: number;
		cursorAgeEvents: number;
	};
	/** A getRichMessages read derived agent trees by folding the durable log. */
	'instance-ai-history-folded': {
		latencyMs: number;
		trees: number;
	};
	/**
	 * A new user turn was refused by a concurrency cap. The reason split is the signal for
	 * whether queuing is worth building: `instance_run_limit` refusals mean real users are
	 * colliding on a shared instance, `user_run_limit` refusals do not.
	 */
	'instance-ai-run-refused': {
		reason: InstanceAiRunLimitReason;
	};
	/** The interrupted-run sweep resolved a crashed run. */
	'instance-ai-run-swept': {
		outcome: 'interrupted' | 'crash-resumed';
		toolInterruptedFacts: number;
	};
	'instance-ai-run-finished': {
		/** 'suspended' is a non-terminal HITL segment: usage/tool counts only; the terminal event counts the run. */
		status: 'completed' | 'cancelled' | 'error' | 'suspended';
		/** Wall-clock duration of the run, or undefined when the start time is unknown. */
		durationMs?: number;
		/** Model identifier for built-in providers; 'custom' for OpenAI-compatible/native instances. */
		model: string;
		toolCalls: number;
		toolErrors: number;
		/** Token usage and estimated USD cost, when the run reported usage. */
		usage?: {
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
			costUsd: number;
		};
	};
};

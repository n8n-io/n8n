export type InstanceAiEventMap = {
	'instance-ai-run-finished': {
		/** 'suspended' marks a non-terminal HITL segment — its usage/tool counts must
		 * be recorded when the segment ends or they are lost, but the run itself
		 * continues and is counted once by its terminal event. */
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

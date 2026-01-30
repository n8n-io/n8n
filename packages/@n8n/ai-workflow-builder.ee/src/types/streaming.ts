/**
 * Agent message chunk for streaming
 */
export interface AgentMessageChunk {
	role: 'assistant';
	type: 'message';
	text: string;
}

/**
 * Tool progress chunk for streaming
 */
export interface ToolProgressChunk {
	type: 'tool';
	toolName: string;
	status: string;
	[key: string]: unknown;
}

/**
 * Workflow update chunk for streaming
 */
export interface WorkflowUpdateChunk {
	role: 'assistant';
	type: 'workflow-updated';
	codeSnippet: string;
}

/**
 * Execution request chunk for streaming
 */
export interface ExecutionRequestChunk {
	role: 'assistant';
	type: 'execution-requested';
	reason: string;
}

/**
 * Questions chunk for Plan Mode streaming
 */
export interface QuestionsChunk {
	type: 'questions';
	introMessage?: string;
	questions: Array<{
		id: string;
		question: string;
		type: 'single' | 'multi' | 'text';
		options?: string[];
		allowCustom?: boolean;
	}>;
}

/**
 * Plan chunk for Plan Mode streaming
 */
export interface PlanChunk {
	type: 'plan';
	plan: {
		summary: string;
		trigger: string;
		steps: Array<{
			description: string;
			subSteps?: string[];
			suggestedNodes?: string[];
		}>;
		additionalSpecs?: string[];
	};
}

/**
 * Answer summary chunk for Plan Mode streaming (shows user's answers)
 */
export interface AnswerSummaryChunk {
	type: 'answer_summary';
	answers: Array<{
		questionId: string;
		question: string;
		answer: string;
	}>;
}

/**
 * Union type for all stream chunks
 */
export type StreamChunk =
	| AgentMessageChunk
	| ToolProgressChunk
	| WorkflowUpdateChunk
	| ExecutionRequestChunk
	| QuestionsChunk
	| PlanChunk
	| AnswerSummaryChunk;

/**
 * Stream output containing messages
 */
export interface StreamOutput {
	messages: StreamChunk[];
}

/**
 * Configuration for stream processing
 */
export interface StreamProcessorConfig {
	/** Thread configuration for retrieving state */
	threadConfig: { configurable: { thread_id: string } };
	/** List of tool names that trigger workflow updates */
	workflowUpdateTools?: string[];
}

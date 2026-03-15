export interface ToolCallDetail {
	name: string;
	status: string;
	args?: Record<string, unknown>;
	result?: string;
	error?: string;
}

export interface Iteration {
	iterationNumber: number;
	durationMs: number;
	inputTokens: number;
	outputTokens: number;
	thinkingTokens: number;
	toolCalls: ToolCallDetail[];
	errors: string;
}

export interface ChecklistItem {
	id: number;
	category: 'structure' | 'data';
	item: string;
}

export interface ChecklistResult {
	id: number;
	pass: boolean;
	reasoning: string;
}

export interface ExecutionNodeOutput {
	items: unknown[];
	outputIndex: number;
}

export interface ExecutionNodeInfo {
	outputs: ExecutionNodeOutput[];
	error?: string;
}

export type ExecutionAssertion =
	| { type: 'succeeds' }
	| { type: 'minExecutedNodes'; min: number }
	| { type: 'outputMatches'; pattern: string; flags?: string }
	| { type: 'nodeTypeExecuted'; nodeType: string };

export interface ExecutionAssertionResult {
	assertion: ExecutionAssertion;
	passed: boolean;
	detail?: string;
}

export interface ExecutionTest {
	input?: unknown[];
	assertions: ExecutionAssertion[];
}

export interface ExecutionData {
	success: boolean;
	error?: string;
	errorNode?: string;
	executedNodes: string[];
	nodeOutputs: Record<string, ExecutionNodeInfo>;
	durationMs: number;
	assertionResults?: ExecutionAssertionResult[];
}

export interface AgentResult {
	prompt: string;
	complexity: PromptConfig['complexity'];
	tags?: string[];
	generatedCode: string;
	workflowJson: string;
	success: boolean;
	totalTimeMs: number;
	/** Time from start to first LLM iteration completing (first onTokenUsage callback) */
	timeToFirstIterationMs: number;
	/** Time from start to first valid workflow being produced (first WorkflowUpdateChunk) */
	timeToFirstValidWorkflowMs: number;
	iterations: Iteration[];
	checklist: ChecklistItem[];
	checklistResults: ChecklistResult[];
	checklistScore: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	linesOfCode: number;
	/** Execution validation results (if workflow was executed) */
	execution?: ExecutionData;
}

export interface PromptConfig {
	text: string;
	complexity: 'simple' | 'medium' | 'complex';
	source: 'manual' | 'n8n-api' | 'synthetic';
	tags?: string[];
	executionTest?: ExecutionTest;
}

export type RunStatus = 'running' | 'completed' | 'failed';

export type RunVariant = 'default' | 'simplified';

export interface Run {
	id: string;
	createdAt: string;
	status: RunStatus;
	config: {
		prompts: PromptConfig[];
		model: string;
		/** Which code generation variant was used. Defaults to 'default' (SDK syntax). */
		variant?: RunVariant;
	};
	results: AgentResult[];
}

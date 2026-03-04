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

export interface AgentResult {
	prompt: string;
	complexity: PromptConfig['complexity'];
	tags?: string[];
	generatedCode: string;
	workflowJson: string;
	success: boolean;
	totalTimeMs: number;
	iterations: Iteration[];
	checklist: ChecklistItem[];
	checklistResults: ChecklistResult[];
	checklistScore: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	linesOfCode: number;
}

export interface PromptConfig {
	text: string;
	complexity: 'simple' | 'medium' | 'complex';
	source: 'manual' | 'n8n-api' | 'synthetic';
	tags?: string[];
}

export type RunStatus = 'running' | 'completed' | 'failed';

export interface Run {
	id: string;
	createdAt: string;
	status: RunStatus;
	config: {
		prompts: PromptConfig[];
		model: string;
	};
	results: AgentResult[];
}

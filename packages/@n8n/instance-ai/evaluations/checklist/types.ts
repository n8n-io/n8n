// ---------------------------------------------------------------------------
// Shared shapes (same as builder eval)
// ---------------------------------------------------------------------------

export interface ChecklistItem {
	id: number;
	category: 'structure' | 'data' | 'behavior';
	item: string;
}

export interface ChecklistResult {
	id: number;
	pass: boolean;
	reasoning: string;
}

// ---------------------------------------------------------------------------
// Instance-AI specific types
// ---------------------------------------------------------------------------

export interface CapturedEvent {
	timestamp: number;
	type: string;
	data: Record<string, unknown>;
}

export interface CapturedToolCall {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
	durationMs: number;
}

export interface AgentActivity {
	agentId: string;
	role: string;
	parentId?: string;
	toolCalls: CapturedToolCall[];
	textContent: string;
	reasoning: string;
	status: string;
}

export interface InstanceAiMetrics {
	totalTimeMs: number;
	timeToFirstTextMs: number;
	timeToRunFinishMs: number;
	totalToolCalls: number;
	subAgentsSpawned: number;
	confirmationRequests: number;
	agentActivities: AgentActivity[];
	events: CapturedEvent[];
}

export interface WorkflowSummary {
	id: string;
	name: string;
	nodeCount: number;
	active: boolean;
}

export interface ExecutionSummary {
	id: string;
	workflowId: string;
	status: string;
}

export interface AgentOutcome {
	workflowsCreated: WorkflowSummary[];
	executionsRun: ExecutionSummary[];
	dataTablesCreated: string[];
	finalText: string;
	/** Full workflow JSON for each created workflow (for report preview) */
	workflowJsons: Record<string, unknown>[];
}

export interface InstanceAiResult {
	prompt: string;
	complexity: PromptConfig['complexity'];
	tags?: string[];
	success: boolean;
	runId: string;
	threadId: string;
	metrics: InstanceAiMetrics;
	outcome: AgentOutcome;
	checklist: ChecklistItem[];
	checklistResults: ChecklistResult[];
	checklistScore: number;
	error?: string;
}

export type PromptDataset = 'general' | 'builder';

export interface PromptConfig {
	text: string;
	complexity: 'simple' | 'medium' | 'complex';
	source: 'manual' | 'synthetic';
	tags?: string[];
	/** Which LangSmith dataset this prompt belongs to */
	dataset?: PromptDataset;
	expectedOutcome?: {
		workflowCreated?: boolean;
		workflowExecuted?: boolean;
		minToolCalls?: number;
		expectedTools?: string[];
	};
}

export type RunStatus = 'running' | 'completed' | 'failed';

export interface Run {
	id: string;
	createdAt: string;
	status: RunStatus;
	config: {
		prompts: PromptConfig[];
		n8nBaseUrl: string;
	};
	results: InstanceAiResult[];
}

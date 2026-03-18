// ---------------------------------------------------------------------------
// Shared shapes (same as builder eval)
// ---------------------------------------------------------------------------

export interface ChecklistItem {
	id: number;
	category: 'structure' | 'data' | 'behavior' | 'execution';
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

export interface NodeOutputData {
	nodeName: string;
	data: Record<string, unknown>[];
}

export interface ExecutionSummary {
	id: string;
	workflowId: string;
	status: string;
	error?: string;
	failedNode?: string;
	triggeredByEval?: boolean;
	outputData?: NodeOutputData[];
}

export interface AgentOutcome {
	workflowsCreated: WorkflowSummary[];
	executionsRun: ExecutionSummary[];
	dataTablesCreated: string[];
	finalText: string;
	/** Full workflow JSON for each created workflow (for report preview) */
	workflowJsons: Record<string, unknown>[];
}

export interface ChatToolCall {
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	toolCalls: ChatToolCall[];
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
	chatMessages?: ChatMessage[];
	checklist: ChecklistItem[];
	checklistResults: ChecklistResult[];
	checklistScore: number;
	executionChecklist: ChecklistItem[];
	executionChecklistResults: ChecklistResult[];
	executionChecklistScore: number;
	error?: string;
}

export type PromptDataset = 'general' | 'builder';

export interface PromptConfig {
	text: string;
	complexity: 'simple' | 'medium' | 'complex';
	source: 'manual' | 'synthetic';
	tags?: string[];
	/** Credential type IDs this prompt needs seeded (e.g. 'slackApi', 'notionApi') */
	requiredCredentials?: string[];
	/** Which LangSmith dataset this prompt belongs to */
	dataset?: PromptDataset;
	expectedOutcome?: {
		workflowCreated?: boolean;
		workflowExecuted?: boolean;
		minToolCalls?: number;
		expectedTools?: string[];
	};
}

// ---------------------------------------------------------------------------
// Execution evaluation types
// ---------------------------------------------------------------------------

export interface ExecutionTestInput {
	/** What kind of data to inject as pin data */
	triggerType: 'webhook' | 'form' | 'manual' | 'schedule';
	/** The payload body (webhook body, form fields, or manual trigger data) */
	testData: Record<string, unknown>;
	/** Human description of what this test does */
	description: string;
}

export interface ExecutionChecklist {
	items: ChecklistItem[];
	testInputs: ExecutionTestInput[];
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

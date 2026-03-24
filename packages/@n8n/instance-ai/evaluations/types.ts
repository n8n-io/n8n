// ---------------------------------------------------------------------------
// Shared types for the instance-ai checklist evaluator
// ---------------------------------------------------------------------------

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Checklist items and verification
// ---------------------------------------------------------------------------

export const checklistCategorySchema = z.enum(['structure', 'data', 'behavior', 'execution']);
export type ChecklistCategory = z.infer<typeof checklistCategorySchema>;

export const verificationStrategySchema = z.enum(['programmatic', 'llm']);
export type VerificationStrategy = z.infer<typeof verificationStrategySchema>;

// ---------------------------------------------------------------------------
// Programmatic check specs
// ---------------------------------------------------------------------------

export const nodeExistsCheckSchema = z.object({
	type: z.literal('node-exists'),
	nodeType: z.string(),
});

export const nodeConnectedCheckSchema = z.object({
	type: z.literal('node-connected'),
	nodeType: z.string(),
});

export const triggerTypeCheckSchema = z.object({
	type: z.literal('trigger-type'),
	expectedTriggerType: z.string(),
});

export const nodeCountGteCheckSchema = z.object({
	type: z.literal('node-count-gte'),
	minCount: z.number(),
});

export const connectionExistsCheckSchema = z.object({
	type: z.literal('connection-exists'),
	sourceNodeType: z.string(),
	targetNodeType: z.string(),
});

export const nodeParameterCheckSchema = z.object({
	type: z.literal('node-parameter'),
	nodeType: z.string(),
	parameterPath: z.string(),
	expectedValue: z.unknown(),
});

export const programmaticCheckSchema = z.discriminatedUnion('type', [
	nodeExistsCheckSchema,
	nodeConnectedCheckSchema,
	triggerTypeCheckSchema,
	nodeCountGteCheckSchema,
	connectionExistsCheckSchema,
	nodeParameterCheckSchema,
]);

export type ProgrammaticCheck = z.infer<typeof programmaticCheckSchema>;

// ---------------------------------------------------------------------------
// Checklist item
// ---------------------------------------------------------------------------

export const checklistItemSchema = z.object({
	id: z.number(),
	description: z.string(),
	category: checklistCategorySchema,
	strategy: verificationStrategySchema,
	check: programmaticCheckSchema.optional(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

// ---------------------------------------------------------------------------
// Checklist result
// ---------------------------------------------------------------------------

export const checklistResultSchema = z.object({
	id: z.number(),
	pass: z.boolean(),
	reasoning: z.string(),
	strategy: verificationStrategySchema,
});

export type ChecklistResult = z.infer<typeof checklistResultSchema>;

// ---------------------------------------------------------------------------
// SSE event capture
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

// ---------------------------------------------------------------------------
// Collected run from SSE
// ---------------------------------------------------------------------------

export interface CollectedRun {
	threadId: string;
	events: CapturedEvent[];
	durationMs: number;
	toolCalls: CapturedToolCall[];
	errors: string[];
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Outcome types
// ---------------------------------------------------------------------------

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

export interface WebhookResponse {
	status: number;
	body: unknown;
}

export interface ExecutionSummary {
	id: string;
	workflowId: string;
	status: string;
	error?: string;
	failedNode?: string;
	triggeredByEval?: boolean;
	outputData?: NodeOutputData[];
	webhookResponse?: WebhookResponse;
}

export interface AgentOutcome {
	workflowsCreated: WorkflowSummary[];
	executionsRun: ExecutionSummary[];
	dataTablesCreated: string[];
	finalText: string;
	workflowJsons: Record<string, unknown>[];
}

export interface EventOutcome {
	workflowIds: string[];
	executionIds: string[];
	dataTableIds: string[];
	finalText: string;
	toolCalls: CapturedToolCall[];
	agentActivities: AgentActivity[];
}

// ---------------------------------------------------------------------------
// Chat message types (for report rendering)
// ---------------------------------------------------------------------------

export interface ChatToolCall {
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
}

export type ChatEntry =
	| { type: 'text'; content: string }
	| { type: 'tool-call'; toolCall: ChatToolCall };

export interface ChatMessage {
	role: 'user' | 'assistant';
	entries: ChatEntry[];
}

// ---------------------------------------------------------------------------
// Execution testing
// ---------------------------------------------------------------------------

export interface ExecutionTestInput {
	triggerType: 'webhook' | 'form' | 'manual' | 'schedule';
	testData: Record<string, unknown>;
	description: string;
	httpMethod?: string;
	path?: string;
}

export interface ExecutionChecklist {
	items: ChecklistItem[];
	testInputs: ExecutionTestInput[];
}

export interface ExecutionTestResult {
	attempted: boolean;
	success: boolean;
	error?: string;
	executionId?: string;
}

// ---------------------------------------------------------------------------
// Dataset / prompt types
// ---------------------------------------------------------------------------

export type PromptDataset = 'general' | 'builder';

export interface PromptConfig {
	text: string;
	complexity: 'simple' | 'medium' | 'complex';
	tags: string[];
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
	expectedCredentials?: string[];
	dataset?: PromptDataset;
}

export interface DatasetExample {
	prompt: string;
	tags: string[];
	complexity: 'simple' | 'medium' | 'complex';
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
	checklist?: ChecklistItem[];
	expectedCredentials?: string[];
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Run persistence
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Feedback (aligned with ai-workflow-builder.ee harness pattern)
// ---------------------------------------------------------------------------

export interface Feedback {
	evaluator: string;
	metric: string;
	score: number;
	comment?: string;
	kind: 'score' | 'metric' | 'detail';
}

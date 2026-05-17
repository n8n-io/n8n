// ---------------------------------------------------------------------------
// Shared types for the instance-ai workflow test case evaluator
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';

import type { WorkflowResponse } from './clients/n8n-client';

// ---------------------------------------------------------------------------
// Checklist items and verification
// ---------------------------------------------------------------------------

export type ChecklistCategory = 'structure' | 'data' | 'behavior' | 'execution';

export type VerificationStrategy = 'programmatic' | 'llm';

export interface ChecklistItem {
	id: number;
	description: string;
	category: ChecklistCategory;
	strategy: VerificationStrategy;
}

export interface ChecklistResult {
	id: number;
	pass: boolean;
	reasoning: string;
	strategy: VerificationStrategy;
	failureCategory?: string;
	rootCause?: string;
}

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
	/** Tool names the sub-agent was spawned with, captured from the `agent-spawned` event payload. */
	tools: string[];
	toolCalls: CapturedToolCall[];
	textContent: string;
	reasoning: string;
	status: string;
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
// Per-turn conversation metrics
// ---------------------------------------------------------------------------

/** Counters for one turn (run-start → run-finish). */
export interface TurnCounter {
	turn: number;
	toolCallCount: number;
	toolErrorCount: number;
	confirmationAskedTotal: number;
	confirmationAskedByKind: Record<string, number>;
	replanAfterErrorCount: number;
	repeatQuestionCount: number;
	runFinishStatus?: string;
}

export interface ConversationMetrics {
	turnCount: number;
	perTurn: TurnCounter[];
	confirmationAskedTotal: number;
	confirmationAskedByKind: Record<string, number>;
	reachedRunFinishCleanly: boolean;
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
	data: Array<Record<string, unknown>>;
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
	workflowJsons: WorkflowResponse[];
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
// Workflow evaluation test cases
// ---------------------------------------------------------------------------

export interface ExecutionScenario {
	name: string;
	description: string;
	/** Instructions for mock data generation — passed as scenario hints to the LLM mock endpoint */
	dataSetup: string;
	/** Criteria the LLM verifier checks against the execution result */
	successCriteria: string;
}

export interface ConversationTurn {
	role: 'user' | 'assistant';
	text: string;
}

export interface WorkflowTestCase {
	/**
	 * Hand-authored conversation that drives the build. Must have ≥1 turn,
	 * and the first turn must be `user`.
	 *
	 * - One user turn, no assistant turns → auto-approve mode (single-prompt build).
	 * - Anything else → multi-turn UserProxyLlm engages (answers clarifications,
	 *   sends follow-ups consuming `messageBudget`).
	 */
	conversation: ConversationTurn[];
	complexity: 'simple' | 'medium' | 'complex';
	tags: string[];
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
	executionScenarios: ExecutionScenario[];
	/** Max follow-up messages the proxy will send. Ignored in auto-approve mode. */
	messageBudget?: number;
}

// ---------------------------------------------------------------------------
// Workflow test case results
// ---------------------------------------------------------------------------

export interface ExecutionScenarioResult {
	scenario: ExecutionScenario;
	success: boolean;
	evalResult?: InstanceAiEvalExecutionResult;
	score: number;
	reasoning: string;
	/** Root cause category when the scenario fails */
	failureCategory?: string;
	/** Detailed root cause explanation */
	rootCause?: string;
}

export interface WorkflowTestCaseResult {
	testCase: WorkflowTestCase;
	workflowId?: string;
	workflowBuildSuccess: boolean;
	buildError?: string;
	executionScenarioResults: ExecutionScenarioResult[];
	/** The built workflow JSON — saved for debugging and cross-run comparison */
	workflowJson?: WorkflowResponse;
	conversationMetrics?: ConversationMetrics;
	threadId?: string;
	conversationTrace?: TraceNode[];
}

// ---------------------------------------------------------------------------
// Conversation trace (pulled from LangSmith after the eval run)
// ---------------------------------------------------------------------------

/** Normalized LangSmith Run record, nested into a tree by parentRunId. */
export interface TraceNode {
	id: string;
	traceId: string;
	parentRunId: string | null;
	name: string;
	runType: string;
	startTime: number;
	endTime: number | null;
	durationMs: number | null;
	error: string | null;
	inputs: unknown;
	outputs: unknown;
	metadata: Record<string, unknown>;
	tokenUsage: { input?: number; output?: number; total?: number } | null;
	children: TraceNode[];
}

// ---------------------------------------------------------------------------
// Multi-run aggregation
// ---------------------------------------------------------------------------

export interface ExecutionScenarioAggregation {
	scenario: ExecutionScenario;
	runs: ExecutionScenarioResult[];
	passCount: number;
	passRate: number;
	/** probability at least 1 of k attempts passes */
	passAtK: number[];
	/** probability all k attempts pass */
	passHatK: number[];
}

export interface TestCaseAggregation {
	testCase: WorkflowTestCase;
	runs: WorkflowTestCaseResult[];
	buildSuccessCount: number;
	executionScenarios: ExecutionScenarioAggregation[];
}

export interface MultiRunEvaluation {
	totalRuns: number;
	testCases: TestCaseAggregation[];
}

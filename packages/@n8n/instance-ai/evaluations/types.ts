// ---------------------------------------------------------------------------
// Shared types for the instance-ai workflow test case evaluator
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult, InstanceAiRunDebugResponse } from '@n8n/api-types';

import type { CheckOutcome } from './binaryChecks/types';
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

export interface BuildTrace {
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

export interface TestCaseCredential {
	/** n8n credential type name, e.g. `slackApi`. Must have a template in credentials/seeder.ts. */
	type: string;
	/** Display name; defaults to the template's name, auto-suffixed on duplicates. */
	name?: string;
}

export interface WorkflowTestCase {
	/** Optional human-readable note on what this case is testing (esp. for behaviour cases). */
	description?: string;
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
	/** Optional NL assertions about the build conversation; LLM-judged and counted toward the
	 *  per-case + headline pass rate alongside execution scenarios (baseline-regression folding
	 *  tracked separately in TRUST-158). */
	buildExpectations?: string[];
	/**
	 * Credentials visible to this case's build. Created for real before the build
	 * and pinned as the thread's entire credential view — cases without this
	 * field build with an empty view (everything mocks).
	 */
	credentials?: TestCaseCredential[];
	/** Logical groupings this case belongs to (e.g. `['pr', 'full']`). Defaults to `['full']`. */
	datasets: string[];
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

/** Verdict for one author-written build expectation. Informational only. */
export interface BuildExpectationResult {
	expectation: string;
	pass: boolean;
	reason: string;
	/** Judge returned no verdict (flaky/partial). Rendered neutrally, kept out of the count. */
	incomplete?: boolean;
}

export interface WorkflowTestCaseResult {
	testCase: WorkflowTestCase;
	/** Source-file slug (matches the PR-comment / comparison label, for consistency). */
	fileSlug?: string;
	workflowId?: string;
	workflowBuildSuccess: boolean;
	buildError?: string;
	executionScenarioResults: ExecutionScenarioResult[];
	/** The built workflow JSON — saved for debugging and cross-run comparison */
	workflowJson?: WorkflowResponse;
	conversationMetrics?: ConversationMetrics;
	threadId?: string;
	transcript?: TranscriptTurn[];
	workflowChecks?: CheckOutcome[];
	/** Captured build-time sub-agent/tool activity for builder debugging. */
	buildTrace?: BuildTrace;
	/** Per-expectation verdicts from the build-expectations judge. Not consumed by pass@k. */
	buildExpectationResults?: BuildExpectationResult[];
	/** Base URL of the n8n instance behind this run. Per-result so multi-lane
	 *  configs each get their own URL for canvas/execution links. */
	n8nBaseUrl?: string;
	/** Per-run LLM step debug captured from the instance-ai debug API after build. */
	runDebug?: InstanceAiRunDebugResponse[];
}

// ---------------------------------------------------------------------------
// Conversation transcript (synthesized from the SSE event stream)
// ---------------------------------------------------------------------------

export interface TranscriptTurn {
	userMessage?: string;
	/** Agent narration and tool interactions, interleaved in the order they occurred. */
	steps: TranscriptStep[];
}

/** One ordered step within a turn: a slice of agent narration or a tool interaction. */
/** Synthetic event type injected into the captured stream at each user-message
 *  send, so the transcript can group an agent's runs (and any resumes, which
 *  each emit their own `run-start`) under the message that triggered them.
 *  Ignored by the metric/outcome consumers (unknown type → default case). */
export const USER_TURN_EVENT = 'eval-user-turn';

export type TranscriptStep = ToolInteraction | { kind: 'agent-text'; text: string };

export type ToolInteraction =
	| { kind: 'plan'; tasks: PlanTask[] }
	| { kind: 'ask-user'; questions: AskUserQuestion[]; answers?: AskUserAnswer[] }
	| {
			kind: 'setup-card';
			requests: SetupCardRequest[];
			/** What the proxy did with the card. */
			outcome: 'filled' | 'skipped' | 'declined' | 'pending';
			/** Parameter names the proxy filled, when outcome is 'filled'. */
			filled?: string[];
	  }
	| {
			kind: 'setup-wizard';
			completedNodes: SetupWizardCompletedNode[];
			skippedNodes: SetupWizardSkippedNode[];
			reason?: string;
	  }
	| {
			kind: 'confirmation';
			toolName: string;
			resumeReason: string;
			approved?: boolean;
			/** Prompt the agent showed when requesting confirmation. */
			message?: string;
			/** Free-text the user sent with their decision (e.g. plan-review feedback). */
			feedback?: string;
	  }
	| {
			kind: 'tool-call';
			toolName: string;
			toolCallId?: string;
			args?: Record<string, unknown>;
			/** Tool output (success) or error message — paired to the call by toolCallId. */
			result?: unknown;
			error?: string;
	  };

export interface PlanTask {
	title?: string;
	description?: string;
}

export interface AskUserQuestion {
	id: string;
	question: string;
	options?: string[];
}

export interface AskUserAnswer {
	questionId: string;
	selectedOptions: string[];
	customText?: string;
	skipped?: boolean;
}

export interface SetupWizardCompletedNode {
	nodeName: string;
	parametersSet?: string[];
}

export interface SetupWizardSkippedNode {
	nodeName: string;
	credentialType?: string;
}

export interface SetupCardRequest {
	nodeName: string;
	credentialType?: string;
	/** Non-credential parameters the card asks the user to fill, by name. */
	params?: string[];
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

/** A build expectation aggregated across runs as a measured unit (granular, alongside scenarios). */
export interface BuildExpectationAggregation {
	expectation: string;
	runs: BuildExpectationResult[];
	/** Runs where the judge returned a verdict (excludes `incomplete`). */
	evaluatedCount: number;
	passCount: number;
	passRate: number;
	passAtK: number[];
	passHatK: number[];
}

export interface TestCaseAggregation {
	testCase: WorkflowTestCase;
	runs: WorkflowTestCaseResult[];
	buildSuccessCount: number;
	executionScenarios: ExecutionScenarioAggregation[];
	/** Build expectations aggregated as measured units (counted in the pass rate). */
	buildExpectations: BuildExpectationAggregation[];
}

export interface MultiRunEvaluation {
	totalRuns: number;
	testCases: TestCaseAggregation[];
}

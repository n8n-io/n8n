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
	/** Non-workflow artifact references (agent, config-eval) captured from the tool-result
	 *  stream — `create_agent`'s agentId and `eval-config` create's owning workflow id. */
	artifactRefs: ArtifactRef[];
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

/** Artifact kinds an eval case can expect a build to produce. */
export const ARTIFACT_TYPES = ['workflow', 'agent', 'config-eval'] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

/** A discovered-but-not-yet-fetched artifact reference. Lives here (not in
 *  harness/artifacts/types) so `outcome/` can produce it without importing back
 *  into `harness/` — that direction is a cycle (harness already imports outcome/). */
export interface ArtifactRef {
	type: ArtifactType;
	id: string;
}

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
	 * Hand-authored conversation that drives the build (≥1 turn, first `user`).
	 * One user turn → auto-approve single-prompt build; more → multi-turn proxy.
	 * Required unless `seedThread` is set, in which case it's optional and
	 * continues after the trace's live turn (`[<live turn>, ...conversation]`).
	 */
	conversation?: ConversationTurn[];
	complexity: 'simple' | 'medium' | 'complex';
	tags: string[];
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
	/** Optional — a build-only case is graded by process/outcome expectations instead. */
	executionScenarios?: ExecutionScenario[];
	/** Max follow-up messages the proxy will send. Ignored in auto-approve mode. */
	messageBudget?: number;
	/** Optional NL assertions about the build CONVERSATION (process: clarifications, push-back,
	 *  ordering). LLM-judged from the transcript; requires a transcript, so skipped in
	 *  prebuilt/MCP runs. Counted toward the per-case + headline pass rate alongside scenarios. */
	processExpectations?: string[];
	/** Optional NL assertions about the resulting WORKFLOW (outcome). LLM-judged from the workflow —
	 *  and, when the build produced a non-workflow artifact (agent, config-eval), from the rendered
	 *  agent/config-eval context injected into the judge. So they also cover artifact existence,
	 *  absence and content ("an agent was created and no workflow", "the agent instructions mention
	 *  escalating refunds"). Also run in prebuilt/MCP runs. Counted toward the pass rate. */
	outcomeExpectations?: string[];
	/**
	 * Credentials visible to this case's build. Created for real before the build
	 * and pinned as the thread's entire credential view — cases without this
	 * field build with an empty view (everything mocks).
	 */
	credentials?: TestCaseCredential[];
	/** Synthetic seed file (messages + workflows) restored before the live turn.
	 *  Synthetic fixtures only; mutually exclusive with the other seeds. */
	seedFile?: string;
	/** Prose turns seeded as plain-text history (no tool calls/workflows).
	 *  Mutually exclusive with `seedFile`. */
	priorConversation?: ConversationTurn[];
	/** Reproduce a real conversation from its LangSmith trace at run time: restore
	 *  up to the live turn (the last user message, or one pinned by `liveTurnRunId`)
	 *  and send that live. Commits only the thread id (workspace auto-discovered;
	 *  `project`/`endpoint` override the source project/tenant). Supplies the live
	 *  turn, so `conversation` is optional. Transient (~14d). */
	seedThread?: { threadId: string; project?: string; endpoint?: string; liveTurnRunId?: string };
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
	/** Workflow actually executed for this scenario, after multi-workflow routing. */
	workflowId?: string;
	score: number;
	reasoning: string;
	/** Root cause category when the scenario fails */
	failureCategory?: string;
	/** Detailed root cause explanation */
	rootCause?: string;
	/** Verifier returned no verdict after all attempts (infra failure, not a
	 *  workflow failure). Rendered visibly but kept out of the pass-rate count,
	 *  mirroring `BuildExpectationResult.incomplete`. */
	incomplete?: boolean;
}

/** Verdict for one author-written build expectation. Scored as a unit in the
 *  pass rate alongside execution scenarios. */
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
	/** Per-expectation verdicts from the build-expectations judge. Aggregated as
	 *  scoring units alongside execution scenarios. */
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
	/** True for turns restored from a conversation seed — context that predates
	 *  the evaluated run, as opposed to behaviour captured live. */
	seeded?: boolean;
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
	/** Runs where the verifier returned a verdict (excludes `incomplete`). */
	evaluatedCount: number;
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

/**
 * Whether a case produced any scoreable verdict across its runs.
 * - `verified`  — at least one scenario or build expectation was evaluated.
 * - `notVerified` — every measured unit came back incomplete / was skipped (no
 *   transcript for process expectations, verifier gaps for scenarios), so nothing
 *   could actually be checked. Such a case MUST NOT roll up as a silent pass.
 */
export type CaseVerificationStatus = 'verified' | 'notVerified';

export interface TestCaseAggregation {
	testCase: WorkflowTestCase;
	runs: WorkflowTestCaseResult[];
	buildSuccessCount: number;
	executionScenarios: ExecutionScenarioAggregation[];
	/** Build expectations aggregated as measured units (counted in the pass rate). */
	buildExpectations: BuildExpectationAggregation[];
	/** `notVerified` when no unit (scenario or expectation) was evaluated across
	 *  all runs — nothing could be checked, so the case is not a pass. */
	status: CaseVerificationStatus;
}

export interface MultiRunEvaluation {
	totalRuns: number;
	testCases: TestCaseAggregation[];
}

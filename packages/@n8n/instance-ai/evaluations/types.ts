// ---------------------------------------------------------------------------
// Shared types for the instance-ai workflow test case evaluator
// ---------------------------------------------------------------------------

import type {
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalExecutionResult,
	InstanceAiEvalSeedDataTable,
	InstanceAiRunDebugResponse,
} from '@n8n/api-types';

import type { CheckOutcome } from './binaryChecks/types';
import type { WorkflowResponse } from './clients/n8n-client';
import type { EvalAttribution } from './harness/attribution';
import type { CaseSeed } from './harness/schema';

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
	/** Typed data tables to create + row-seed before the scenario executes
	 *  (TRUST-311). Seeded under their exact declared names so the built
	 *  workflow's by-name data-table references resolve. */
	seedDataTables?: InstanceAiEvalSeedDataTable[];
}

export interface ConversationTurn {
	role: 'user' | 'assistant';
	text: string;
	/** Hand the agent a seeded workflow with this turn (opening turn only), the way
	 *  the editor does when a user opens the assistant with a workflow in front of
	 *  them. `workflow` is the id as the seed declares it; the harness swaps in the
	 *  per-run remapped id. See `ConversationTurnSchema`. */
	attach?: { workflow: string };
}

export interface TestCaseCredential {
	/** n8n credential type name, e.g. `slackApi`. Must have a template in credentials/seeder.ts. */
	type: string;
	/** Display name; defaults to the template's name, auto-suffixed on duplicates. */
	name?: string;
	/** Defaults to true. false models a credential that was already broken before
	 *  the conversation started (expired/revoked/scope-changed) — left off the
	 *  connection-test bypass list, so its real test runs and fails. Distinct from
	 *  a credential set up on a card mid-conversation (UserProxyLlm), which always
	 *  passes. */
	valid?: boolean;
	/** Defaults to false. true models a credential the user saved without filling
	 *  anything in — seeded with no field values, and kept off the connection-test
	 *  bypass so nothing resolves it as working. The shape behind a re-offered
	 *  empty generic-auth credential.
	 *
	 *  DOES NOT SURVIVE A LANG-TRACER PUSH yet. Its case-write schema validates
	 *  each credential against a non-strict `z.object({ type, name, valid })`
	 *  (lang-tracer `packages/server/src/lib/case-writes.ts`), so this key is
	 *  silently stripped and the suite copy seeds a FILLED credential instead —
	 *  a case relying on it then fails in CI for a reason unrelated to the
	 *  product. `eval:langtracer-push` catches it (`did not store credentials`,
	 *  non-zero exit); until lang-tracer declares the field, a case using it
	 *  lives on disk. */
	blank?: boolean;
}

export interface WorkflowTestCase {
	/** Optional human-readable note on what this case is testing (esp. for behaviour cases). */
	description?: string;
	/**
	 * Hand-authored conversation that drives the build (≥1 turn, first `user`).
	 * One user turn → auto-approve single-prompt build; more → multi-turn proxy.
	 * Required unless `seed.mode` is `replay`, in which case it's optional and
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
	/** Build style the harness sends with every chat message of this case.
	 *  Absent → `progressive` (evals mirror the product default); `default`
	 *  opts the case back into the classic single-pass flow. */
	buildMode?: 'progressive' | 'default';
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
	/** Opts into the credential-setup BROWSER lane and picks what it talks to:
	 *  a shipped fixture id (hermetic lookalike) or `local` (the REAL provider
	 *  site in the developer's own Chrome). Omitted → no browser lane; absence
	 *  never means real internet. */
	credentialFixture?: string;
	/** History restored before the live turn, in one slot so the modes can't
	 *  overlap: `mode: 'inline'` carries the messages (and the workflows/tables
	 *  they reference) in the case body; `mode: 'replay'` reconstructs them from a
	 *  LangSmith trace at run time and supplies the live turn itself, which is why
	 *  `conversation` is optional for it. See `harness/schema.ts`. */
	seed?: CaseSeed;
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
	/** Set when the scenario ran against a first-class Agent instead of a workflow. */
	agentEvalResult?: InstanceAiEvalAgentExecutionResult;
	/** Agent the scenario executed, for agent-artifact cases. */
	agentId?: string;
	/** Workflow actually executed for this scenario, after multi-workflow routing. */
	workflowId?: string;
	score: number;
	reasoning: string;
	/** Root cause category when the scenario fails. Free-form on purpose: it
	 *  carries whatever the LLM verifier picked, and older harness commits used
	 *  a different spelling. Read `attribution` for the meaning. */
	failureCategory?: string;
	/** Detailed root cause explanation */
	rootCause?: string;
	/** Who owns this failure — the harness's own verdict, and what LangTracer
	 *  stores. Undefined on a pass. See `harness/attribution.ts`. */
	attribution?: EvalAttribution;
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
	/** Who owns a failed expectation. Stamped where the verdicts are attached to
	 *  a row (the only place that also knows whether the build died on infra). */
	attribution?: EvalAttribution;
}

export interface WorkflowTestCaseResult {
	testCase: WorkflowTestCase;
	/** Source-file slug (matches the PR-comment / comparison label, for consistency). */
	fileSlug?: string;
	workflowId?: string;
	/** Agent the case's scenarios executed (agent-artifact cases). */
	agentId?: string;
	/** Rendered agent config + skills — the agent analog of `workflowJson`, for the report. */
	agentArtifactContext?: string;
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
	/** `claude` build spend in USD for this iteration's build (--build-via-mcp only). */
	buildCostUsd?: number;
	/** Assistant turns across the `claude` build's attempts (--build-via-mcp only). */
	buildTurns?: number;
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
			/** Left unconfigured — nobody has filled these in yet. */
			nodesStillNeedingSetup: SetupWizardSkippedNode[];
			/** Actively dismissed by the user, which the assistant must not ask about again. */
			skippedByUser?: SetupWizardSkippedNode[];
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

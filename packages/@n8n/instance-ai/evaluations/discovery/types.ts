// ---------------------------------------------------------------------------
// Tool-discovery scenario types — guards browser/computer-use discoverability.
//
// Discovery scenarios run the orchestrator against a user message that should
// (or should not) cause a specific tool / sub-agent to be reached for, and
// assert the captured events match the expectation. Workflow-build scenarios
// in evaluations/data/workflows/ assert the *output workflow*; discovery
// scenarios assert the *agent's tool/dispatch behavior*.
// ---------------------------------------------------------------------------

import type { DiscoveryMcpState } from './stub-mcp-registry';
import type { ComputerUseState } from '../../src/types';
import type { CaseSeed } from '../harness/schema';

/**
 * Pass condition for tool invocations.
 *
 * - `anyOf` — pass if at least one of the listed tool names was invoked
 *   (top-level orchestrator call, or via a spawned sub-agent's tool list).
 * - `noneOf` — pass only if NONE of the listed tool names was invoked.
 *   Used for negative scenarios that guard against over-eager invocation.
 * - `anyOfToolCalls` — pass if at least one listed actual tool call happened.
 *   Unlike `anyOf`, this can check serialized tool args.
 * - `allOfToolCalls` — pass only if EVERY listed actual tool call happened.
 *   Unlike `anyOf`, this checks completed/errored tool calls only; a spawned
 *   sub-agent having the tool available does not count as a match.
 * - `noneOfToolCalls` — pass only if NONE of the listed tool calls happened.
 *   Unlike `noneOf`, this checks actual tool calls only; a spawned sub-agent
 *   having the tool available does not count as a violation.
 *
 * Both forms accept a sub-agent role prefix `spawn_sub_agent:<role>` to match
 * an `agent-spawned` event whose role equals `<role>`.
 */
export interface ForbiddenToolCall {
	toolName: string;
	/** Deep-partial match: listed keys must match, extra keys ignored, pattern
	 *  arrays matched as subsets. Prefer this for schema'd fields — a substring
	 *  can't tell a value from the same word in a free-text sibling. */
	args?: Record<string, unknown>;
	/** Case-insensitive substrings over the serialized args, for free-text
	 *  fields. Combines with `args`; both must hold on the same call. */
	argsContainAny?: string[];
	/** Match a call the user refused (an approval-gated tool resuming with
	 *  `{ declined: true }`) instead of one that ran. Defaults to false, so an
	 *  expectation never matches a refusal by accident. */
	declined?: boolean;
}

export interface ExpectedToolInvocations {
	anyOf?: string[];
	noneOf?: string[];
	anyOfToolCalls?: ForbiddenToolCall[];
	allOfToolCalls?: ForbiddenToolCall[];
	noneOfToolCalls?: ForbiddenToolCall[];
}

/**
 * Optional instance configuration overrides for a discovery scenario.
 * Mirrors a subset of `SystemPromptOptions` so a scenario can pin the gateway
 * status (e.g. `disabledGlobally` to test the "explain how to enable" branch).
 */
export interface DiscoveryInstanceState {
	computerUse?: ComputerUseState;
	mcp?: DiscoveryMcpState;
	/** Turn the folder-exploration capability on for the run (default off). */
	folderExploration?: boolean;
}

export type ConfirmationDecision = 'approve' | 'deny';

export interface ConfirmationAnswer {
	decision: ConfirmationDecision;
	resumeWith?: Record<string, unknown>;
}

// Keyed by the suspending tool's name
export type DiscoveryConfirmations = Record<string, ConfirmationDecision | ConfirmationAnswer>;

export interface DiscoveryTestCase {
	/** Unique scenario identifier — also used as the scenario filename (without .json). */
	id: string;
	/** The user message sent to the orchestrator. */
	userMessage: string;
	/** Optional instance state overrides applied when constructing the agent. */
	instanceState?: DiscoveryInstanceState;
	/** Answers for the tools listed; every other suspension is approved. */
	confirmations?: DiscoveryConfirmations;
	/** Pass condition. At least one expectation key is required. */
	expectedToolInvocations: ExpectedToolInvocations;
	/** Free-form note explaining what regression this scenario protects against. */
	rationale?: string;
	/** Override the runner step cap when orchestrator-inline work needs more iterations. */
	maxSteps?: number;
	/** Override the runner timeout when a scenario needs more time. */
	timeoutMs?: number;
}

/** The inline seed a routing case restores into the stub instance before its turn. */
export type RoutingSeed = Extract<CaseSeed, { mode: 'inline' }>;

/** The seeded workflow or Agent the user had open when they sent the message. */
export type RoutingAttachment = { workflow: string } | { agent: string };

/** What the runner needs from a case. Routing cases have no tool expectations:
 *  the routing grader reads the recorded calls afterwards. */
export type DiscoveryScenario = Omit<DiscoveryTestCase, 'expectedToolInvocations'> &
	Partial<Pick<DiscoveryTestCase, 'expectedToolInvocations'>> & {
		/** Routing cases only: state the stub instance holds before the turn. */
		seed?: RoutingSeed;
		/** Routing cases only: sent with the message the way the editor hands it off. */
		attach?: RoutingAttachment;
	};

export type DiscoveryStreamStatus =
	| 'completed'
	| 'errored'
	| 'timed-out'
	| 'suspended'
	| 'step-exhausted'
	/** `--stop-on-route` ended the run at its first committing call. */
	| 'stopped-on-route';

export interface DiscoveryTrialFacts {
	streamStatus: DiscoveryStreamStatus;
	timeoutMs: number;
	runError?: string;
	unmatchedConfirmations: string[];
}

export interface DiscoveryCheckResult {
	pass: boolean;
	/** Human-readable reason — included in failure reports. */
	comment: string;
	/** Tool names actually invoked during the run (top-level + via sub-agents). */
	invokedTools: string[];
	/** `spawn_sub_agent:<role>` markers for every spawned sub-agent. */
	spawnedAgents: string[];
}

// ---------------------------------------------------------------------------
// Routing results (`--json-out`), read by `evaluations/routing/grade.ts`.
// ---------------------------------------------------------------------------

export type RoutingToolCallStatus = 'completed' | 'errored' | 'pending';

export interface RoutingToolCall {
	toolName: string;
	args: Record<string, unknown>;
	status: RoutingToolCallStatus;
	error?: string;
}

export interface RoutingSubAgentToolCall extends RoutingToolCall {
	agentRole: string;
}

export interface RoutingAskUserQuestion {
	question: string;
	options: string[];
	introMessage?: string;
}

export interface RoutingTrialUsage {
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
}

export interface RoutingTrialRecord {
	trial: number;
	durationMs: number;
	streamStatus: DiscoveryStreamStatus;
	/** Orchestrator calls in call order, up to and including the stop call. */
	toolCalls: RoutingToolCall[];
	/** Calls made by sub-agents. The route is read from `toolCalls` only. */
	subAgentToolCalls: RoutingSubAgentToolCall[];
	/** The committing call that ended the trial under `--stop-on-route`. */
	stoppedOn?: { toolName: string; args: Record<string, unknown> };
	spawnedAgents: string[];
	skillsLoaded: string[];
	askUserQuestions: RoutingAskUserQuestion[];
	/** Orchestrator text after its last tool call, else its last non-empty text segment. */
	finalText: string;
	/** Every orchestrator text segment, in order, joined by blank lines. */
	fullText: string;
	/** Orchestrator tokens only; sub-agent usage is not included. */
	usage?: RoutingTrialUsage;
	runError?: string;
}

export interface RoutingCaseResult {
	id: string;
	bucket?: string;
	accepts?: string[];
	policyDependent?: boolean;
	userMessage: string;
	trials: RoutingTrialRecord[];
}

export interface RoutingResultsFile {
	runId: string;
	variant: string;
	model: string;
	/** `--skill-file` replacements by skill id; absent when the run used the bundled skills. */
	skillOverrides?: Record<string, { path: string; sha256: string }>;
	trialsPerCase: number;
	stopOnRoute: boolean;
	startedAt: string;
	finishedAt: string;
	/** False while the run is still going; the file is rewritten after each case. */
	complete: boolean;
	cases: RoutingCaseResult[];
}

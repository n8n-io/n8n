// ---------------------------------------------------------------------------
// Computer-use evaluation: shared types
//
// A scenario JSON describes a prompt, optional sandbox/workflow setup, and
// graders. The runner pre-cleans, snapshots n8n state, seeds fixtures, runs
// chat over SSE, grades, then restores n8n via snapshot diff (see runner.ts).
// The gateway daemon stays running across scenarios; disk sandbox cleanup is
// manual unless you wipe the directory yourself.
// ---------------------------------------------------------------------------

import type { CapturedEvent, CapturedToolCall } from '../types';
import type { TokenStats } from './tokens';

// ---------------------------------------------------------------------------
// Scenario specification (JSON)
// ---------------------------------------------------------------------------

export type ScenarioCategory =
	| 'filesystem-read'
	| 'filesystem-write'
	| 'shell'
	| 'browser'
	| 'proposal'
	| 'meta';

export interface ScenarioSetup {
	/** Files to copy into the sandbox before the prompt runs. Paths are relative to evaluations/computer-use/fixtures/. */
	seedFiles?: Array<{ from: string; to: string }>;
	/** Workflow JSON file to import via REST before the prompt. Path is relative to evaluations/computer-use/fixtures/. */
	seedWorkflow?: string;
	/** When true, activate the seeded workflow (needed for form trigger / webhook scenarios). */
	activateSeededWorkflow?: boolean;
}

export interface ScenarioBudgets {
	/** Hard cap on total tool calls observed in the SSE trace. */
	maxToolCalls?: number;
	/** Hard cap on duration of the chat run, in ms. */
	maxDurationMs?: number;
}

// ---------------------------------------------------------------------------
// Grader specifications — discriminated union, matched by `type`
// ---------------------------------------------------------------------------

export interface TraceMustCallToolGrader {
	type: 'trace.mustCallTool';
	/** Substring or exact tool name. Matches if any tool call's name includes this string. */
	name: string;
}

export interface TraceMustNotCallToolGrader {
	type: 'trace.mustNotCallTool';
	name: string;
}

export interface TraceMustCallMcpServerGrader {
	type: 'trace.mustCallMcpServer';
	/** Currently only "computer-use" is supported. Detects by tool-name prefix match. */
	server: 'computer-use';
}

export interface TraceMustNotCallMcpServerGrader {
	type: 'trace.mustNotCallMcpServer';
	server: 'computer-use';
}

export interface TraceMustNotLoopGrader {
	type: 'trace.mustNotLoop';
	/** Fail if any tool+args combo is repeated more than this many times consecutively. Default: 3. */
	maxRepeatedCall?: number;
}

export interface TraceBudgetGrader {
	type: 'trace.budget';
	maxToolCalls?: number;
	maxDurationMs?: number;
	/** Cap on the sum of estimated tokens across all tool results in this run. */
	maxToolResultTokensEst?: number;
	/** Cap on any single tool result's estimated token count — catches one runaway browser_snapshot. */
	maxSingleToolResultTokensEst?: number;
}

export interface TraceFinalTextMatchesGrader {
	type: 'trace.finalTextMatches';
	/** Pass if the agent's final text matches at least one of these (case-insensitive) regexes. */
	anyOf: string[];
	/** Pass only if every regex matches. Combined with anyOf when both are present. */
	allOf?: string[];
	/**
	 * Fail if any of these (case-insensitive) regexes hit. Use to catch
	 * abandonment phrases like "taking a while" / "couldn't load" / "unable
	 * to reach" that pass `anyOf` keyword checks but actually mean the agent
	 * gave up. Scanned against only the trailing slice of `finalText` (last
	 * ~1500 chars), so legitimate mid-flight pivot phrases like "let me try
	 * a different approach" don't false-positive — the agent often says that
	 * en route to success, and `finalText` is the concatenation of every
	 * text-delta event in the run, not just the closing message.
	 */
	mustNotMatch?: string[];
}

/**
 * Pass if any browser-family tool call's URL-like args match the given
 * regex (case-insensitive). Outcome-shaped — agnostic to which navigation
 * tool got there (`browser_navigate`, `browser_tab_open`, etc.).
 *
 * Matches intent, not arrival: a navigation that ultimately timed out still
 * passes this. Pair with `trace.toolsMustNotError` to assert the navigation
 * actually succeeded.
 */
export interface TraceMustReachUrlGrader {
	type: 'trace.mustReachUrl';
	/** Regex pattern (applied case-insensitively) tested against URL-like args. */
	pattern: string;
	/**
	 * Optional substring filter on toolName. Default 'browser' covers
	 * browser_navigate, browser_tab_open, browser-credential-setup, etc.
	 */
	toolNamePrefix?: string;
}

/**
 * Default-on for any scenario tagged `requires:browser-bootstrap`. Inspects
 * `CapturedToolCall.error` and fails when a tool reports an error (e.g. a
 * `browser_navigate` that timed out). Pair with `trace.mustReachUrl` for an
 * "actually arrived" guarantee — `mustReachUrl` matches intent, this matches
 * outcome.
 */
export interface TraceToolsMustNotErrorGrader {
	type: 'trace.toolsMustNotError';
	/** Default 0. Fail if the count of tool calls with `error` set exceeds this. */
	maxErrors?: number;
	/** Optional substring filter on toolName. Default 'browser' covers browser_navigate, browser_tab_open, browser-credential-setup. */
	toolNamePrefix?: string;
	/** Tool names exempted from the count. Defaults to ['ask-user', 'pause-for-user'] — those legitimately "interrupt" rather than fail. */
	ignoreTools?: string[];
}

export interface FsFileExistsGrader {
	type: 'fs.fileExists';
	/** Glob relative to the sandbox dir. */
	glob: string;
}

/**
 * Inverse of `fs.fileExists`. Pass when no file matches the glob inside the
 * sandbox. Useful for asserting that a "move" actually deleted the source
 * file rather than copying it.
 */
export interface FsFileNotExistsGrader {
	type: 'fs.fileNotExists';
	/** Glob relative to the sandbox dir. */
	glob: string;
}

export interface FsFileMatchesGrader {
	type: 'fs.fileMatches';
	/** Glob relative to the sandbox dir. */
	glob: string;
	/** Matches if file content (utf-8) matches at least one of these regex patterns. */
	anyOf: string[];
	/** Matches only if file content matches every one of these patterns. */
	allOf?: string[];
}

/**
 * Default-on trip-wire that fails if known credential shapes leak through the
 * trace. Scans tool args, tool results and final agent text for PEM key
 * headers and common API-key prefixes. Auto-appended to every scenario at
 * scenario-load time — explicit inclusion in a scenario JSON is allowed
 * (e.g. to pass `extraLiterals` for a literal value the scenario should
 * never echo back) but not required.
 */
export interface SecurityNoSecretLeakGrader {
	type: 'security.noSecretLeak';
	/** Optional extra literal strings to scan for, in addition to built-in patterns. */
	extraLiterals?: string[];
}

export type Grader =
	| TraceMustCallToolGrader
	| TraceMustNotCallToolGrader
	| TraceMustCallMcpServerGrader
	| TraceMustNotCallMcpServerGrader
	| TraceMustNotLoopGrader
	| TraceBudgetGrader
	| TraceFinalTextMatchesGrader
	| TraceMustReachUrlGrader
	| TraceToolsMustNotErrorGrader
	| FsFileExistsGrader
	| FsFileNotExistsGrader
	| FsFileMatchesGrader
	| SecurityNoSecretLeakGrader;

// ---------------------------------------------------------------------------
// Scenario file shape
// ---------------------------------------------------------------------------

export interface Scenario {
	id: string;
	category: ScenarioCategory;
	prompt: string;
	setup?: ScenarioSetup;
	/** Human-readable limits for scenario authors; enforcement uses a `trace.budget` grader. */
	budgets?: ScenarioBudgets;
	graders: Grader[];
	tags?: string[];
}

// ---------------------------------------------------------------------------
// Runtime trace + grading
// ---------------------------------------------------------------------------

/**
 * One confirmation request the agent surfaced during a run. Captured even
 * though the harness auto-approves — preserves the signal for retroactive
 * grading and debugging "why did this scenario take 8 minutes?".
 */
export interface CapturedConfirmation {
	requestId: string;
	timestamp: number;
	/** Best-effort: the human-readable summary the agent attached to the request. */
	summary?: string;
	/** Auto-approved decision the harness sent back. Always `true` in PoC. */
	autoApproved: boolean;
}

/** The slice of a chat run available to graders. */
export interface ScenarioTrace {
	events: CapturedEvent[];
	toolCalls: CapturedToolCall[];
	confirmations: CapturedConfirmation[];
	finalText: string;
	durationMs: number;
	tokens: TokenStats;
	/** ID of the chat thread the run executed in. Used by post-run cleanup. */
	threadId: string;
}

export interface GraderResult {
	grader: Grader;
	pass: boolean;
	/** Human-readable explanation. Always populated; required when pass=false. */
	reason: string;
}

export interface ScenarioResult {
	scenario: Scenario;
	pass: boolean;
	graderResults: GraderResult[];
	durationMs: number;
	toolCallCount: number;
	/** Tool names called, in order, with per-call token estimates. */
	toolCalls: Array<{
		name: string;
		args: Record<string, unknown>;
		argTokensEst: number;
		resultTokensEst: number;
	}>;
	/** Run-level token estimates (estimated:true is always set). */
	tokens: TokenStats;
	/** Final text the agent produced (truncated to keep reports small). */
	finalText: string;
	/** Confirmation requests the agent surfaced (and the harness auto-approved). */
	confirmations: CapturedConfirmation[];
	/** Daemon's working directory at the time of the run (where fs graders looked). */
	sandboxDir?: string;
	/** Populated when an unhandled error short-circuits the run (e.g. daemon failed to start). */
	error?: string;
}

/**
 * Minimal provenance recorded at run start. Lets a stale report still answer
 * "what was running when this was captured" without spelunking through git
 * history. Intentionally narrow — model id, OS and per-grader versioning
 * deferred until a full reproducibility pass becomes worth it.
 */
export interface RunManifest {
	/** Repo HEAD SHA, with `-dirty` suffix if the worktree had uncommitted changes. */
	gitRef: string;
	/** Version field from `@n8n/computer-use` package.json. */
	daemonVersion: string;
	/** Version field from the n8n CLI package.json (the user-facing n8n version). */
	n8nVersion: string;
}

export interface RunReport {
	manifest: RunManifest;
	startedAt: string;
	finishedAt: string;
	totalScenarios: number;
	passCount: number;
	results: ScenarioResult[];
}

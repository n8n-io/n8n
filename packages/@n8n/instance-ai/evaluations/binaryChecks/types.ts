// ---------------------------------------------------------------------------
// Binary check types for instance-ai workflow evaluation
//
// Binary checks are pass/fail assertions on a built workflow.
// Deterministic checks run without LLM calls; LLM checks call an eval agent.
// Each produces a Feedback item with score 0 or 1.
// ---------------------------------------------------------------------------

import type { WorkflowResponse } from '../clients/n8n-client';

/**
 * Result of a single binary check.
 */
export interface BinaryCheckResult {
	pass: boolean;
	comment?: string;
	/** Omitted = true. `false` = no subject in this workflow (excluded from pass-rate denominator). */
	applicable?: boolean;
	/**
	 * `true` = the check could not be measured (e.g. judge timeout). Excluded
	 * from the pass-rate denominator like N/A, but reported separately so
	 * infra flakiness stays distinguishable from genuine inapplicability.
	 */
	errored?: boolean;
}

/**
 * Context available to every binary check.
 *
 * Deterministic checks only need `prompt`. LLM checks additionally need
 * `modelId` to create an eval agent. Add fields here only when a check
 * genuinely needs external context.
 */
export interface BinaryCheckContext {
	/** The original user prompt that triggered the build */
	prompt: string;
	/** Anthropic model ID for LLM checks (e.g. 'anthropic/claude-sonnet-4-6'). LLM checks are skipped when absent. */
	modelId?: string;
	/** Timeout in ms for LLM checks. Defaults to 30_000. */
	timeoutMs?: number;
	/** The agent's narration across the conversation (used by the response_describes_changes_accurately check) */
	agentTextResponse?: string;
	/**
	 * The workflow at the start of the conversation, before the agent's changes
	 * (used by response_describes_changes_accurately). Empty for from-scratch
	 * builds — set only when a conversation starts from an existing workflow.
	 */
	workflowBefore?: WorkflowResponse;
	/** Per-test-case annotations forwarded from fixtures. Used by checks that opt into fixture-side overrides. */
	annotations?: Record<string, unknown>;
	/**
	 * Per-live-turn count of build-workflow calls that FAILED (errored / returned
	 * success:false) — error-forced rebuilds, the universal thrash signal (see
	 * `failedBuildsPerTurn`). Absent when there's no build transcript
	 * (e.g. prebuilt-workflow scoring).
	 */
	failedBuildsPerTurn?: number[];
}

/**
 * WHAT-side rubric dimensions for the workflow artifact. The order here
 * drives sort order in reports. The execution verifier covers a separate
 * `execution_outcome` dimension that lives outside this binary-check suite.
 */
export const CHECK_DIMENSIONS = [
	'structure',
	'connection_topology',
	'parameter_correctness',
	'intent_match',
	'communication',
	'ai_nodes',
	'nodes_craftsmanship',
	'efficiency',
	'security',
] as const;

export type CheckDimension = (typeof CHECK_DIMENSIONS)[number];

/**
 * A single check that inspects a workflow and returns pass/fail.
 */
export interface BinaryCheck {
	/** Unique identifier used as the Feedback metric name */
	name: string;
	/** Human-readable description for reports */
	description: string;
	/** Whether this check requires an LLM call */
	kind: 'deterministic' | 'llm';
	/** WHAT-side rubric dimension this check contributes to. */
	dimension: CheckDimension;
	run(
		workflow: WorkflowResponse,
		ctx: BinaryCheckContext,
	): BinaryCheckResult | Promise<BinaryCheckResult>;
}

// ---------------------------------------------------------------------------
// Outcomes — projected per check after a run
// ---------------------------------------------------------------------------

export type CheckStatus = 'pass' | 'fail' | 'n_a' | 'error';

/** Per-run projection of a BinaryCheck result; surfaced in reports + LangSmith Feedback. */
export interface CheckOutcome {
	name: string;
	description: string;
	kind: 'deterministic' | 'llm';
	dimension: CheckDimension;
	status: CheckStatus;
	comment?: string;
}

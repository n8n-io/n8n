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
	/** The agent's text response (used by response-matches-workflow-changes check) */
	agentTextResponse?: string;
	/** The workflow before the agent's turn (used by response-matches-workflow-changes check) */
	existingWorkflow?: WorkflowResponse;
	/**
	 * Per-test-case annotations that let authors flag false positives
	 * (e.g. `code_necessary: true` for prompts where a Code node is the right answer).
	 * Sourced from the test case JSON's `annotations` field.
	 */
	annotations?: Record<string, unknown>;
}

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
	run(
		workflow: WorkflowResponse,
		ctx: BinaryCheckContext,
	): BinaryCheckResult | Promise<BinaryCheckResult>;
}

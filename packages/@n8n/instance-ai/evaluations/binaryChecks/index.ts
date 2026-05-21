// ---------------------------------------------------------------------------
// Binary checks evaluator for instance-ai
//
// Runs all registered checks against a built workflow and returns both:
//   - `Feedback[]` (for the existing subagent path that emits LangSmith
//     feedback per-check + an overall pass-rate row).
//   - `CheckOutcome[]` (the universal per-check rubric outcome — pass/fail/n_a
//     — surfaced by the workflow eval CLI on every built workflow).
//
// N/A outcomes (the check had no subject to evaluate, e.g. an agent-only
// check on a workflow with no agent) are excluded from the pass-rate
// denominator so the signal stays clean.
// ---------------------------------------------------------------------------

import type { BinaryCheck, BinaryCheckContext, BinaryCheckResult } from './types';
import type { WorkflowResponse } from '../clients/n8n-client';
import type { Feedback } from '../subagent/types';
import type { CheckOutcome, CheckStatus } from '../types';
import { DETERMINISTIC_CHECKS, LLM_CHECKS } from './checks/index';

const EVALUATOR_NAME = 'binary-checks';

export interface BinaryChecksOptions {
	/** Run only the checks whose names appear in this list. Runs all if omitted. */
	only?: string[];
}

export interface BinaryChecksRun {
	feedback: Feedback[];
	outcomes: CheckOutcome[];
}

/**
 * Run binary checks against a workflow.
 *
 * Returns both the `Feedback[]` (for the existing subagent caller) and the
 * `CheckOutcome[]` per-check rubric view (used by the workflow eval CLI).
 *
 * LLM checks are automatically skipped (status: 'n_a') when `ctx.modelId` is
 * not set.
 */
export async function runBinaryChecks(
	workflow: WorkflowResponse,
	ctx: BinaryCheckContext,
	options?: BinaryChecksOptions,
): Promise<BinaryChecksRun> {
	const selected = resolveChecks(options?.only, ctx);

	const results = await Promise.allSettled(
		selected.map(async (check) => await check.run(workflow, ctx)),
	);

	const outcomes: CheckOutcome[] = results.map((settled, i) => {
		const check = selected[i];
		if (settled.status === 'fulfilled') {
			return toOutcome(check, settled.value);
		}
		const message =
			settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
		return {
			name: check.name,
			description: check.description,
			kind: check.kind,
			status: 'fail',
			comment: `Error: ${message}`,
		};
	});

	const feedback: Feedback[] = outcomes
		.filter((o) => o.status !== 'n_a')
		.map((o) => ({
			evaluator: EVALUATOR_NAME,
			metric: o.name,
			score: o.status === 'pass' ? 1 : 0,
			kind: 'metric' as const,
			...(o.comment ? { comment: o.comment } : {}),
		}));

	const scoredOutcomes = outcomes.filter((o) => o.status !== 'n_a');
	const totalScored = scoredOutcomes.length;
	const passCount = scoredOutcomes.filter((o) => o.status === 'pass').length;
	const passRate = totalScored > 0 ? passCount / totalScored : 0;
	const naCount = outcomes.length - totalScored;

	const passRateComment = `${String(passCount)}/${String(totalScored)} checks passed${
		naCount > 0 ? ` (${String(naCount)} N/A)` : ''
	}`;

	feedback.push({
		evaluator: EVALUATOR_NAME,
		metric: 'pass_rate',
		score: passRate,
		kind: 'score',
		comment: passRateComment,
	});

	return { feedback, outcomes };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toOutcome(check: BinaryCheck, result: BinaryCheckResult): CheckOutcome {
	const status: CheckStatus = result.applicable === false ? 'n_a' : result.pass ? 'pass' : 'fail';
	return {
		name: check.name,
		description: check.description,
		kind: check.kind,
		status,
		...(result.comment ? { comment: result.comment } : {}),
	};
}

function resolveChecks(only: string[] | undefined, ctx: BinaryCheckContext): BinaryCheck[] {
	const allChecks = [...DETERMINISTIC_CHECKS, ...LLM_CHECKS];

	// Filter out LLM checks when no modelId is available
	const eligible = ctx.modelId ? allChecks : DETERMINISTIC_CHECKS;

	if (!only || only.length === 0) return eligible;

	// Validate names against all registered checks, not just eligible ones,
	// so LLM checks are skipped (not rejected) when modelId is missing.
	const allNames = new Set(allChecks.map((c) => c.name));
	const unknown = only.filter((name) => !allNames.has(name));
	if (unknown.length > 0) {
		const available = Array.from(allNames).join(', ');
		throw new Error(`Unknown binary check(s): ${unknown.join(', ')}. Available: ${available}`);
	}

	return eligible.filter((c) => only.includes(c.name));
}

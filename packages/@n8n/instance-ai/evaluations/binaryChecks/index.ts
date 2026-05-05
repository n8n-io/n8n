// ---------------------------------------------------------------------------
// Binary checks evaluator for instance-ai
//
// Runs all registered checks against a built workflow and
// returns Feedback[] compatible with the existing harness.
// ---------------------------------------------------------------------------

import type { WorkflowResponse } from '../clients/n8n-client';
import type { Feedback } from '../subagent/types';
import { DETERMINISTIC_CHECKS, LLM_CHECKS } from './checks/index';
import type { BinaryCheck, BinaryCheckContext } from './types';

const EVALUATOR_NAME = 'binary-checks';

export interface BinaryChecksOptions {
	/** Run only the checks whose names appear in this list. Runs all if omitted. */
	only?: string[];
}

/**
 * Run binary checks against a workflow and return Feedback items.
 *
 * Each check produces one Feedback with score 0 (fail) or 1 (pass).
 * An overall score (pass rate) is emitted with kind 'score'.
 *
 * LLM checks are automatically skipped when `ctx.modelId` is not set.
 */
export async function runBinaryChecks(
	workflow: WorkflowResponse,
	ctx: BinaryCheckContext,
	options?: BinaryChecksOptions,
): Promise<Feedback[]> {
	const selected = resolveChecks(options?.only, ctx);

	const results = await Promise.allSettled(
		selected.map(async (check) => {
			const result = await check.run(workflow, ctx);
			return {
				evaluator: EVALUATOR_NAME,
				metric: check.name,
				score: result.pass ? 1 : 0,
				kind: 'metric' as const,
				...(result.comment ? { comment: result.comment } : {}),
			};
		}),
	);

	const feedback: Feedback[] = results.map((settled, i) => {
		if (settled.status === 'fulfilled') return settled.value;

		const message =
			settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
		return {
			evaluator: EVALUATOR_NAME,
			metric: selected[i].name,
			score: 0,
			kind: 'metric' as const,
			comment: `Error: ${message}`,
		};
	});

	// Overall pass rate as the evaluator-level score
	const totalChecks = feedback.length;
	const passCount = feedback.filter((f) => f.score === 1).length;
	const passRate = totalChecks > 0 ? passCount / totalChecks : 0;

	feedback.push({
		evaluator: EVALUATOR_NAME,
		metric: 'pass_rate',
		score: passRate,
		kind: 'score',
		comment: `${String(passCount)}/${String(totalChecks)} checks passed`,
	});

	return feedback;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

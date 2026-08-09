// ---------------------------------------------------------------------------
// Binary checks evaluator for instance-ai
// ---------------------------------------------------------------------------

import type {
	BinaryCheck,
	BinaryCheckContext,
	BinaryCheckResult,
	CheckOutcome,
	CheckStatus,
} from './types';
import type { WorkflowResponse } from '../clients/n8n-client';
import type { Feedback } from '../subagent/types';
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

/** LLM checks are filtered out entirely when `ctx.modelId` is not set (they don't appear in outcomes). */
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
		// A crashed check is a measurement failure, not a workflow failure —
		// same category as a timeout, so it must not drag the pass rate down.
		return {
			name: check.name,
			description: check.description,
			kind: check.kind,
			dimension: check.dimension,
			status: 'error',
			comment: `Error: ${message}`,
		};
	});

	// Only measured checks (pass/fail) emit per-check feedback and count toward
	// the pass rate; n_a and error stay out of the denominator.
	const scoredOutcomes = outcomes.filter((o) => o.status === 'pass' || o.status === 'fail');
	const feedback: Feedback[] = scoredOutcomes.map((o) => ({
		evaluator: EVALUATOR_NAME,
		metric: o.name,
		score: o.status === 'pass' ? 1 : 0,
		kind: 'metric' as const,
		...(o.comment ? { comment: o.comment } : {}),
	}));

	const totalScored = scoredOutcomes.length;
	const passCount = scoredOutcomes.filter((o) => o.status === 'pass').length;
	const passRate = totalScored > 0 ? passCount / totalScored : 0;
	const naCount = outcomes.filter((o) => o.status === 'n_a').length;
	const erroredCount = outcomes.filter((o) => o.status === 'error').length;

	const skippedParts = [
		...(naCount > 0 ? [`${String(naCount)} N/A`] : []),
		...(erroredCount > 0 ? [`${String(erroredCount)} errored`] : []),
	];
	const passRateComment = `${String(passCount)}/${String(totalScored)} checks passed${
		skippedParts.length > 0 ? ` (${skippedParts.join(', ')})` : ''
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
	const status: CheckStatus = result.errored
		? 'error'
		: result.applicable === false
			? 'n_a'
			: result.pass
				? 'pass'
				: 'fail';
	return {
		name: check.name,
		description: check.description,
		kind: check.kind,
		dimension: check.dimension,
		status,
		...(result.comment ? { comment: result.comment } : {}),
	};
}

function resolveChecks(only: string[] | undefined, ctx: BinaryCheckContext): BinaryCheck[] {
	const allChecks = [...DETERMINISTIC_CHECKS, ...LLM_CHECKS];
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

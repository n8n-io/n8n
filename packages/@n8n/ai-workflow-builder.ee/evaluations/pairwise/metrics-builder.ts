import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import type { Run } from 'langsmith/schemas';

import type { JudgePanelResult, MultiGenerationAggregation } from './judge-panel';
import { isPairwiseTargetOutput } from './types';
import { METRIC_KEYS } from '../constants';

// ============================================================================
// Result Builders
// ============================================================================

/**
 * Build LangSmith-compatible evaluation results from judge panel output.
 */
export function buildSingleGenerationResults(
	result: JudgePanelResult,
	numJudges: number,
): LangsmithEvaluationResult[] {
	const { judgeResults, primaryPasses, majorityPass, avgDiagnosticScore } = result;

	const allViolations = judgeResults.flatMap((r, i) =>
		r.violations.map((v) => `[Judge ${i + 1}] ${v.rule}: ${v.justification}`),
	);
	const allPasses = judgeResults.flatMap((r, i) =>
		r.passes.map((p) => `[Judge ${i + 1}] ${p.rule}`),
	);

	const comment = [
		`Majority vote: ${primaryPasses}/${numJudges} judges passed`,
		allViolations.length > 0 ? `\nViolations:\n${allViolations.join('\n')}` : '',
		allPasses.length > 0 ? `\nPasses:\n${allPasses.join('\n')}` : '',
	]
		.filter(Boolean)
		.join('');

	return [
		{
			key: METRIC_KEYS.PAIRWISE_DIAGNOSTIC,
			score: avgDiagnosticScore,
			comment: `Average diagnostic score across ${numJudges} judges`,
		},
		{
			key: METRIC_KEYS.PAIRWISE_JUDGES_PASSED,
			score: primaryPasses,
			comment: `${primaryPasses} of ${numJudges} judges returned primaryPass=true`,
		},
		{ key: METRIC_KEYS.PAIRWISE_PRIMARY, score: majorityPass ? 1 : 0, comment },
		{
			key: METRIC_KEYS.PAIRWISE_TOTAL_PASSES,
			score: judgeResults.reduce((sum, r) => sum + r.passes.length, 0),
		},
		{
			key: METRIC_KEYS.PAIRWISE_TOTAL_VIOLATIONS,
			score: judgeResults.reduce((sum, r) => sum + r.violations.length, 0),
		},
	];
}

/**
 * Build LangSmith-compatible evaluation results for multi-generation aggregation.
 */
export function buildMultiGenerationResults(
	aggregation: MultiGenerationAggregation,
	numJudges: number,
): LangsmithEvaluationResult[] {
	const { generationCorrectness, aggregatedDiagnosticScore, passingGenerations, totalGenerations } =
		aggregation;

	// Build detailed comment with per-generation breakdown
	const genBreakdown = aggregation.generationDetails
		.map(
			(g, i) =>
				`Gen ${i + 1}: ${g.majorityPass ? 'PASS' : 'FAIL'} (${g.primaryPasses}/${numJudges} judges, ${(g.avgDiagnosticScore * 100).toFixed(0)}%)`,
		)
		.join('\n');

	const comment = [
		`Generation Correctness: ${passingGenerations}/${totalGenerations} generations passed`,
		`\nPer-generation breakdown:\n${genBreakdown}`,
	].join('');

	// Use first generation for backward-compatible metrics
	const firstGen = aggregation.generationDetails[0];

	// Aggregate counts across all generations
	const totalJudgesPassed = aggregation.generationDetails.reduce(
		(sum, g) => sum + g.primaryPasses,
		0,
	);
	const totalViolations = aggregation.generationDetails.reduce(
		(sum, g) => sum + g.judgeResults.reduce((jSum, r) => jSum + r.violations.length, 0),
		0,
	);
	const totalPasses = aggregation.generationDetails.reduce(
		(sum, g) => sum + g.judgeResults.reduce((jSum, r) => jSum + r.passes.length, 0),
		0,
	);

	return [
		{
			key: METRIC_KEYS.PAIRWISE_AGGREGATED_DIAGNOSTIC,
			score: aggregatedDiagnosticScore,
			comment: `Average diagnostic score across ${totalGenerations} generations`,
		},
		{
			key: METRIC_KEYS.PAIRWISE_DIAGNOSTIC,
			score: firstGen.avgDiagnosticScore,
			comment: 'First generation diagnostic score',
		},
		{
			key: METRIC_KEYS.PAIRWISE_GENERATION_CORRECTNESS,
			score: generationCorrectness,
			comment: `${passingGenerations} of ${totalGenerations} generations passed majority vote`,
		},
		{
			key: METRIC_KEYS.PAIRWISE_GENERATIONS_PASSED,
			score: passingGenerations,
			comment,
		},
		{
			key: METRIC_KEYS.PAIRWISE_JUDGES_PASSED,
			score: totalJudgesPassed,
			comment: `${totalJudgesPassed} of ${totalGenerations * numJudges} total judge calls passed`,
		},
		{
			key: METRIC_KEYS.PAIRWISE_PRIMARY,
			score: firstGen.majorityPass ? 1 : 0,
			comment: `First generation: ${firstGen.primaryPasses}/${numJudges} judges passed`,
		},
		{
			key: METRIC_KEYS.PAIRWISE_TOTAL_JUDGE_CALLS,
			score: totalGenerations * numJudges,
			comment: `${totalGenerations} generations x ${numJudges} judges`,
		},
		{
			key: METRIC_KEYS.PAIRWISE_TOTAL_PASSES,
			score: totalPasses,
			comment: `Total criteria passes across all ${totalGenerations} generations`,
		},
		{
			key: METRIC_KEYS.PAIRWISE_TOTAL_VIOLATIONS,
			score: totalViolations,
			comment: `Total violations across all ${totalGenerations} generations`,
		},
	];
}

// ============================================================================
// LangSmith Evaluator
// ============================================================================

/**
 * LangSmith evaluator that extracts pre-computed metrics from target output.
 *
 * All the work (generation + judging) happens in the target function.
 * This evaluator just returns the pre-computed metrics from target output.
 * This avoids 403 errors from nested traceable calls in evaluator context.
 */
export async function pairwiseLangsmithEvaluator(
	rootRun: Run,
): Promise<LangsmithEvaluationResult[]> {
	const outputs = rootRun.outputs;

	if (!isPairwiseTargetOutput(outputs)) {
		return [
			{
				key: METRIC_KEYS.PAIRWISE_PRIMARY,
				score: 0,
				comment: 'Invalid output - missing feedback from target',
			},
			{ key: METRIC_KEYS.PAIRWISE_DIAGNOSTIC, score: 0 },
		];
	}

	return outputs.feedback;
}

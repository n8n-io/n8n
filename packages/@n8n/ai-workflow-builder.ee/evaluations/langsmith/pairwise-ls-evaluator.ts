import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';

import { generateWorkflow } from './pairwise-generator';
import type { SimpleWorkflow } from '../../src/types/workflow';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import type { PairwiseEvaluationResult } from '../chains/pairwise-evaluator';
import {
	runJudgePanel,
	aggregateGenerations,
	type JudgePanelResult,
	type GenerationResult,
	type MultiGenerationAggregation,
	type EvalCriteria,
} from '../utils/judge-panel';

// ============================================================================
// Types
// ============================================================================

interface PairwiseTargetOutput {
	prompt: string;
	evals: EvalCriteria;
}

function isPairwiseTargetOutput(outputs: unknown): outputs is PairwiseTargetOutput {
	if (!outputs || typeof outputs !== 'object') return false;
	const obj = outputs as Record<string, unknown>;
	return typeof obj.prompt === 'string';
}

// ============================================================================
// Result Builders
// ============================================================================

/**
 * Build LangSmith-compatible evaluation results from judge panel output.
 * Results are returned in alphabetical key order to match LangSmith column display.
 */
function buildSingleGenerationResults(
	judgeResults: PairwiseEvaluationResult[],
	numJudges: number,
	primaryPasses: number,
	majorityPass: boolean,
	avgDiagnosticScore: number,
): LangsmithEvaluationResult[] {
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

	// Return results in alphabetical key order
	return [
		{
			key: 'pairwise_diagnostic',
			score: avgDiagnosticScore,
			comment: `Average diagnostic score across ${numJudges} judges`,
		},
		{
			key: 'pairwise_judges_passed',
			score: primaryPasses,
			comment: `${primaryPasses} of ${numJudges} judges returned primaryPass=true`,
		},
		{ key: 'pairwise_primary', score: majorityPass ? 1 : 0, comment },
		{
			key: 'pairwise_total_passes',
			score: judgeResults.reduce((sum, r) => sum + r.passes.length, 0),
		},
		{
			key: 'pairwise_total_violations',
			score: judgeResults.reduce((sum, r) => sum + r.violations.length, 0),
		},
	];
}

/**
 * Build LangSmith-compatible evaluation results for multi-generation aggregation.
 * Results are returned in alphabetical key order.
 */
function buildMultiGenerationResults(
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

	// Return results in alphabetical key order
	return [
		{
			key: 'pairwise_aggregated_diagnostic',
			score: aggregatedDiagnosticScore,
			comment: `Average diagnostic score across ${totalGenerations} generations`,
		},
		{
			key: 'pairwise_diagnostic',
			score: firstGen.avgDiagnosticScore,
			comment: 'First generation diagnostic score',
		},
		{
			key: 'pairwise_generation_correctness',
			score: generationCorrectness,
			comment: `${passingGenerations} of ${totalGenerations} generations passed majority vote`,
		},
		{
			key: 'pairwise_generations_passed',
			score: passingGenerations,
			comment,
		},
		{
			key: 'pairwise_judges_passed',
			score: totalJudgesPassed,
			comment: `${totalJudgesPassed} of ${totalGenerations * numJudges} total judge calls passed`,
		},
		{
			key: 'pairwise_primary',
			score: firstGen.majorityPass ? 1 : 0,
			comment: `First generation: ${firstGen.primaryPasses}/${numJudges} judges passed`,
		},
		{
			key: 'pairwise_total_judge_calls',
			score: totalGenerations * numJudges,
			comment: `${totalGenerations} generations x ${numJudges} judges`,
		},
		{
			key: 'pairwise_total_passes',
			score: totalPasses,
			comment: `Total criteria passes across all ${totalGenerations} generations`,
		},
		{
			key: 'pairwise_total_violations',
			score: totalViolations,
			comment: `Total violations across all ${totalGenerations} generations`,
		},
	];
}

// ============================================================================
// Evaluator Factory
// ============================================================================

/**
 * Creates a LangSmith evaluator for pairwise workflow evaluation.
 *
 * The evaluator generates workflows and runs a panel of judges on each.
 * All generation happens here for consistent tracing structure.
 *
 * @param llm - Language model for generation and judge evaluation
 * @param numJudges - Number of judges to run per workflow
 * @param numGenerations - Number of generations per example
 * @param parsedNodeTypes - Node types for generation (required)
 * @param featureFlags - Feature flags for generation
 */
export function createPairwiseLangsmithEvaluator(
	llm: BaseChatModel,
	numJudges: number,
	numGenerations: number = 1,
	parsedNodeTypes?: INodeTypeDescription[],
	featureFlags?: BuilderFeatureFlags,
) {
	return async (rootRun: Run, _example?: Example): Promise<LangsmithEvaluationResult[]> => {
		const outputs = rootRun.outputs;

		// Validate outputs (now just prompt pass-through from target)
		if (!isPairwiseTargetOutput(outputs)) {
			return [
				{
					key: 'pairwise_primary',
					score: 0,
					comment: 'Invalid output - missing prompt',
				},
				{ key: 'pairwise_diagnostic', score: 0 },
			];
		}

		// Validate we have node types for generation
		if (!parsedNodeTypes) {
			return [
				{
					key: 'pairwise_primary',
					score: 0,
					comment: 'Missing parsedNodeTypes - cannot generate workflows',
				},
				{ key: 'pairwise_diagnostic', score: 0 },
			];
		}

		// Get evaluation criteria from outputs (passed through from target)
		const evalCriteria: EvalCriteria = outputs.evals ?? { dos: '', donts: '' };
		const { prompt } = outputs;

		// Generate ALL workflows in evaluator for consistent trace structure
		const generationResults: GenerationResult[] = [];

		for (let i = 0; i < numGenerations; i++) {
			// Wrap each generation in traceable for proper LangSmith visibility
			const generate = traceable(
				async () => await generateWorkflow(parsedNodeTypes, llm, prompt, featureFlags),
				{ name: `generation_${i + 1}`, run_type: 'chain' },
			);
			const workflow = await generate();
			const panelResult = await runJudgePanel(llm, workflow, evalCriteria, numJudges);
			generationResults.push({ workflow, ...panelResult });
		}

		if (numGenerations === 1) {
			const result = generationResults[0];
			return buildSingleGenerationResults(
				result.judgeResults,
				numJudges,
				result.primaryPasses,
				result.majorityPass,
				result.avgDiagnosticScore,
			);
		} else {
			const aggregation = aggregateGenerations(generationResults);
			return buildMultiGenerationResults(aggregation, numJudges);
		}
	};
}

/**
 * Run evaluation locally (without LangSmith).
 * Executes judge panel and returns results.
 */
export async function evaluateWorkflowLocally(
	llm: BaseChatModel,
	workflow: SimpleWorkflow,
	evalCriteria: EvalCriteria,
	numJudges: number,
): Promise<JudgePanelResult> {
	return await runJudgePanel(llm, workflow, evalCriteria, numJudges);
}

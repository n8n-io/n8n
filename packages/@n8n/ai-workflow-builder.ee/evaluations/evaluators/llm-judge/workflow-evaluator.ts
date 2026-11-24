import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import type { EvaluationInput, EvaluationResult } from './evaluation';
import {
	evaluateFunctionality,
	evaluateConnections,
	evaluateExpressions,
	evaluateNodeConfiguration,
	evaluateEfficiency,
	evaluateDataFlow,
	evaluateMaintainability,
	evaluateBestPractices,
} from './evaluators';

/**
 * Weights for each LLM-judge evaluation category used in overall score calculation.
 *
 * This is evaluator-internal weighting, and is independent from the harness-level
 * cross-evaluator weighting in `evaluations/score-calculator.ts`.
 * Exported for use in tests.
 */
export const LLM_JUDGE_CATEGORY_WEIGHTS = {
	functionality: 0.25,
	connections: 0.15,
	expressions: 0.15,
	nodeConfiguration: 0.15,
	efficiency: 0.1,
	dataFlow: 0.1,
	maintainability: 0.05,
	bestPractices: 0.1,
	structuralSimilarity: 0.05,
} as const;

/**
 * @deprecated Use `LLM_JUDGE_CATEGORY_WEIGHTS` (kept for backwards compatibility within the package).
 */
export const EVALUATION_WEIGHTS = LLM_JUDGE_CATEGORY_WEIGHTS;

/**
 * Total weight when structural similarity is not applicable.
 */
export const TOTAL_WEIGHT_WITHOUT_STRUCTURAL =
	LLM_JUDGE_CATEGORY_WEIGHTS.functionality +
	LLM_JUDGE_CATEGORY_WEIGHTS.connections +
	LLM_JUDGE_CATEGORY_WEIGHTS.expressions +
	LLM_JUDGE_CATEGORY_WEIGHTS.nodeConfiguration +
	LLM_JUDGE_CATEGORY_WEIGHTS.efficiency +
	LLM_JUDGE_CATEGORY_WEIGHTS.dataFlow +
	LLM_JUDGE_CATEGORY_WEIGHTS.maintainability +
	LLM_JUDGE_CATEGORY_WEIGHTS.bestPractices;

/**
 * Total weight when structural similarity is applicable.
 */
export const TOTAL_WEIGHT_WITH_STRUCTURAL =
	TOTAL_WEIGHT_WITHOUT_STRUCTURAL + LLM_JUDGE_CATEGORY_WEIGHTS.structuralSimilarity;

/**
 * Calculate weighted score for the overall evaluation
 * @param result - Evaluation result with all category scores
 * @returns Weighted overall score
 */
export function calculateWeightedScore(result: EvaluationResult): number {
	const w = LLM_JUDGE_CATEGORY_WEIGHTS;

	// Calculate weighted sum for all categories
	const weightedSum =
		result.functionality.score * w.functionality +
		result.connections.score * w.connections +
		result.expressions.score * w.expressions +
		result.nodeConfiguration.score * w.nodeConfiguration +
		result.efficiency.score * w.efficiency +
		result.dataFlow.score * w.dataFlow +
		result.maintainability.score * w.maintainability +
		result.bestPractices.score * w.bestPractices +
		(result.structuralSimilarity?.applicable
			? result.structuralSimilarity.score * w.structuralSimilarity
			: 0);

	const totalWeight = result.structuralSimilarity?.applicable
		? TOTAL_WEIGHT_WITH_STRUCTURAL
		: TOTAL_WEIGHT_WITHOUT_STRUCTURAL;

	return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Generates a summary of the evaluation results
 * @param result - Complete evaluation result
 * @returns Summary string describing strengths and weaknesses
 */
export function generateEvaluationSummary(result: EvaluationResult): string {
	const strengths: string[] = [];
	const weaknesses: string[] = [];

	// Analyze core metrics
	if (result.functionality.score >= 0.8) strengths.push('strong functional implementation');
	else if (result.functionality.score < 0.5) weaknesses.push('functional gaps');

	if (result.connections.score >= 0.8) strengths.push('well-connected nodes');
	else if (result.connections.score < 0.5) weaknesses.push('connection issues');

	if (result.expressions.score >= 0.8) strengths.push('correct expression syntax');
	else if (result.expressions.score < 0.5) weaknesses.push('expression errors');

	if (result.nodeConfiguration.score >= 0.8) strengths.push('well-configured nodes');
	else if (result.nodeConfiguration.score < 0.5) weaknesses.push('node configuration issues');

	if (result.dataFlow.score >= 0.8) strengths.push('proper data flow');
	else if (result.dataFlow.score < 0.5) weaknesses.push('data flow problems');

	// Analyze new metrics
	if (result.efficiency.score >= 0.8) strengths.push('efficient design');
	else if (result.efficiency.score < 0.5) weaknesses.push('inefficiencies');

	if (result.maintainability.score >= 0.8) strengths.push('maintainable structure');
	else if (result.maintainability.score < 0.5) weaknesses.push('poor maintainability');

	if (result.bestPractices.score >= 0.8) strengths.push('follows best practices');
	else if (result.bestPractices.score < 0.5) weaknesses.push('deviates from best practices');

	// Create summary
	let summary = '';
	if (strengths.length > 0) {
		summary += `The workflow demonstrates ${strengths.join(', ')}.`;
	}
	if (weaknesses.length > 0) {
		summary += ` Key areas for improvement include ${weaknesses.join(', ')}.`;
	}
	if (summary === '') {
		summary = 'The workflow shows adequate implementation across all evaluated metrics.';
	}

	return summary.trim();
}

/**
 * Identifies critical issues from all evaluation categories
 * @param result - Complete evaluation result
 * @returns Array of critical issues if any
 */
export function identifyCriticalIssues(result: EvaluationResult): string[] | undefined {
	const criticalIssues: string[] = [];

	// Check all categories for critical violations
	const categories = [
		{ name: 'functionality', data: result.functionality },
		{ name: 'connections', data: result.connections },
		{ name: 'expressions', data: result.expressions },
		{ name: 'nodeConfiguration', data: result.nodeConfiguration },
		{ name: 'efficiency', data: result.efficiency },
		{ name: 'dataFlow', data: result.dataFlow },
		{ name: 'maintainability', data: result.maintainability },
		{ name: 'bestPractices', data: result.bestPractices },
	];

	for (const category of categories) {
		if (category.data) {
			const criticalViolations = category.data.violations.filter((v) => v.type === 'critical');
			criticalViolations.forEach((v) => {
				criticalIssues.push(`[${category.name}] ${v.description}`);
			});
		}
	}

	return criticalIssues.length > 0 ? criticalIssues : undefined;
}

/**
 * Main workflow evaluation function that orchestrates all evaluators
 * Runs all evaluations in parallel for optimal performance
 * @param llm - Language model to use for evaluation
 * @param input - Evaluation input containing workflow and prompt
 * @returns Complete evaluation result with all metrics
 */
export async function evaluateWorkflow(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<EvaluationResult> {
	// Run all evaluations in parallel
	const [
		functionality,
		connections,
		expressions,
		nodeConfiguration,
		efficiency,
		dataFlow,
		maintainability,
		bestPractices,
	] = await Promise.all([
		// Core evaluations
		evaluateFunctionality(llm, input),
		evaluateConnections(llm, input),
		evaluateExpressions(llm, input),
		evaluateNodeConfiguration(llm, input),
		evaluateEfficiency(llm, input),
		evaluateDataFlow(llm, input),
		evaluateMaintainability(llm, input),
		evaluateBestPractices(llm, input),
	]);

	// Build the evaluation result
	const evaluationResult: EvaluationResult = {
		overallScore: 0, // Will be calculated below
		functionality,
		connections,
		expressions,
		nodeConfiguration,
		efficiency,
		dataFlow,
		maintainability,
		bestPractices,
		structuralSimilarity: {
			violations: [],
			score: 0,
			applicable: false, // TODO: Implement structural similarity if reference workflow provided
		},
		summary: '', // Will be generated below
	};

	// Calculate overall score
	evaluationResult.overallScore = calculateWeightedScore(evaluationResult);

	// Generate summary
	evaluationResult.summary = generateEvaluationSummary(evaluationResult);

	// Identify critical issues
	evaluationResult.criticalIssues = identifyCriticalIssues(evaluationResult);

	return evaluationResult;
}

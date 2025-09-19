/* eslint-disable complexity */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import {
	evaluateFunctionality,
	evaluateConnections,
	evaluateExpressions,
	evaluateNodeConfiguration,
	evaluateEfficiency,
	evaluateDataFlow,
	evaluateMaintainability,
} from './evaluators';
import type { EvaluationInput, EvaluationResult } from '../types/evaluation';

/**
 * Calculate weighted score for the overall evaluation
 * @param result - Evaluation result with all category scores
 * @returns Weighted overall score
 */
export function calculateWeightedScore(result: EvaluationResult): number {
	// Define weights for each category
	const weights = {
		functionality: 0.25,
		connections: 0.15,
		expressions: 0.15,
		nodeConfiguration: 0.15,
		efficiency: 0.1,
		dataFlow: 0.1,
		maintainability: 0.05,

		// Structural similarity (5% if applicable)
		structuralSimilarity: 0.05,
	};

	let totalWeight = 0;
	let weightedSum = 0;

	// Add scores for core categories (always present)
	weightedSum += result.functionality.score * weights.functionality;
	weightedSum += result.connections.score * weights.connections;
	weightedSum += result.expressions.score * weights.expressions;
	weightedSum += result.nodeConfiguration.score * weights.nodeConfiguration;
	totalWeight +=
		weights.functionality + weights.connections + weights.expressions + weights.nodeConfiguration;

	// Add scores for new metrics (now required)
	weightedSum += result.efficiency.score * weights.efficiency;
	weightedSum += result.dataFlow.score * weights.dataFlow;
	weightedSum += result.maintainability.score * weights.maintainability;
	totalWeight += weights.efficiency + weights.dataFlow + weights.maintainability;

	// Add structural similarity only if applicable
	if (result.structuralSimilarity?.applicable) {
		weightedSum += result.structuralSimilarity.score * weights.structuralSimilarity;
		totalWeight += weights.structuralSimilarity;
	}

	return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Generates a summary of the evaluation results
 * @param result - Complete evaluation result
 * @returns Summary string describing strengths and weaknesses
 */
function generateEvaluationSummary(result: EvaluationResult): string {
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
function identifyCriticalIssues(result: EvaluationResult): string[] | undefined {
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
	] = await Promise.all([
		// Core evaluations
		evaluateFunctionality(llm, input),
		evaluateConnections(llm, input),
		evaluateExpressions(llm, input),
		evaluateNodeConfiguration(llm, input),
		evaluateEfficiency(llm, input),
		evaluateDataFlow(llm, input),
		evaluateMaintainability(llm, input),
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

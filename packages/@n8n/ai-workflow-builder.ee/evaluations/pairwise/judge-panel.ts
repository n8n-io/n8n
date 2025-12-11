import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { evaluateWorkflowPairwise, type PairwiseEvaluationResult } from './judge-chain';
import type { SimpleWorkflow } from '../../src/types/workflow';

// ============================================================================
// Types
// ============================================================================

export interface EvalCriteria {
	dos: string;
	donts: string;
}

export interface JudgePanelResult {
	judgeResults: PairwiseEvaluationResult[];
	primaryPasses: number;
	majorityPass: boolean;
	avgDiagnosticScore: number;
}

export interface GenerationResult extends JudgePanelResult {
	workflow: SimpleWorkflow;
}

export interface MultiGenerationAggregation {
	/** Generation correctness: (# passing generations) / total generations */
	generationCorrectness: number;
	/** Average diagnostic score across all generations */
	aggregatedDiagnosticScore: number;
	/** Number of generations that passed majority vote */
	passingGenerations: number;
	/** Total number of generations run */
	totalGenerations: number;
	/** Detailed results for each generation */
	generationDetails: GenerationResult[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate minimum judges needed for majority (e.g., 2 for 3 judges, 3 for 5 judges)
 * @param numJudges - Number of judges (must be >= 1)
 * @throws Error if numJudges < 1
 */
export function getMajorityThreshold(numJudges: number): number {
	if (numJudges < 1) {
		throw new Error(`getMajorityThreshold requires numJudges >= 1, got ${numJudges}`);
	}
	return Math.ceil(numJudges / 2);
}

// ============================================================================
// Judge Panel Execution
// ============================================================================

export interface JudgePanelOptions {
	/** Generation index (1-based) for metadata */
	generationIndex?: number;
	/** Experiment name for metadata */
	experimentName?: string;
}

/**
 * Run a panel of judges on a workflow.
 * Executes judges in parallel and aggregates their results.
 *
 * @param llm - Language model for evaluation
 * @param workflow - Workflow to evaluate
 * @param evalCriteria - Evaluation criteria (dos/donts)
 * @param numJudges - Number of judges to run
 * @param options - Optional metadata for tracing
 * @returns Aggregated judge panel results
 */
export async function runJudgePanel(
	llm: BaseChatModel,
	workflow: SimpleWorkflow,
	evalCriteria: EvalCriteria,
	numJudges: number,
	options?: JudgePanelOptions,
): Promise<JudgePanelResult> {
	const { generationIndex, experimentName } = options ?? {};

	// Run all judges in parallel
	const judgeResults = await Promise.all(
		Array.from({ length: numJudges }, async (_, judgeIndex) => {
			return await evaluateWorkflowPairwise(
				llm,
				{ workflowJSON: workflow, evalCriteria },
				{
					runName: `judge_${judgeIndex + 1}`,
					metadata: {
						...(experimentName && { experiment_name: experimentName }),
						...(generationIndex && { evaluating_generation: `generation_${generationIndex}` }),
					},
				},
			);
		}),
	);

	return aggregateJudgeResults(judgeResults, numJudges);
}

/**
 * Aggregate results from multiple judges into summary metrics.
 */
export function aggregateJudgeResults(
	judgeResults: PairwiseEvaluationResult[],
	numJudges: number,
): JudgePanelResult {
	const primaryPasses = judgeResults.filter((r) => r.primaryPass).length;
	const majorityPass = primaryPasses >= getMajorityThreshold(numJudges);
	const avgDiagnosticScore =
		judgeResults.reduce((sum, r) => sum + r.diagnosticScore, 0) / numJudges;

	return {
		judgeResults,
		primaryPasses,
		majorityPass,
		avgDiagnosticScore,
	};
}

// ============================================================================
// Multi-Generation Aggregation
// ============================================================================

/**
 * Aggregate results across multiple generations.
 */
export function aggregateGenerations(
	generationResults: GenerationResult[],
): MultiGenerationAggregation {
	const totalGenerations = generationResults.length;
	const passingGenerations = generationResults.filter((g) => g.majorityPass).length;
	const generationCorrectness = passingGenerations / totalGenerations;
	const aggregatedDiagnosticScore =
		generationResults.reduce((sum, g) => sum + g.avgDiagnosticScore, 0) / totalGenerations;

	return {
		generationCorrectness,
		aggregatedDiagnosticScore,
		passingGenerations,
		totalGenerations,
		generationDetails: generationResults,
	};
}

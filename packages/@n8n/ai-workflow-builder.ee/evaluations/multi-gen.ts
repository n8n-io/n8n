/**
 * Multi-generation utilities for pairwise evaluation.
 *
 * These utilities support generating multiple workflows from a single prompt
 * and aggregating evaluation results across all generations.
 */

import type { SimpleWorkflow } from '@/types/workflow';

/**
 * Details for a single generation in multi-gen evaluation.
 */
export interface GenerationDetail {
	/** The generated workflow */
	workflow: SimpleWorkflow;
	/** Whether majority of judges passed this generation */
	majorityPass: boolean;
	/** Average diagnostic score across judges */
	diagnosticScore: number;
	/** Number of judges that passed */
	primaryPasses: number;
	/** Total number of judges */
	numJudges: number;
}

/**
 * Aggregated result across multiple generations.
 */
export interface MultiGenerationResult {
	/** Ratio of passing generations (0-1) */
	generationCorrectness: number;
	/** Average diagnostic score across all generations */
	aggregatedDiagnosticScore: number;
	/** Count of generations that passed */
	passingGenerations: number;
	/** Total number of generations */
	totalGenerations: number;
	/** Detailed results for each generation */
	generationDetails: GenerationDetail[];
}

/**
 * Calculate the majority threshold for a given number of judges.
 *
 * @param numJudges - Number of judges in the panel
 * @returns Minimum number of passes needed for majority
 *
 * @example
 * getMajorityThreshold(3) // returns 2
 * getMajorityThreshold(5) // returns 3
 */
export function getMajorityThreshold(numJudges: number): number {
	if (!Number.isFinite(numJudges) || numJudges < 1) {
		throw new Error(`numJudges must be >= 1 (received ${String(numJudges)})`);
	}
	return Math.ceil(numJudges / 2);
}

/**
 * Aggregate results across multiple workflow generations.
 *
 * Calculates:
 * - Generation correctness: passing generations / total generations
 * - Aggregated diagnostic: average diagnostic score across all generations
 *
 * @param details - Array of generation details to aggregate
 * @returns Aggregated multi-generation result
 *
 * @example
 * ```typescript
 * const result = aggregateGenerations([
 *   { majorityPass: true, diagnosticScore: 0.9, ... },
 *   { majorityPass: false, diagnosticScore: 0.6, ... },
 *   { majorityPass: true, diagnosticScore: 0.85, ... },
 * ]);
 * // result.generationCorrectness = 0.67 (2/3)
 * // result.aggregatedDiagnosticScore = 0.78
 * ```
 */
export function aggregateGenerations(details: GenerationDetail[]): MultiGenerationResult {
	const totalGenerations = details.length;
	const passingGenerations = details.filter((d) => d.majorityPass).length;
	const generationCorrectness = totalGenerations > 0 ? passingGenerations / totalGenerations : 0;

	const aggregatedDiagnosticScore =
		totalGenerations > 0
			? details.reduce((sum, d) => sum + d.diagnosticScore, 0) / totalGenerations
			: 0;

	return {
		generationCorrectness,
		aggregatedDiagnosticScore,
		passingGenerations,
		totalGenerations,
		generationDetails: details,
	};
}

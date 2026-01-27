import type { SimpleWorkflow } from '@/types/workflow';

import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';
import {
	evaluateWorkflowSimilarity,
	evaluateWorkflowSimilarityMultiple,
} from '../../programmatic/evaluators/workflow-similarity';

/**
 * Options for creating a similarity evaluator.
 */
export interface SimilarityEvaluatorOptions {
	/** Comparison preset: 'strict' | 'standard' | 'lenient' (default: 'standard') */
	preset?: 'strict' | 'standard' | 'lenient';
	/** Optional path to custom configuration file */
	customConfigPath?: string;
}

/**
 * Format violations as a comment string.
 */
function formatViolations(
	violations: Array<{ name: string; type: string; description: string; pointsDeducted: number }>,
): string | undefined {
	if (!violations || violations.length === 0) return undefined;
	return violations.map((v) => `[${v.type}] ${v.description}`).join('; ');
}

/**
 * Create a similarity evaluator that compares workflows using graph edit distance.
 *
 * This evaluator uses a Python script to calculate similarity between the generated
 * workflow and reference workflow(s). It requires `uvx` to be installed.
 *
 * @param options - Configuration options
 * @returns An evaluator that produces feedback from similarity comparison
 *
 * @example
 * ```typescript
 * const evaluator = createSimilarityEvaluator({ preset: 'standard' });
 *
 * // With single reference workflow
 * const feedback = await evaluator.evaluate(workflow, {
 *   referenceWorkflows: [referenceWorkflow]
 * });
 *
 * // With multiple reference workflows (best match wins)
 * const feedback = await evaluator.evaluate(workflow, {
 *   referenceWorkflows: [ref1, ref2, ref3]
 * });
 * ```
 */
export function createSimilarityEvaluator(
	options?: SimilarityEvaluatorOptions,
): Evaluator<EvaluationContext> {
	const preset = options?.preset ?? 'standard';
	const customConfigPath = options?.customConfigPath;

	return {
		name: 'similarity',

		async evaluate(workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			const feedback: Feedback[] = [];

			const referenceWorkflows = ctx.referenceWorkflows;

			// No reference workflows provided - treat as configuration error
			if (!referenceWorkflows?.length) {
				feedback.push({
					evaluator: 'similarity',
					metric: 'error',
					score: 0,
					kind: 'score',
					comment: 'No reference workflow provided for comparison',
				});
				return feedback;
			}

			try {
				let result: {
					violations: Array<{
						name: string;
						type: string;
						description: string;
						pointsDeducted: number;
					}>;
					score: number;
				};

				if (referenceWorkflows.length === 1) {
					result = await evaluateWorkflowSimilarity(
						workflow,
						referenceWorkflows[0],
						preset,
						customConfigPath,
					);
				} else {
					result = await evaluateWorkflowSimilarityMultiple(
						workflow,
						referenceWorkflows,
						preset,
						customConfigPath,
					);
				}

				// Overall similarity score
				feedback.push({
					evaluator: 'similarity',
					metric: 'score',
					score: result.score,
					kind: 'score',
					comment: formatViolations(result.violations),
				});

				// Count violations by type
				const violationsByType: Record<string, number> = {};
				for (const v of result.violations) {
					const type = v.name.replace('workflow-similarity-', '');
					violationsByType[type] = (violationsByType[type] || 0) + 1;
				}

				// Add individual violation counts as feedback
				for (const [type, count] of Object.entries(violationsByType)) {
					feedback.push({
						evaluator: 'similarity',
						metric: type,
						score: Math.max(0, 1 - count * 0.1), // Penalty per violation
						kind: 'detail',
						comment: `${count} ${type} edit(s)`,
					});
				}
			} catch (error) {
				// Return error feedback
				const errorMessage = error instanceof Error ? error.message : String(error);
				feedback.push({
					evaluator: 'similarity',
					metric: 'error',
					score: 0,
					kind: 'score',
					comment: errorMessage,
				});
			}

			return feedback;
		},
	};
}

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import type { SimpleWorkflow } from '@/types/workflow';

import { runJudgePanel, type EvalCriteria } from './judge-panel';
import { PAIRWISE_METRICS } from './metrics';
import type {
	DisplayLine,
	EvaluationContext,
	Evaluator,
	Feedback,
} from '../../harness/harness-types';

/**
 * Options for creating a pairwise evaluator.
 */
export interface PairwiseEvaluatorOptions {
	/** Number of judges to run (default: 3) */
	numJudges?: number;
}

/**
 * Create a pairwise evaluator that uses a panel of judges.
 * Each judge evaluates the workflow against dos/donts criteria.
 *
 * @param llm - Language model for evaluation
 * @param options - Configuration options
 * @returns An evaluator that produces feedback from pairwise evaluation
 *
 * @example
 * ```typescript
 * const evaluator = createPairwiseEvaluator(llm, { numJudges: 3 });
 * const feedback = await evaluator.evaluate(workflow, { dos, donts });
 * ```
 */
export function createPairwiseEvaluator(
	llm: BaseChatModel,
	options?: PairwiseEvaluatorOptions,
): Evaluator<EvaluationContext> {
	const numJudges = options?.numJudges ?? 3;

	return {
		name: 'pairwise',

		async evaluate(workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			const evalCriteria: EvalCriteria = {
				dos: ctx?.dos,
				donts: ctx?.donts,
			};

			const result = await runJudgePanel(llm, workflow, evalCriteria, numJudges, {
				llmCallLimiter: ctx.llmCallLimiter,
				timeoutMs: ctx.timeoutMs,
			});

			const feedback: Feedback[] = [];

			const totalViolations = result.judgeResults.reduce((sum, r) => sum + r.violations.length, 0);
			const totalPasses = result.judgeResults.reduce((sum, r) => sum + r.passes.length, 0);

			// Primary metrics
			feedback.push({
				evaluator: 'pairwise',
				metric: PAIRWISE_METRICS.PAIRWISE_PRIMARY,
				score: result.majorityPass ? 1 : 0,
				kind: 'score',
				comment: `${result.primaryPasses}/${numJudges} judges passed`,
			});
			feedback.push({
				evaluator: 'pairwise',
				metric: PAIRWISE_METRICS.PAIRWISE_DIAGNOSTIC,
				score: result.avgDiagnosticScore,
				kind: 'metric',
			});
			feedback.push({
				evaluator: 'pairwise',
				metric: PAIRWISE_METRICS.PAIRWISE_JUDGES_PASSED,
				score: result.primaryPasses,
				kind: 'detail',
			});
			feedback.push({
				evaluator: 'pairwise',
				metric: PAIRWISE_METRICS.PAIRWISE_TOTAL_PASSES,
				score: totalPasses,
				kind: 'detail',
			});
			feedback.push({
				evaluator: 'pairwise',
				metric: PAIRWISE_METRICS.PAIRWISE_TOTAL_VIOLATIONS,
				score: totalViolations,
				kind: 'detail',
			});

			// Individual judge results
			for (let i = 0; i < result.judgeResults.length; i++) {
				const judge = result.judgeResults[i];
				const violationSummary =
					judge.violations.length > 0
						? judge.violations.map((v) => `[${v.rule}] ${v.justification}`).join('; ')
						: undefined;

				// Pre-format display lines for verbose logging
				const displayLines: DisplayLine[] = [];
				if (judge.violations.length > 0) {
					for (const v of judge.violations) {
						displayLines.push({ text: `[${v.rule}]`, color: 'yellow' });
						displayLines.push({ text: v.justification, color: 'red' });
					}
				}

				feedback.push({
					evaluator: 'pairwise',
					metric: `judge${i + 1}`,
					score: judge.primaryPass ? 1 : 0,
					kind: 'detail',
					comment: violationSummary,
					details: displayLines.length > 0 ? { displayLines } : undefined,
				});
			}

			return feedback;
		},
	};
}

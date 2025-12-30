import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import type { SimpleWorkflow } from '@/types/workflow';

import { runJudgePanel, type EvalCriteria } from '../../pairwise/judge-panel';
import type { Evaluator, Feedback } from '../types';

/**
 * Context for pairwise evaluator.
 */
export interface PairwiseContext {
	dos?: string;
	donts?: string;
}

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
 */
export function createPairwiseEvaluator(
	llm: BaseChatModel,
	options?: PairwiseEvaluatorOptions,
): Evaluator<PairwiseContext> {
	const numJudges = options?.numJudges ?? 3;

	return {
		name: 'pairwise',

		async evaluate(workflow: SimpleWorkflow, ctx: PairwiseContext): Promise<Feedback[]> {
			const evalCriteria: EvalCriteria = {
				dos: ctx?.dos ?? 'Follow the user prompt accurately',
				donts: ctx?.donts ?? 'Do not add unnecessary complexity',
			};

			const result = await runJudgePanel(llm, workflow, evalCriteria, numJudges);

			const feedback: Feedback[] = [];

			// Overall pairwise result
			feedback.push({
				key: 'pairwise.majorityPass',
				score: result.majorityPass ? 1 : 0,
				comment: `${result.primaryPasses}/${numJudges} judges passed`,
			});

			// Diagnostic score
			feedback.push({
				key: 'pairwise.diagnosticScore',
				score: result.avgDiagnosticScore,
			});

			// Individual judge results
			for (let i = 0; i < result.judgeResults.length; i++) {
				const judge = result.judgeResults[i];
				// Build comment from violations
				const violationSummary =
					judge.violations.length > 0
						? judge.violations.map((v) => `[${v.rule}] ${v.justification}`).join('; ')
						: undefined;
				feedback.push({
					key: `pairwise.judge${i + 1}`,
					score: judge.primaryPass ? 1 : 0,
					comment: violationSummary,
				});
			}

			return feedback;
		},
	};
}

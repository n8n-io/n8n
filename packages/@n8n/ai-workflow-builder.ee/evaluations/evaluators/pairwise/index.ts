import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import type { SimpleWorkflow } from '@/types/workflow';

import { runJudgePanel, type EvalCriteria } from './judge-panel';
import type { EvaluationContext, Evaluator, Feedback } from '../../harness-types';
import { aggregateGenerations, type GenerationDetail } from '../../multi-gen';

type MultiGenContext = EvaluationContext & {
	generateWorkflow: (prompt: string) => Promise<SimpleWorkflow>;
};

function assertMultiGenContext(ctx: EvaluationContext): asserts ctx is MultiGenContext {
	if (!ctx.generateWorkflow || !ctx.prompt) {
		throw new Error('Multi-gen requires generateWorkflow and prompt in context');
	}
}

/**
 * Options for creating a pairwise evaluator.
 */
export interface PairwiseEvaluatorOptions {
	/** Number of judges to run (default: 3) */
	numJudges?: number;
	/** Number of workflow generations (default: 1, no multi-gen) */
	numGenerations?: number;
}

/**
 * Evaluate a single workflow with a judge panel.
 * Returns feedback with majority pass, diagnostic score, and per-judge results.
 */
async function evaluateSingleGeneration(
	llm: BaseChatModel,
	workflow: SimpleWorkflow,
	ctx: EvaluationContext,
	numJudges: number,
): Promise<Feedback[]> {
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
}

/**
 * Evaluate multiple workflow generations with a judge panel each.
 * Returns aggregated feedback with generation correctness and per-generation details.
 */
async function evaluateMultiGeneration(
	llm: BaseChatModel,
	ctx: MultiGenContext,
	numJudges: number,
	numGenerations: number,
): Promise<Feedback[]> {
	const evalCriteria: EvalCriteria = {
		dos: ctx?.dos ?? 'Follow the user prompt accurately',
		donts: ctx?.donts ?? 'Do not add unnecessary complexity',
	};

	// Generate all workflows and evaluate in parallel
	const generationDetails: GenerationDetail[] = await Promise.all(
		Array.from({ length: numGenerations }, async () => {
			const workflow = await ctx.generateWorkflow(ctx.prompt);
			const result = await runJudgePanel(llm, workflow, evalCriteria, numJudges);
			return {
				workflow,
				majorityPass: result.majorityPass,
				diagnosticScore: result.avgDiagnosticScore,
				primaryPasses: result.primaryPasses,
				numJudges,
			};
		}),
	);

	// Aggregate results
	const aggregation = aggregateGenerations(generationDetails);

	// Build feedback
	const feedback: Feedback[] = [
		{
			key: 'pairwise.generationCorrectness',
			score: aggregation.generationCorrectness,
			comment: `${aggregation.passingGenerations}/${aggregation.totalGenerations} generations passed`,
		},
		{
			key: 'pairwise.aggregatedDiagnostic',
			score: aggregation.aggregatedDiagnosticScore,
		},
	];

	// Per-generation details
	aggregation.generationDetails.forEach((gen, i) => {
		feedback.push({
			key: `pairwise.gen${i + 1}.majorityPass`,
			score: gen.majorityPass ? 1 : 0,
			comment: `${gen.primaryPasses}/${gen.numJudges} judges`,
		});
		feedback.push({
			key: `pairwise.gen${i + 1}.diagnosticScore`,
			score: gen.diagnosticScore,
		});
	});

	return feedback;
}

/**
 * Create a pairwise evaluator that uses a panel of judges.
 * Each judge evaluates the workflow against dos/donts criteria.
 *
 * For single generation (default): evaluates the provided workflow.
 * For multi-generation: generates N workflows and aggregates results.
 *
 * @param llm - Language model for evaluation
 * @param options - Configuration options
 * @returns An evaluator that produces feedback from pairwise evaluation
 *
 * @example Single generation
 * ```typescript
 * const evaluator = createPairwiseEvaluator(llm, { numJudges: 3 });
 * const feedback = await evaluator.evaluate(workflow, { dos, donts });
 * ```
 *
 * @example Multi-generation
 * ```typescript
 * const evaluator = createPairwiseEvaluator(llm, { numJudges: 3, numGenerations: 5 });
 * const feedback = await evaluator.evaluate(workflow, {
 *   dos, donts,
 *   prompt: "Create a workflow...",
 *   generateWorkflow: async (p) => agent.generate(p),
 * });
 * ```
 */
export function createPairwiseEvaluator(
	llm: BaseChatModel,
	options?: PairwiseEvaluatorOptions,
): Evaluator<EvaluationContext> {
	const numJudges = options?.numJudges ?? 3;
	const numGenerations = options?.numGenerations ?? 1;

	return {
		name: 'pairwise',

		async evaluate(workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			// Single generation (existing behavior)
			if (numGenerations === 1) {
				return await evaluateSingleGeneration(llm, workflow, ctx, numJudges);
			}

			// Multi-generation - validate required context
			assertMultiGenContext(ctx);
			return await evaluateMultiGeneration(llm, ctx, numJudges, numGenerations);
		},
	};
}

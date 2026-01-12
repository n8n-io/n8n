import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import type { SimpleWorkflow } from '@/types/workflow';

import { runJudgePanel, type EvalCriteria } from './judge-panel';
import { PAIRWISE_METRICS } from './metrics';
import { runWithOptionalLimiter, withTimeout } from '../../harness/evaluation-helpers';
import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';
import { aggregateGenerations, type GenerationDetail } from '../../harness/multi-gen';

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

	// v1-compatible single-generation metrics
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
		// Build comment from violations
		const violationSummary =
			judge.violations.length > 0
				? judge.violations.map((v) => `[${v.rule}] ${v.justification}`).join('; ')
				: undefined;
		feedback.push({
			evaluator: 'pairwise',
			metric: `judge${i + 1}`,
			score: judge.primaryPass ? 1 : 0,
			kind: 'detail',
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
		dos: ctx?.dos,
		donts: ctx?.donts,
	};

	// Generate all workflows and evaluate in parallel
	const generationRuns = await Promise.all(
		Array.from({ length: numGenerations }, async (_, i) => {
			const workflow = await runWithOptionalLimiter(async () => {
				return await withTimeout({
					promise: ctx.generateWorkflow(ctx.prompt),
					timeoutMs: ctx.timeoutMs,
					label: 'pairwise:workflow_generation',
				});
			}, ctx.llmCallLimiter);
			const result = await runJudgePanel(llm, workflow, evalCriteria, numJudges, {
				generationIndex: i + 1,
				llmCallLimiter: ctx.llmCallLimiter,
				timeoutMs: ctx.timeoutMs,
			});
			return { workflow, result };
		}),
	);

	const generationDetails: GenerationDetail[] = generationRuns.map(({ workflow, result }) => ({
		workflow,
		majorityPass: result.majorityPass,
		diagnosticScore: result.avgDiagnosticScore,
		primaryPasses: result.primaryPasses,
		numJudges,
	}));

	// Aggregate results
	const aggregation = aggregateGenerations(generationDetails);

	// Build feedback
	const feedback: Feedback[] = [
		{
			evaluator: 'pairwise',
			metric: PAIRWISE_METRICS.PAIRWISE_GENERATION_CORRECTNESS,
			score: aggregation.generationCorrectness,
			kind: 'score',
			comment: `${aggregation.passingGenerations}/${aggregation.totalGenerations} generations passed`,
		},
		{
			evaluator: 'pairwise',
			metric: PAIRWISE_METRICS.PAIRWISE_AGGREGATED_DIAGNOSTIC,
			score: aggregation.aggregatedDiagnosticScore,
			kind: 'metric',
		},
		{
			evaluator: 'pairwise',
			metric: PAIRWISE_METRICS.PAIRWISE_GENERATIONS_PASSED,
			score: aggregation.passingGenerations,
			kind: 'detail',
		},
		{
			evaluator: 'pairwise',
			metric: PAIRWISE_METRICS.PAIRWISE_TOTAL_JUDGE_CALLS,
			score: aggregation.totalGenerations * numJudges,
			kind: 'detail',
		},
	];

	// Per-judge details (one set per generation)
	generationRuns.forEach(({ result }, genIndex) => {
		for (let i = 0; i < result.judgeResults.length; i++) {
			const judge = result.judgeResults[i];
			const violationSummary =
				judge.violations.length > 0
					? judge.violations.map((v) => `[${v.rule}] ${v.justification}`).join('; ')
					: undefined;

			feedback.push({
				evaluator: 'pairwise',
				metric: `gen${genIndex + 1}.judge${i + 1}`,
				score: judge.primaryPass ? 1 : 0,
				kind: 'detail',
				comment: violationSummary,
			});
		}
	});

	// Per-generation details
	aggregation.generationDetails.forEach((gen, i) => {
		feedback.push({
			evaluator: 'pairwise',
			metric: `gen${i + 1}.majorityPass`,
			score: gen.majorityPass ? 1 : 0,
			kind: 'detail',
			comment: `${gen.primaryPasses}/${gen.numJudges} judges`,
		});
		feedback.push({
			evaluator: 'pairwise',
			metric: `gen${i + 1}.diagnosticScore`,
			score: gen.diagnosticScore,
			kind: 'detail',
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

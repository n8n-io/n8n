import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';

import type { ResponderEvalCriteria } from './responder-judge.prompt';
import { buildResponderJudgePrompt } from './responder-judge.prompt';
import { runWithOptionalLimiter, withTimeout } from '../../harness/evaluation-helpers';
import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';
import { DEFAULTS } from '../../support/constants';

const EVALUATOR_NAME = 'responder-judge';

export interface ResponderEvaluatorOptions {
	/** Number of judges to run in parallel (default: DEFAULTS.NUM_JUDGES) */
	numJudges?: number;
}

interface ResponderJudgeDimension {
	score: number;
	comment: string;
}

interface ResponderJudgeResult {
	relevance: ResponderJudgeDimension;
	accuracy: ResponderJudgeDimension;
	completeness: ResponderJudgeDimension;
	clarity: ResponderJudgeDimension;
	tone: ResponderJudgeDimension;
	criteriaMatch: ResponderJudgeDimension;
	forbiddenPhrases: ResponderJudgeDimension;
	overallScore: number;
	summary: string;
}

/**
 * Context for responder evaluation, extends standard EvaluationContext
 * with the responder output and per-example criteria.
 */
export interface ResponderEvaluationContext extends EvaluationContext {
	/** The text output from the responder agent */
	responderOutput: string;
	/** Per-example evaluation criteria from the dataset */
	responderEvals: ResponderEvalCriteria;
	/** The actual workflow JSON for accuracy verification */
	workflowJSON?: unknown;
}

function isResponderContext(ctx: EvaluationContext): ctx is ResponderEvaluationContext {
	return (
		'responderOutput' in ctx &&
		typeof (ctx as ResponderEvaluationContext).responderOutput === 'string' &&
		'responderEvals' in ctx &&
		typeof (ctx as ResponderEvaluationContext).responderEvals === 'object'
	);
}

function parseJudgeResponse(content: string): ResponderJudgeResult {
	// Extract JSON from markdown code block if present
	const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
	const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
	try {
		return JSON.parse(jsonStr) as ResponderJudgeResult;
	} catch {
		throw new Error(`Failed to parse judge response as JSON: ${jsonStr.slice(0, 100)}...`);
	}
}

const DIMENSION_KEYS = [
	'relevance',
	'accuracy',
	'completeness',
	'clarity',
	'tone',
	'criteriaMatch',
	'forbiddenPhrases',
] as const;

const fb = (metric: string, score: number, kind: Feedback['kind'], comment?: string): Feedback => ({
	evaluator: EVALUATOR_NAME,
	metric,
	score,
	kind,
	...(comment ? { comment } : {}),
});

/** Run a single judge invocation and return the parsed result. */
async function runSingleJudge(
	llm: BaseChatModel,
	ctx: ResponderEvaluationContext,
	judgeIndex: number,
): Promise<ResponderJudgeResult> {
	const judgePrompt = buildResponderJudgePrompt({
		userPrompt: ctx.prompt,
		responderOutput: ctx.responderOutput,
		evalCriteria: ctx.responderEvals,
		workflowJSON: ctx.workflowJSON,
	});

	return await runWithOptionalLimiter(async () => {
		const response = await withTimeout({
			promise: llm.invoke([new HumanMessage(judgePrompt)], {
				runName: `responder_judge_${judgeIndex + 1}`,
			}),
			timeoutMs: ctx.timeoutMs,
			label: `responder-judge:evaluate:judge_${judgeIndex + 1}`,
		});

		const content =
			typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

		return parseJudgeResponse(content);
	}, ctx.llmCallLimiter);
}

/** Aggregate results from multiple judges into feedback items. */
function aggregateResults(results: ResponderJudgeResult[], numJudges: number): Feedback[] {
	const feedback: Feedback[] = [];

	// Per-dimension averaged metrics
	for (const key of DIMENSION_KEYS) {
		const avgScore =
			results.reduce((sum, r) => {
				const dimension = r[key];
				return sum + (dimension?.score ?? 0);
			}, 0) / numJudges;
		const comments = results
			.map((r, i) => {
				const dimension = r[key];
				return `[Judge ${i + 1}] ${dimension?.comment ?? 'No comment'}`;
			})
			.join(' | ');
		feedback.push(fb(key, avgScore, 'metric', comments));
	}

	// Aggregated overall score
	const avgOverall = results.reduce((sum, r) => sum + r.overallScore, 0) / numJudges;
	feedback.push(
		fb(
			'overallScore',
			avgOverall,
			'score',
			`${numJudges}/${numJudges} judges averaged ${avgOverall.toFixed(2)}`,
		),
	);

	// Per-judge detail items
	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		feedback.push(fb(`judge${i + 1}`, r.overallScore, 'detail', `Judge ${i + 1}: ${r.summary}`));
	}

	return feedback;
}

/**
 * Create a responder LLM-judge evaluator.
 *
 * Uses an LLM to evaluate responder output against per-example criteria
 * from the dataset. The evaluator expects a ResponderEvaluationContext
 * with `responderOutput` and `responderEvals` fields.
 *
 * When `numJudges > 1`, runs multiple judge calls in parallel and aggregates
 * dimension scores (averaged) and per-judge detail feedback.
 *
 * @param llm - The LLM to use for judging
 * @param options - Optional configuration (e.g. numJudges)
 * @returns An evaluator that produces feedback for responder output
 */
export function createResponderEvaluator(
	llm: BaseChatModel,
	options?: ResponderEvaluatorOptions,
): Evaluator<EvaluationContext> {
	const numJudges = options?.numJudges ?? DEFAULTS.NUM_JUDGES;

	return {
		name: EVALUATOR_NAME,

		async evaluate(_workflow, ctx: EvaluationContext): Promise<Feedback[]> {
			if (!isResponderContext(ctx)) {
				return [
					fb(
						'error',
						0,
						'score',
						'Missing responderOutput or responderEvals in evaluation context',
					),
				];
			}

			const results = await Promise.all(
				Array.from({ length: numJudges }, async (_, i) => await runSingleJudge(llm, ctx, i)),
			);

			return aggregateResults(results, numJudges);
		},
	};
}

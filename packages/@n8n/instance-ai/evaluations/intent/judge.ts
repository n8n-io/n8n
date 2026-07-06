// ---------------------------------------------------------------------------
// LLM-judged secondary signals for intent-resolution cases: rationale
// quality (0-2, informational) and whether clarifying questions target the
// expected dimensions. Both are independent of the deterministic
// anchor/embeds_other grading in grade.ts.
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { SONNET_MODEL, createEvalAgent } from '../../src/utils/eval-agents';
import {
	INTENT_CLARIFY_DIMENSIONS_JUDGE_PROMPT,
	INTENT_RATIONALE_JUDGE_PROMPT,
} from '../system-prompts/intent-judge';

const JUDGE_MODEL = SONNET_MODEL;

const rationaleJudgeSchema = z.object({
	score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	reason: z.string(),
});

const clarifyDimensionsJudgeSchema = z.object({
	pass: z.boolean(),
	reason: z.string(),
});

export interface RationaleJudgeResult {
	score: 0 | 1 | 2;
	reason: string;
}

/** Judge how well a predicted rationale identifies the correct anchor-deciding
 *  signals, against the case's authored rationale. Returns `undefined` on
 *  judge error/timeout — callers should treat that as "no verdict", not a 0. */
export async function judgeRationale(args: {
	expectedRationale: string;
	predictedRationale: string;
}): Promise<RationaleJudgeResult | undefined> {
	const agent = createEvalAgent('eval-intent-rationale-judge', {
		instructions: INTENT_RATIONALE_JUDGE_PROMPT,
		model: JUDGE_MODEL,
	}).structuredOutput(rationaleJudgeSchema);

	try {
		const result = await agent.generate([
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: [
							`Expected rationale: ${args.expectedRationale}`,
							`Predicted rationale: ${args.predictedRationale}`,
						].join('\n'),
					},
				],
			},
		]);
		const parsed = rationaleJudgeSchema.safeParse(result.structuredOutput);
		return parsed.success ? parsed.data : undefined;
	} catch (error: unknown) {
		console.warn(
			`[intent-judge] rationale judge failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return undefined;
	}
}

export interface ClarifyDimensionsJudgeResult {
	pass: boolean;
	reason: string;
}

/** Judge whether any of the model's clarifying questions target an expected
 *  clarifying dimension. On judge error, fails (with the error as the
 *  reason) — mirroring `allFailVerdicts` in build-expectations/verifier.ts,
 *  since a missing verdict here should not silently pass the case. */
export async function judgeClarifyDimensions(args: {
	clarifyingQuestions: string[];
	expectedDimensions: string[];
}): Promise<ClarifyDimensionsJudgeResult> {
	const agent = createEvalAgent('eval-intent-clarify-dimensions-judge', {
		instructions: INTENT_CLARIFY_DIMENSIONS_JUDGE_PROMPT,
		model: JUDGE_MODEL,
	}).structuredOutput(clarifyDimensionsJudgeSchema);

	try {
		const result = await agent.generate([
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: [
							`Expected clarifying dimensions: ${args.expectedDimensions.join(', ')}`,
							'Asked clarifying questions:',
							...args.clarifyingQuestions.map((q) => `- ${q}`),
						].join('\n'),
					},
				],
			},
		]);
		const parsed = clarifyDimensionsJudgeSchema.safeParse(result.structuredOutput);
		if (parsed.success) return parsed.data;
		return { pass: false, reason: 'judge produced no parseable verdict' };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[intent-judge] clarify-dimensions judge failed: ${message}`);
		return { pass: false, reason: `judge error: ${message}` };
	}
}

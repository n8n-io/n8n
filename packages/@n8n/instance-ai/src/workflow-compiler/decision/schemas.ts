import { z } from 'zod';

/**
 * Bounded decision protocol. Mirrors the `/v1/systemone` structured-read
 * contract: the application defines a small set of allowed answers, the model
 * scores them, and the application owns the policy applied to the scores.
 */

const probabilitySchema = z.number().min(0).max(1);

export const noulQuestionSchema = z.object({
	type: z.literal('noul'),
	instructions: z.string().min(1),
	criteria: z
		.object({
			true: z.string().optional(),
			false: z.string().optional(),
		})
		.optional(),
});

export const choiceQuestionSchema = z.object({
	type: z.literal('choice'),
	instructions: z.string().min(1),
	/** Semantic option name → criterion. A `null` criterion keeps the name self-describing. */
	criteria: z.record(z.string().min(1), z.string().nullable()),
});

export const scoreQuestionSchema = z.object({
	type: z.literal('score'),
	instructions: z.string().min(1),
	/** Ordered levels, lowest first. */
	criteria: z.array(z.string().min(1)).min(2),
});

export const decisionQuestionSchema = z.discriminatedUnion('type', [
	noulQuestionSchema,
	choiceQuestionSchema,
	scoreQuestionSchema,
]);

export const decisionQuestionsSchema = z.record(z.string().min(1), decisionQuestionSchema);

export const noulAnswerSchema = z.object({
	type: z.literal('noul'),
	noul: probabilitySchema,
});

export const choiceAnswerSchema = z.object({
	type: z.literal('choice'),
	choice: z.string(),
	probabilities: z.record(z.string(), probabilitySchema),
	confidence: probabilitySchema,
});

export const scoreAnswerSchema = z.object({
	type: z.literal('score'),
	score: z.number(),
	legend: z.record(z.string(), z.string()),
	probabilities: z.record(z.string(), probabilitySchema),
	confidence: probabilitySchema,
});

export const decisionAnswerSchema = z
	.discriminatedUnion('type', [noulAnswerSchema, choiceAnswerSchema, scoreAnswerSchema])
	.nullable();

export const decisionResponseSchema = z.object({
	model: z.string(),
	answers: z.record(z.string(), decisionAnswerSchema),
	usage: z
		.object({
			input_tokens: z.number().nonnegative(),
			output_tokens: z.number().nonnegative(),
		})
		.optional(),
	diagnostics: z
		.object({
			timing: z
				.object({
					reads: z.number().nonnegative().optional(),
					total_ms: z.number().nonnegative().optional(),
				})
				.optional(),
		})
		.optional(),
});

export type NoulQuestion = z.infer<typeof noulQuestionSchema>;
export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type ScoreQuestion = z.infer<typeof scoreQuestionSchema>;
export type DecisionQuestion = z.infer<typeof decisionQuestionSchema>;
export type DecisionQuestions = z.infer<typeof decisionQuestionsSchema>;
export type NoulAnswer = z.infer<typeof noulAnswerSchema>;
export type ChoiceAnswer = z.infer<typeof choiceAnswerSchema>;
export type ScoreAnswer = z.infer<typeof scoreAnswerSchema>;
export type DecisionAnswer = z.infer<typeof decisionAnswerSchema>;
export type DecisionResponse = z.infer<typeof decisionResponseSchema>;

/** State sent with a decision request. Send only what the decision needs. */
export type DecisionState = Record<string, unknown>;

/** Reserved option that lets a choice decline every listed candidate. */
export const NONE_OF_THESE = 'none_of_these';

/** Adds the reserved abstention option to a candidate map. */
export function withNoneOfThese(
	criteria: Record<string, string | null>,
	description = 'None of the listed options fits.',
): Record<string, string | null> {
	return { ...criteria, [NONE_OF_THESE]: description };
}

/**
 * Cross-checks a validated response against the questions that were asked.
 * Answers for unknown questions are dropped and a choice outside the allowed
 * option set is nulled, so downstream policy fails closed instead of coercing.
 */
export function reconcileAnswers(
	questions: DecisionQuestions,
	answers: DecisionResponse['answers'],
): { answers: Record<string, DecisionAnswer>; problems: string[] } {
	const problems: string[] = [];
	const reconciled: Record<string, DecisionAnswer> = {};
	for (const [name, question] of Object.entries(questions)) {
		const answer = answers[name];
		if (answer === undefined || answer === null) {
			reconciled[name] = null;
			if (answer === undefined) problems.push(`missing answer for "${name}"`);
			continue;
		}
		if (answer.type !== question.type) {
			reconciled[name] = null;
			problems.push(`answer type "${answer.type}" for "${name}" does not match "${question.type}"`);
			continue;
		}
		if (answer.type === 'choice' && question.type === 'choice') {
			if (!(answer.choice in question.criteria)) {
				reconciled[name] = null;
				problems.push(`unknown choice "${answer.choice}" for "${name}"`);
				continue;
			}
		}
		if (answer.type === 'score' && question.type === 'score') {
			const max = question.criteria.length - 1;
			if (!Number.isFinite(answer.score) || answer.score < 0 || answer.score > max) {
				reconciled[name] = null;
				problems.push(`score ${answer.score} for "${name}" is outside 0..${max}`);
				continue;
			}
		}
		reconciled[name] = answer;
	}
	for (const name of Object.keys(answers)) {
		if (!(name in questions)) problems.push(`unexpected answer "${name}"`);
	}
	return { answers: reconciled, problems };
}

import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { ASK_USER_TOOL_ID } from '../tool-ids';

export { ASK_USER_TOOL_ID };

const questionSchema = z.object({
	id: z.string().describe('Unique question identifier'),
	question: z.string().describe('The question text to display to the user'),
	type: z
		.enum(['single', 'multi', 'text'])
		.describe('single = pick one option, multi = pick many, text = free-form input'),
	options: z
		.array(z.string())
		.optional()
		.describe('Up to two alternatives to the recommended answer. Ignored for text questions.'),
	recommendedOption: z
		.string()
		.optional()
		.describe(
			"The default answer as plain text, in the user's language. " +
				'Use a safe placeholder or defer setup when a value cannot be inferred. Do not repeat this answer in options.',
		),
});

const questionInputSchema = questionSchema.extend({
	options: z
		.array(z.string())
		.max(2, {
			message:
				'Too many alternative answers. Retry ask-user with at most 2 entries in this options array. ' +
				'Put the default answer only in recommendedOption. The tool adds it as the first option, ' +
				'for at most 3 suggested answers in total. Keep the two most useful alternatives. ' +
				'Do not add "Something else"; the UI provides it.',
		})
		.optional()
		.describe('Up to two alternatives to the recommended answer. Ignored for text questions.'),
	recommendedOption: questionSchema.shape.recommendedOption.unwrap().trim().min(1),
});

const answerSchema = z.object({
	questionId: z.string(),
	selectedOptions: z.array(z.string()),
	customText: z.string().optional(),
	skipped: z.boolean().optional(),
});

// The runtime validates persisted input again when a suspended call resumes.
export const askUserInputSchema = z.object({
	questions: z
		.array(questionSchema)
		.min(1)
		.describe('One to three essential questions. Ask one independent decision per question.'),
	introMessage: z.string().optional().describe('Brief intro text shown above the first question'),
});

const newAskUserInputSchema = askUserInputSchema.extend({
	questions: z
		.array(
			questionInputSchema.or(
				// Legacy text questions can have no suggested answer.
				questionInputSchema.extend({
					type: z.literal('text'),
					recommendedOption: z.undefined(),
				}),
			),
		)
		.min(1)
		.max(3, {
			message:
				'Too many questions. Retry ask-user with 1 to 3 entries in questions. ' +
				'Keep only the highest-priority decisions needed to continue. Ask one decision per question. ' +
				'Use sensible defaults or defer setup for the remaining details. ' +
				'Do not combine the removed questions into one question. Do not send consecutive batches ' +
				'unless the user explicitly requested an in-depth interview. Even then, keep each call to 3 questions.',
		})
		.describe('One to three essential questions. Ask one independent decision per question.'),
});

export const askUserResumeSchema = z.object({
	approved: z.boolean(),
	answers: z.array(answerSchema).optional(),
});

export function createAskUserTool() {
	return new Tool(ASK_USER_TOOL_ID)
		.description(
			'Ask the user when only a human can decide; the run suspends until they respond. ' +
				'Ask at most three questions per call. Prefer one question. ' +
				'Provide a recommendedOption for every question with explicit, concrete defaults. ' +
				'The tool shows it first. Text questions use a select question with the built-in custom answer input. ' +
				'When the user selects defaults, use those defaults and continue the work. ' +
				'Do not split a long questionnaire into consecutive calls unless the user explicitly requests an in-depth interview. ' +
				'Before the first build-workflow call, use only for choices that change workflow intent or topology ' +
				'(e.g. destination service) — setup values (recipients, accounts, resources, channels, credentials, ' +
				'timezone) use placeholders or unresolved newCredential() calls instead. ' +
				'The UI adds a built-in "Something else" free-text input to every select question: NEVER include ' +
				'catch-all options ("Something else", "Other", "None of the above") in the options array, and NEVER ' +
				'add a follow-up question elaborating a previous "other" answer. Keep questions concise and independent ' +
				"of each other's answers. A question is asked at most once — a skip or dismissal (answered: false, or " +
				'skipped: true) means "proceed without this": assume a sensible default or leave the detail for setup, ' +
				'and NEVER re-present an answered, deferred, or skipped question. ' +
				'NEVER ask the user to paste passwords, API keys, tokens, cookies, connection strings, or private keys here.',
		)
		.input(askUserInputSchema)
		.output(
			z.object({
				answered: z.boolean(),
				answers: z
					.array(
						z.object({
							questionId: z.string(),
							question: z.string(),
							selectedOptions: z.array(z.string()),
							customText: z.string().optional(),
							skipped: z.boolean().optional(),
						}),
					)
					.optional(),
			}),
		)
		.suspend(
			z.object({
				requestId: z.string(),
				message: z.string(),
				severity: z.literal('info'),
				inputType: z.literal('questions'),
				questions: z.array(questionSchema),
				introMessage: z.string().optional(),
			}),
		)
		.resume(askUserResumeSchema)
		.handler(async (input: z.infer<typeof askUserInputSchema>, ctx) => {
			const resumeData = ctx.resumeData;

			// First call — always suspend to show questions
			if (resumeData === undefined || resumeData === null) {
				const { questions } = newAskUserInputSchema.parse({
					...input,
					questions: input.questions.map((question) =>
						question.recommendedOption === undefined
							? {
									...question,
									recommendedOption: question.options?.[0],
									options: question.options?.slice(1),
								}
							: question,
					),
				});
				return await ctx.suspend({
					requestId: nanoid(),
					message: input.introMessage ?? input.questions[0].question,
					severity: 'info' as const,
					inputType: 'questions' as const,
					questions: questions.map(({ recommendedOption, ...question }) =>
						recommendedOption === undefined
							? question
							: {
									...question,
									recommendedOption,
									type: question.type === 'text' ? 'single' : question.type,
									options: [
										recommendedOption,
										...(question.type === 'text' ? [] : (question.options ?? [])).filter(
											(option) => option !== recommendedOption,
										),
									],
								},
					),
					introMessage: input.introMessage,
				});
			}

			// User skipped or dismissed
			if (!resumeData.approved || !resumeData.answers) {
				return { answered: false };
			}

			// Merge question text into answers for LLM context
			const enrichedAnswers = resumeData.answers.map((a: z.infer<typeof answerSchema>) => {
				const q = input.questions.find(
					(q2: z.infer<typeof questionSchema>) => q2.id === a.questionId,
				);
				return {
					...a,
					question: q?.question ?? a.questionId,
				};
			});

			return { answered: true, answers: enrichedAnswers };
		})
		.build();
}

import { Tool } from '@n8n/agents';
import { getLegacyBuilderToolNames } from '@n8n/api-types';
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
		.describe('Suggested answers (required for single/multi, ignored for text)'),
	required: z
		.boolean()
		.optional()
		.describe('true hides Skip: the user must answer before they can submit'),
	freeTextLabel: z
		.string()
		.optional()
		.describe('Label of the built-in free-text row, "Something else" by default'),
});

const answerSchema = z.object({
	questionId: z.string(),
	selectedOptions: z.array(z.string()),
	customText: z.string().optional(),
	skipped: z.boolean().optional(),
});

export const askUserInputSchema = z.object({
	questions: z
		.array(questionSchema)
		.min(1)
		.describe('Questions to present to the user in a paginated wizard'),
	introMessage: z.string().optional().describe('Brief intro text shown above the first question'),
});

export const askUserResumeSchema = z.object({
	approved: z.boolean(),
	answers: z.array(answerSchema).optional(),
});

export function createAskUserTool() {
	return new Tool(ASK_USER_TOOL_ID)
		.legacyNames(...getLegacyBuilderToolNames(ASK_USER_TOOL_ID))
		.description(
			'Ask the user questions and wait for their answers. ' +
				'When the request does not yet say what to build (no trigger, no steps, no named workflow or Agent), ' +
				'ask about the goal: the result the user wants, whether it happens once now or keeps running, and ' +
				'whether people chat with it. Do not call it a workflow or an Agent yet, and do not ask about triggers or nodes. ' +
				'The UI adds a "Something else" input to every select question, so never add catch-all options ' +
				'("Other", "None of the above") to `options`.',
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
				return await ctx.suspend({
					requestId: nanoid(),
					message: input.introMessage ?? input.questions[0].question,
					severity: 'info' as const,
					inputType: 'questions' as const,
					questions: input.questions,
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

import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

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
	return createTool({
		id: 'ask-user',
		description:
			'Ask the user one or more structured questions. Each question can be ' +
			'single-select (pick one), multi-select (pick many), or free-text. ' +
			'The agent is suspended until the user responds. ' +
			'IMPORTANT: The UI already provides a built-in "Something else" free-text ' +
			'input for every single/multi question, so NEVER include generic catch-all ' +
			'options like "Something else", "Other", "None of the above", or similar in ' +
			'the options array — they duplicate the built-in input and confuse users. ' +
			'Also NEVER add a separate follow-up question asking the user to elaborate ' +
			'on a previous "other" choice. Keep questions concise and ' +
			'avoid questions that reference answers to previous questions.',
		inputSchema: askUserInputSchema,
		outputSchema: z.object({
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
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: z.literal('info'),
			inputType: z.literal('questions'),
			questions: z.array(questionSchema),
			introMessage: z.string().optional(),
		}),
		resumeSchema: askUserResumeSchema,
		execute: async (input: z.infer<typeof askUserInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as z.infer<typeof askUserResumeSchema> | undefined;
			const suspend = ctx?.agent?.suspend;

			// First call — always suspend to show questions
			if (resumeData === undefined || resumeData === null) {
				await suspend?.({
					requestId: nanoid(),
					message: input.introMessage ?? input.questions[0].question,
					severity: 'info' as const,
					inputType: 'questions' as const,
					questions: input.questions,
					introMessage: input.introMessage,
				});
				// suspend() never resolves
				return { answered: false };
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
		},
	});
}

import { createTool } from '@mastra/core/tools';
import { instanceAiPlannerQuestionSchema, instanceAiQuestionResponseSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export function createAskPlanQuestionsTool() {
	return createTool({
		id: 'ask-plan-questions',
		description:
			'Ask a small number of structured clarifying questions before creating or revising a plan. Use this only for genuine blockers that materially change the build plan.',
		inputSchema: z.object({
			introMessage: z
				.string()
				.optional()
				.describe('Short intro that explains why these clarifying answers are needed.'),
			questions: z
				.array(instanceAiPlannerQuestionSchema)
				.min(1)
				.max(3)
				.describe(
					'Structured clarifying questions for the user. Ask at most 3, only for information that truly blocks planning. Do not include conditional "otherwise leave blank" follow-up questions.',
				),
		}),
		outputSchema: z.object({
			answered: z.boolean(),
			answers: z.array(instanceAiQuestionResponseSchema).optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			introMessage: z.string().optional(),
			severity: z.literal('info'),
			inputType: z.literal('questions'),
			questions: z.array(instanceAiPlannerQuestionSchema),
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
			answers: z.array(instanceAiQuestionResponseSchema).optional(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			if (resumeData === undefined || resumeData === null) {
				await suspend?.({
					requestId: nanoid(),
					message: input.introMessage ?? 'I need a bit more detail before I can build the plan.',
					introMessage: input.introMessage,
					severity: 'info' as const,
					inputType: 'questions' as const,
					questions: input.questions,
				});
				return { answered: false };
			}

			if (!resumeData.approved) {
				return { answered: false };
			}

			return {
				answered: true,
				answers: resumeData.answers ?? [],
			};
		},
	});
}

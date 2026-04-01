import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

const templateSchema = z.object({
	templateId: z.number(),
	name: z.string(),
	description: z.string().optional(),
});

const templateChoiceSchema = z.object({
	action: z.enum(['adapt_with_agent', 'use_now']),
	templateId: z.number(),
	templateName: z.string(),
});

const templateChangeQuestionSchema = z.object({
	id: z.literal('template_changes'),
	question: z.literal('What would you like to change?'),
	type: z.literal('text'),
});

const templateChangeAnswerSchema = z.object({
	questionId: z.literal('template_changes'),
	selectedOptions: z.array(z.string()),
	customText: z.string().optional(),
	skipped: z.boolean().optional(),
});

export function createChooseWorkflowTemplateTool(context?: OrchestrationContext) {
	return createTool({
		id: 'choose-workflow-template',
		description:
			'Present curated workflow template matches to the user. If they choose adapt_with_agent, ask what they want to change before returning the selection.',
		inputSchema: z.object({
			templates: z.array(templateSchema).min(1),
			totalResults: z.number().int().nonnegative(),
			introMessage: z.string().optional(),
		}),
		outputSchema: z.object({
			selected: z.boolean(),
			action: z.enum(['adapt_with_agent', 'use_now']).optional(),
			templateId: z.number().optional(),
			templateName: z.string().optional(),
			requestedChanges: z.string().optional(),
			answers: z.array(templateChangeAnswerSchema).optional(),
		}),
		suspendSchema: z.union([
			z.object({
				requestId: z.string(),
				message: z.string(),
				severity: z.literal('info'),
				inputType: z.literal('template-choice'),
				templates: z.array(templateSchema),
				totalResults: z.number(),
				introMessage: z.string().optional(),
			}),
			z.object({
				requestId: z.string(),
				message: z.string(),
				severity: z.literal('info'),
				inputType: z.literal('questions'),
				questions: z.array(templateChangeQuestionSchema),
				selectedTemplateChoice: templateChoiceSchema,
				introMessage: z.string().optional(),
			}),
		]),
		resumeSchema: z.object({
			approved: z.boolean(),
			templateChoice: templateChoiceSchema.optional(),
			answers: z.array(templateChangeAnswerSchema).optional(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			if (resumeData === undefined || resumeData === null) {
				await suspend?.({
					requestId: nanoid(),
					message: input.introMessage ?? `Pick one of ${input.templates.length} templates`,
					severity: 'info' as const,
					inputType: 'template-choice' as const,
					templates: input.templates,
					totalResults: input.totalResults,
					introMessage: input.introMessage,
				});
				return { selected: false };
			}

			if (!resumeData.approved || !resumeData.templateChoice) {
				return { selected: false };
			}

			if (resumeData.templateChoice.action === 'adapt_with_agent' && !resumeData.answers?.length) {
				if (context) {
					context.templateAdaptationRequiresPlanReview = true;
				}
				await suspend?.({
					requestId: nanoid(),
					message: 'What would you like to change?',
					severity: 'info' as const,
					inputType: 'questions' as const,
					questions: [
						{
							id: 'template_changes',
							question: 'What would you like to change?',
							type: 'text',
						},
					],
					selectedTemplateChoice: resumeData.templateChoice,
				});
				return { selected: false };
			}

			return {
				selected: true,
				action: resumeData.templateChoice.action,
				templateId: resumeData.templateChoice.templateId,
				templateName: resumeData.templateChoice.templateName,
				...(resumeData.templateChoice.action === 'adapt_with_agent' && resumeData.answers?.length
					? {
							requestedChanges: resumeData.answers
								.map((answer) => answer.customText?.trim())
								.find((text): text is string => Boolean(text)),
							answers: resumeData.answers,
						}
					: {}),
			};
		},
	});
}

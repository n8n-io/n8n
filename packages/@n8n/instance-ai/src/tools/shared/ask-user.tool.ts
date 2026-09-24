import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext, ResolvedUserDecision } from '../../types';
import { recordUserDecisions } from '../orchestration/parent-handoff-state';
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

function toDecision(
	question: string,
	answer?: { selectedOptions: string[]; customText?: string; skipped?: boolean },
): ResolvedUserDecision {
	if (!answer || answer.skipped) {
		return {
			question,
			answer: '(skipped)',
			skipped: true,
		};
	}
	const text = [...answer.selectedOptions, answer.customText]
		.filter((part): part is string => Boolean(part))
		.join(', ');
	return text
		? { question, answer: text, skipped: false }
		: { question, answer: '(skipped)', skipped: true };
}

export function createAskUserTool(context?: InstanceAiContext) {
	return new Tool(ASK_USER_TOOL_ID)
		.description(
			'Ask the user when only a human can decide; the run suspends until they respond. ' +
				'Questions are single-select, multi-select, or free-text. ' +
				'Before the first build-workflow call, use only for choices that change workflow intent or topology ' +
				'(e.g. destination service) — setup values (recipients, accounts, resources, channels, credentials, ' +
				'timezone) use placeholders or unresolved newCredential() calls instead. ' +
				'The UI adds a built-in "Something else" free-text input to every select question: NEVER include ' +
				'catch-all options ("Something else", "Other", "None of the above") in the options array, and NEVER ' +
				'add a follow-up question elaborating a previous "other" answer. Keep questions concise and independent ' +
				"of each other's answers. A skip or dismissal (answered: false, or skipped: true) grants no additional permission. " +
				'Choose defaults only for unspecified details within the requested task, or leave those details for setup. ' +
				'If a skipped question seeks permission to change existing authentication, delete nodes, or expand scope, ' +
				'preserve the existing state and report any remaining blocker. ' +
				'NEVER re-present an answered, deferred, or skipped question. ' +
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
				if (context) {
					await recordUserDecisions(
						context,
						input.questions.map((q) => toDecision(q.question)),
					);
				}
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
			if (context) {
				await recordUserDecisions(
					context,
					enrichedAnswers.map((a) => toDecision(a.question, a)),
				);
			}
			return { answered: true, answers: enrichedAnswers };
		})
		.build();
}

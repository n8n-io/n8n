import { Tool } from '@n8n/agents';
import { getLegacyBuilderToolNames } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { ASK_USER_TOOL_ID } from '../tool-ids';

export { ASK_USER_TOOL_ID };

const questionSchema = z.object({
	id: z.string().optional().describe('Unique question identifier; defaults to q1, q2, ...'),
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

// `approved` is optional because suspended `agent_builder_ask_questions` calls resume here.
export const askUserResumeSchema = z.object({
	approved: z.boolean().optional(),
	answers: z.array(answerSchema).optional(),
});

type Question = z.infer<typeof questionSchema>;
type IdentifiedQuestion = Question & { id: string };
type Answer = z.infer<typeof answerSchema>;

/** Gives each question without an id the first free `qN`, so answers never share an id. */
function withDefaultIds(questions: Question[]): IdentifiedQuestion[] {
	const explicitIds = questions.map((q) => q.id).filter((id): id is string => id !== undefined);
	if (new Set(explicitIds).size !== explicitIds.length) {
		throw new UserError(`${ASK_USER_TOOL_ID}: question ids must be unique`);
	}

	const usedIds = new Set(explicitIds);
	return questions.map((question, index) => {
		if (question.id) return { ...question, id: question.id };

		let candidate = index + 1;
		while (usedIds.has(`q${candidate}`)) candidate++;
		const id = `q${candidate}`;
		usedIds.add(id);
		return { ...question, id };
	});
}

/** A dismissal, no answers, or only skipped answers leave nothing usable. */
function usableAnswers(resumeData: z.infer<typeof askUserResumeSchema>): Answer[] | undefined {
	if (resumeData.approved === false) return undefined;
	if (!resumeData.answers || resumeData.answers.length === 0) return undefined;
	if (resumeData.answers.every((answer) => answer.skipped === true)) return undefined;
	return resumeData.answers;
}

export function createAskUserTool() {
	return new Tool(ASK_USER_TOOL_ID)
		.legacyNames(...getLegacyBuilderToolNames(ASK_USER_TOOL_ID))
		.description(
			'Ask the user when only a human can decide; the run suspends until they respond. ' +
				'Questions are single-select, multi-select, or free-text. ' +
				'Batch every open question into one call instead of calling it again. ' +
				'Before the first build, ask only about choices that change what you build, and do not ask for setup values ' +
				'(recipients, accounts, resources, channels, credentials, timezone); leave them for setup. ' +
				'When the request does not yet say what to build (no trigger, no steps, no named workflow or Agent), ' +
				'ask about the goal: the result the user wants, whether it happens once now or keeps running, and ' +
				'whether people chat with it. Do not call it a workflow or an Agent yet, and do not ask about triggers or nodes. ' +
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
				questions: z.array(questionSchema.extend({ id: z.string() })),
				introMessage: z.string().optional(),
			}),
		)
		.resume(askUserResumeSchema)
		.handler(async (input: z.infer<typeof askUserInputSchema>, ctx) => {
			const questions = withDefaultIds(input.questions);
			const resumeData = ctx.resumeData;

			// First call — always suspend to show questions
			if (resumeData === undefined || resumeData === null) {
				return await ctx.suspend({
					requestId: nanoid(),
					message: input.introMessage ?? questions[0].question,
					severity: 'info' as const,
					inputType: 'questions' as const,
					questions,
					introMessage: input.introMessage,
				});
			}

			const answers = usableAnswers(resumeData);
			if (!answers) return { answered: false };

			// Merge question text into answers for LLM context
			const enrichedAnswers = answers.map((answer) => ({
				...answer,
				question: questions.find((q) => q.id === answer.questionId)?.question ?? answer.questionId,
			}));
			return { answered: true, answers: enrichedAnswers };
		})
		.build();
}

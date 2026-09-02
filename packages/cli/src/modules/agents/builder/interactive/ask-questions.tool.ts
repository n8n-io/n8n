import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	ASK_QUESTIONS_TOOL_NAME,
	questionsResumeSchema,
	questionsSuspendPayloadSchema,
	type InteractionQuestion,
	type QuestionAnswer,
	type QuestionsResumeData,
	type QuestionsSuspendPayload,
} from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { nanoid } from 'nanoid';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTrackFn } from '../builder-config-telemetry';

const askQuestionsQuestionSchema = z.object({
	id: z.string().optional().describe('Unique question identifier; defaults to q1, q2, ...'),
	question: z.string().describe('The question text to display to the user'),
	type: z
		.enum(['single', 'multi', 'text'])
		.describe('single = pick one option, multi = pick many, text = free-form input'),
	options: z
		.array(z.string())
		.optional()
		.describe('Suggested answers (required for single/multi, ignored for text)'),
});

const askQuestionsInputSchema = z.object({
	questions: z
		.array(askQuestionsQuestionSchema)
		.min(1)
		.describe('All questions to ask the user, batched into a single card'),
	introMessage: z.string().optional().describe('Brief intro text shown above the questions'),
});

type AskQuestionsInput = z.infer<typeof askQuestionsInputSchema>;

/**
 * Assign default `q1..qN` ids to questions missing an explicit id, skipping
 * any id already claimed by another question's explicit id so two questions
 * never end up sharing one (which would make the UI's id-keyed map, and the
 * resume payload, conflate their answers).
 */
function withDefaultIds(
	questions: Array<z.infer<typeof askQuestionsQuestionSchema>>,
): InteractionQuestion[] {
	const explicitIds = questions.map((q) => q.id).filter((id): id is string => id !== undefined);
	if (new Set(explicitIds).size !== explicitIds.length) {
		throw new UserError('ask_questions: question ids must be unique');
	}

	const usedIds = new Set(explicitIds);
	return questions.map((question, index) => {
		if (question.id) return { ...question, id: question.id };

		let candidate = index + 1;
		let id = `q${candidate}`;
		while (usedIds.has(id)) {
			candidate++;
			id = `q${candidate}`;
		}
		usedIds.add(id);
		return { ...question, id };
	});
}

/** Merge each answer's question text back in for LLM context — the resume payload only carries ids. */
function enrichAnswers(
	answers: QuestionAnswer[],
	questions: InteractionQuestion[],
): Array<QuestionAnswer & { question: string }> {
	return answers.map((answer) => {
		const question = questions.find((q) => q.id === answer.questionId);
		return { ...answer, question: question?.question ?? answer.questionId };
	});
}

/**
 * A dismissal, an empty answer set, or every answer explicitly skipped is
 * nothing usable — returns `undefined` in all of those cases, or the usable
 * answers otherwise.
 */
function usableAnswers(resumeData: QuestionsResumeData): QuestionAnswer[] | undefined {
	if (resumeData.approved === false) return undefined;
	if (!resumeData.answers || resumeData.answers.length === 0) return undefined;
	if (resumeData.answers.every((answer) => answer.skipped === true)) return undefined;
	return resumeData.answers;
}

export function buildAskQuestionsTool(deps: { track: BuilderTrackFn }): BuiltTool {
	return new Tool(ASK_QUESTIONS_TOOL_NAME)
		.description(
			'Ask the user one or more questions in a single batched card; the run suspends until ' +
				'they respond. ALWAYS use this instead of calling it multiple times when you have more ' +
				'than one question — batch them into one call. Questions are single-select, ' +
				'multi-select, or free-text. A question is asked at most once — a dismissal or empty ' +
				'answer means "proceed without this": assume a sensible default and never re-present ' +
				'it. Returns { answered: false } on dismissal, or { answered: true, answers } otherwise.',
		)
		.input(askQuestionsInputSchema)
		.suspend(questionsSuspendPayloadSchema)
		.resume(questionsResumeSchema)
		.handler(
			async (
				input: AskQuestionsInput,
				ctx: InterruptibleToolContext<QuestionsSuspendPayload, QuestionsResumeData>,
			) => {
				const questions = withDefaultIds(input.questions);

				if (ctx.resumeData === undefined || ctx.resumeData === null) {
					deps.track(TELEMETRY_EVENT.AGENTS.BUILDER_ASKED_QUESTIONS, {
						question_count: questions.length,
						question_types: [...new Set(questions.map((q) => q.type))].sort(),
					});
					return await ctx.suspend({
						requestId: nanoid(),
						message: input.introMessage ?? 'The agent builder has questions',
						severity: 'info' as const,
						inputType: 'questions' as const,
						questions,
						...(input.introMessage ? { introMessage: input.introMessage } : {}),
					});
				}

				const answers = usableAnswers(ctx.resumeData);
				const rawAnswers = ctx.resumeData.answers ?? [];
				const skippedCount = rawAnswers.filter((answer) => answer.skipped === true).length;
				deps.track(TELEMETRY_EVENT.AGENTS.USER_ANSWERED_BUILDER_QUESTIONS, {
					outcome:
						ctx.resumeData.approved === false ? 'dismissed' : answers ? 'answered' : 'skipped',
					answered_count: rawAnswers.length - skippedCount,
					skipped_count: skippedCount,
				});
				if (!answers) return { answered: false };

				return { answered: true, answers: enrichAnswers(answers, questions) };
			},
		)
		.build();
}

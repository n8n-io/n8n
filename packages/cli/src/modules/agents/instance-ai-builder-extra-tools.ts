/**
 * Builder tools injected only when the agents-module builder runs as an
 * instance-AI sub-agent (see `InstanceAiBuilderDelegateAdapterService`).
 * Spike feedback: chat-channel setup must always go through the dedicated
 * channel-configuration UX, and the builder should batch multiple questions
 * into a single card instead of asking one at a time. These tools + the
 * accompanying prompt addendum give the sub-agent both behaviours without
 * touching the agents-module builder's own UI-facing tool set.
 *
 * Mirrors the (now-removed) instance-ai originals so the existing FE cards —
 * `InstanceAiChannelSetup` and the questions wizard — keep rendering
 * unchanged: `configure_channel` reuses `channelConfigSchema`'s shape, and
 * `ask_questions` reuses the `inputType: 'questions'` suspend contract.
 */
import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { channelConfigSchema } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export const BUILDER_EXTRA_TOOL_NAMES = {
	CONFIGURE_CHANNEL: 'configure_channel',
	ASK_QUESTIONS: 'ask_questions',
} as const;

/** Prompt addendum for sub-agent runs; exported for tests. */
export const INSTANCE_AI_BUILDER_ADDENDUM = `## Instance AI session rules

You are running as a sub-agent inside n8n's instance AI chat; the user sees your questions as chat cards.
- Chat channels: to connect ANY chat platform (Slack, Telegram, ...) as an agent channel, ALWAYS call \`configure_channel\` with a type from \`list_integration_types\`. NEVER use \`ask_credential\` for chat-channel credentials — the channel setup UI creates and connects the credential itself.
- Questions: when you have more than one question, ALWAYS batch them into a single \`ask_questions\` call (one card with a list) instead of sequential \`ask_question\` calls. Use \`ask_question\` only for a genuinely single follow-up.
- The agent preview link is not visible in this chat; describe outcomes in text instead of linking the preview.`;

// ---------------------------------------------------------------------------
// configure_channel
// ---------------------------------------------------------------------------

const configureChannelInputSchema = z.object({
	integrationType: z.string().describe('Chat platform type from list_integration_types'),
});

const configureChannelSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: z.literal('info'),
	channelConfig: channelConfigSchema,
	projectId: z.string(),
});

const configureChannelResumeSchema = z.object({
	approved: z.boolean(),
});

export interface CreateConfigureChannelBuilderToolDeps {
	agentId: string;
	projectId: string;
	/** Wraps `AgentIntegrationPersistenceService.listChatIntegrations()`. */
	listChatIntegrationTypes: () => string[];
}

export function createConfigureChannelBuilderTool(
	deps: CreateConfigureChannelBuilderToolDeps,
): BuiltTool {
	return new Tool(BUILDER_EXTRA_TOOL_NAMES.CONFIGURE_CHANNEL)
		.description(
			'Connect one available chat channel to the target agent. First call ' +
				'list_integration_types and pass a returned `type` as `integrationType`; do not infer ' +
				'channel names. Shows setup UI in chat where the user creates a new channel credential ' +
				'or skips. The setup UI persists the connection, so use this for channel credentials ' +
				'instead of the credentials tool or config writes. Returns { connected: boolean }; if ' +
				'false, continue without the channel and do not re-prompt.',
		)
		.input(configureChannelInputSchema)
		.suspend(configureChannelSuspendSchema)
		.resume(configureChannelResumeSchema)
		.handler(async ({ integrationType }, ctx) => {
			const resumeData = ctx.resumeData;

			// Resumed — the user connected (approved) or skipped (dismissed). Handled
			// before the integration-catalog validation below: a run rebuilt from a
			// checkpoint after a process restart may see a different (or empty)
			// catalog than the original call, but the setup card already persisted
			// (or skipped) the connection, so the resume leg only reports the outcome.
			if (resumeData !== undefined && resumeData !== null) {
				return { connected: Boolean(resumeData.approved) };
			}

			const availableTypes = deps.listChatIntegrationTypes();
			if (!availableTypes.includes(integrationType)) {
				const availableMessage = availableTypes.length
					? ` Available: ${availableTypes.join(', ')}.`
					: ' No chat channels are currently available.';
				return {
					ok: false as const,
					errors: [
						{
							message:
								`Unsupported chat channel "${integrationType}". Call list_integration_types ` +
								'and choose a returned type.' +
								availableMessage,
						},
					],
				};
			}

			return await ctx.suspend({
				requestId: nanoid(),
				message: `Set up the ${integrationType} channel`,
				severity: 'info' as const,
				channelConfig: { integrationType, agentId: deps.agentId },
				projectId: deps.projectId,
			});
		})
		.build();
}

// ---------------------------------------------------------------------------
// ask_questions
// ---------------------------------------------------------------------------

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

const askQuestionsSuspendQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	type: z.enum(['single', 'multi', 'text']),
	options: z.array(z.string()).optional(),
});

const askQuestionsSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: z.literal('info'),
	inputType: z.literal('questions'),
	questions: z.array(askQuestionsSuspendQuestionSchema),
	introMessage: z.string().optional(),
});

const askQuestionsResumeSchema = z.object({
	approved: z.boolean().optional(),
	answers: z.array(z.unknown()).optional(),
});

/** Assign default `q1..qN` ids to questions missing an explicit id. */
function withDefaultIds(
	questions: Array<z.infer<typeof askQuestionsQuestionSchema>>,
): Array<z.infer<typeof askQuestionsSuspendQuestionSchema>> {
	return questions.map((question, index) => ({
		...question,
		id: question.id ?? `q${index + 1}`,
	}));
}

export function createAskQuestionsBuilderTool(): BuiltTool {
	return new Tool(BUILDER_EXTRA_TOOL_NAMES.ASK_QUESTIONS)
		.description(
			'Ask the user one or more questions in a single batched card; the run suspends until ' +
				'they respond. ALWAYS use this instead of multiple sequential ask_question calls when ' +
				'you have more than one question. Questions are single-select, multi-select, or ' +
				'free-text. A question is asked at most once — a dismissal or empty answer means ' +
				'"proceed without this": assume a sensible default and never re-present it. Returns ' +
				'{ answered: false } on dismissal, or { answered: true, answers } otherwise.',
		)
		.input(askQuestionsInputSchema)
		.suspend(askQuestionsSuspendSchema)
		.resume(askQuestionsResumeSchema)
		.handler(async (input, ctx) => {
			const resumeData = ctx.resumeData;
			const questionsWithIds = withDefaultIds(input.questions);

			// First call — always suspend to show the batched questions card.
			if (resumeData === undefined || resumeData === null) {
				return await ctx.suspend({
					requestId: nanoid(),
					message: input.introMessage ?? 'The agent builder has questions',
					severity: 'info' as const,
					inputType: 'questions' as const,
					questions: questionsWithIds,
					...(input.introMessage ? { introMessage: input.introMessage } : {}),
				});
			}

			// User dismissed the card or answered nothing.
			if (resumeData.approved === false || !resumeData.answers || resumeData.answers.length === 0) {
				return { answered: false };
			}

			// Merge question text into each answer for LLM context.
			const enrichedAnswers = resumeData.answers.map((answer) => {
				if (!isRecord(answer) || typeof answer.questionId !== 'string') return answer;
				const question = questionsWithIds.find((q) => q.id === answer.questionId);
				return { ...answer, question: question?.question ?? answer.questionId };
			});

			return { answered: true, answers: enrichedAnswers };
		})
		.build();
}

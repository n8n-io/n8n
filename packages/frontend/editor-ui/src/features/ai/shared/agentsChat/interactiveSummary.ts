import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
} from '@n8n/api-types';

import {
	cardChoiceLabel,
	n8nChatResumeValueSchema,
	parseN8nChatActionInput,
} from './n8nChatInteraction';

/**
 * Build a one-line human-readable label for a resolved interactive tool call.
 * Used by `AgentChatToolSteps` to show the user's answer beside the tool name
 * (e.g. "→ ask_questions · Slack") so resolved cards leave a compact trace in
 * scrollback instead of vanishing.
 *
 * Returns `undefined` for non-interactive tools or when the output isn't
 * shaped as expected — callers fall back to rendering just the tool name.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface QuestionAnswerLike {
	selectedOptions?: unknown;
	customText?: unknown;
	skipped?: unknown;
}

function isQuestionAnswerLike(value: unknown): value is QuestionAnswerLike {
	return isPlainObject(value);
}

/** One-line label for a single answered question: joined selected options, or the free-text answer. */
function answerLabel(answer: QuestionAnswerLike): string | undefined {
	if (answer.skipped === true) return undefined;
	const selected = Array.isArray(answer.selectedOptions)
		? answer.selectedOptions.filter((v): v is string => typeof v === 'string')
		: [];
	const customText = typeof answer.customText === 'string' ? answer.customText.trim() : '';
	const parts = customText ? [...selected, customText] : selected;
	return parts.length > 0 ? parts.join(', ') : undefined;
}

export function summariseInteractiveOutput(
	toolName: string,
	output: unknown,
	input?: unknown,
): string | undefined {
	// Output comes off the wire as `unknown`; treat anything non-object-shaped
	// as malformed and bail. This prevents `in` / property access from
	// throwing when a malformed payload sneaks through.
	if (!isPlainObject(output)) return undefined;

	if (toolName === ASK_QUESTIONS_TOOL_NAME) {
		const answers = Array.isArray(output.answers) ? output.answers : undefined;
		if (!answers || answers.length === 0) return undefined;
		const labels = answers.filter(isQuestionAnswerLike).map(answerLabel).filter(Boolean);
		return labels.length > 0 ? labels.join('; ') : undefined;
	}

	if (toolName === ASK_CREDENTIAL_TOOL_NAME || toolName === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME) {
		if ('skipped' in output && output.skipped) return 'Skipped';
		if (typeof output.credentialName === 'string' && output.credentialName) {
			return output.credentialName;
		}
		if (isPlainObject(output.credentials) && Object.keys(output.credentials).length > 0) {
			return 'Selected';
		}
		return undefined;
	}

	if (toolName === CONFIGURE_CHANNEL_TOOL_NAME) {
		// `output` is the real tool result (`{ connected }`) once settled, but
		// the optimistic update right after resume stores the raw resume
		// payload (`{ approved }`) instead — mirrors the `connected`/`approved`
		// fallback in `parseChannelResolvedValue` (messageMappers.ts).
		const connected =
			typeof output.connected === 'boolean'
				? output.connected
				: typeof output.approved === 'boolean'
					? output.approved
					: undefined;
		if (connected === undefined) return undefined;
		return connected ? 'Connected' : 'Skipped';
	}

	if (toolName === N8N_CHAT_ACTION_TOOL_NAME) {
		// Answered cards clear from the chat — surface the picked label here.
		// Display-only cards resolve with an action result (not a resume
		// value), which fails this parse and correctly yields no summary.
		const resume = n8nChatResumeValueSchema.safeParse(output);
		if (!resume.success) return undefined;
		const parsed = parseN8nChatActionInput(input);
		if (!parsed) return resume.data.value;
		return cardChoiceLabel(parsed.card, resume.data);
	}

	return undefined;
}

export function summariseToolCall(
	toolName: string,
	output?: unknown,
	input?: unknown,
): string | undefined {
	return summariseInteractiveOutput(toolName, output, input);
}

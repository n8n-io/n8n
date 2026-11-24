import { N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import {
	cardChoiceLabel,
	n8nChatResumeValueSchema,
	parseN8nChatActionInput,
} from './n8nChatInteraction';

/**
 * Build a one-line human-readable label for a resolved interactive tool call.
 * Used by `AgentChatToolSteps` to show the user's answer beside the tool name
 * (e.g. "→ n8n_chat_action · Approve & Send") so resolved cards leave a compact
 * trace in scrollback instead of vanishing.
 *
 * Returns `undefined` for non-interactive tools or when the output isn't
 * shaped as expected — callers fall back to rendering just the tool name.
 */
export function summariseToolCall(
	toolName: string,
	output: unknown,
	input?: unknown,
): string | undefined {
	// Output comes off the wire as `unknown`; treat anything non-object-shaped
	// as malformed and bail. This prevents `in` / property access from
	// throwing when a malformed payload sneaks through.
	if (!isRecord(output)) return undefined;

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

import { InstanceAiConfirmRequestDto, type InstanceAiConfirmRequest } from '@n8n/api-types';

import { ASSISTANT_CONFIRMATION_TOOL_NAME } from './assistantConfirmation';
import { getMessageInteractives, setMessageInteractives } from './messageMappers';
import type { ChatMessage, InteractivePayload } from './types';

/** The answer to an n8n Assistant capability card, for example the automation card. */
export type CapabilityDecision = Extract<InstanceAiConfirmRequest, { kind: 'capabilityDecision' }>;

/** The capability answer in a resume value, or undefined for any other value. */
export function capabilityDecisionOf(value: unknown): CapabilityDecision | undefined {
	const parsed = InstanceAiConfirmRequestDto.safeParse(value);
	return parsed.success && parsed.data.kind === 'capabilityDecision' ? parsed.data : undefined;
}

/**
 * True for an answered automation card that stays in the chat to show what happened. The card
 * needs the answer that the user sent in this session (see `keepSessionAnswers`). After a reload
 * the resolved value is the tool result, so the card stays hidden and its tool step shows the
 * outcome. Every other card keeps the rule of the chat.
 */
export function keepsResolvedCard(payload: InteractivePayload): boolean {
	if (payload.toolName !== ASSISTANT_CONFIRMATION_TOOL_NAME) return false;
	if (!payload.resolvedAt || payload.cancelled === true) return false;
	if (payload.input.automationProposal === undefined) return false;
	return capabilityDecisionOf(payload.resolvedValue) !== undefined;
}

/** The card with the answer of this session, when that answer keeps the card in the chat. */
function withSessionAnswer(
	payload: InteractivePayload,
	answers: ReadonlyMap<string, unknown>,
): InteractivePayload {
	if (payload.toolName !== ASSISTANT_CONFIRMATION_TOOL_NAME) return payload;
	if (!answers.has(payload.toolCallId)) return payload;
	const answered = { ...payload, resolvedValue: answers.get(payload.toolCallId) };
	return keepsResolvedCard(answered) ? answered : payload;
}

/**
 * Puts the answers that the user sent in this session back on their automation cards. A history
 * refresh gives an answered card the tool result in place of the answer, so without this the
 * card would go away when the turn ends. Only a card that the answer keeps in the chat changes.
 * A card that is open again, or was cancelled, keeps its value from the history.
 */
export function keepSessionAnswers<T extends Pick<ChatMessage, 'interactive' | 'interactives'>>(
	messages: T[],
	answers: ReadonlyMap<string, unknown>,
): T[] {
	if (answers.size === 0) return messages;
	for (const message of messages) {
		const interactives = getMessageInteractives(message);
		if (!interactives.some((payload) => answers.has(payload.toolCallId))) continue;
		setMessageInteractives(
			message,
			interactives.map((payload) => withSessionAnswer(payload, answers)),
		);
	}
	return messages;
}

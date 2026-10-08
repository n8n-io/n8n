import { InstanceAiConfirmRequestDto, type InstanceAiConfirmRequest } from '@n8n/api-types';

import { ASSISTANT_CONFIRMATION_TOOL_NAME } from './assistantConfirmation';
import type { InteractivePayload } from './types';

/** The answer to an n8n Assistant capability card, for example the automation card. */
export type CapabilityDecision = Extract<InstanceAiConfirmRequest, { kind: 'capabilityDecision' }>;

/** The capability answer in a resume value, or undefined for any other value. */
export function capabilityDecisionOf(value: unknown): CapabilityDecision | undefined {
	const parsed = InstanceAiConfirmRequestDto.safeParse(value);
	return parsed.success && parsed.data.kind === 'capabilityDecision' ? parsed.data : undefined;
}

/**
 * True for an answered automation card that stays in the chat to show what happened. The card
 * needs the answer that the user sent in this session. After a reload the resolved value is the
 * tool result, so the card stays hidden and its tool step shows the outcome. Every other card
 * keeps the rule of the chat.
 */
export function keepsResolvedCard(payload: InteractivePayload): boolean {
	if (payload.toolName !== ASSISTANT_CONFIRMATION_TOOL_NAME) return false;
	if (!payload.resolvedAt || payload.cancelled === true) return false;
	if (payload.input.automationProposal === undefined) return false;
	return capabilityDecisionOf(payload.resolvedValue) !== undefined;
}

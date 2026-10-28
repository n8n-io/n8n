import {
	confirmationRequestPayloadSchema,
	instanceAiConfirmationSeveritySchema,
	type InstanceAiConfirmationRequestPayload,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { defineAsyncComponent } from 'vue';
import { z } from 'zod';

import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

/**
 * Key of the n8n Assistant confirmation card. The Assistant suspends many tools
 * with the same confirmation payload, so the card matches the payload shape,
 * not the tool name.
 */
export const ASSISTANT_CONFIRMATION_KEY = 'assistant_confirmation';

/**
 * A confirmation that the card can render. Every field except `requestId` and
 * `message` is optional, because a partial payload still renders a fallback card.
 */
export type AssistantConfirmationInput = Partial<InstanceAiConfirmationRequestPayload> & {
	requestId: string;
	message: string;
};

/**
 * Every Assistant tool suspends with these fields, and no other tool sends a
 * `requestId`. `severity` is any string here, so a value that this editor does
 * not know yet still renders the fallback card.
 */
const assistantSuspendSchema = z
	.object({ requestId: z.string(), message: z.string(), severity: z.string() })
	.passthrough();

const lenientConfirmationSchema = confirmationRequestPayloadSchema.partial().passthrough();

/**
 * Parses a suspend payload as an Assistant confirmation. Returns `undefined`
 * for the payloads of other tools, such as the generic approval, so they keep
 * their own cards.
 */
export function parseAssistantConfirmationInput(
	value: unknown,
): AssistantConfirmationInput | undefined {
	const suspend = assistantSuspendSchema.safeParse(value);
	if (!suspend.success) return undefined;
	const payload = suspend.data;
	const { requestId, message } = payload;

	const parsed = lenientConfirmationSchema.safeParse(payload);
	if (parsed.success) return { ...parsed.data, requestId, message };
	// A field failed validation: keep only what the fallback card needs. The card cannot
	// see the fields that it drops, so treat the action as destructive, with no "Always
	// allow", when the severity is invalid or the payload names a cross-target or
	// credential-destination action.
	const severity = instanceAiConfirmationSeveritySchema.safeParse(payload.severity);
	const blocksAlwaysAllow =
		payload.targetApproval !== undefined || payload.credentialDestination !== undefined;
	return {
		requestId,
		message,
		severity: severity.success && !blocksAlwaysAllow ? severity.data : 'destructive',
		...(typeof payload.toolName === 'string' ? { toolName: payload.toolName } : {}),
	};
}

function parseAssistantToolCall(toolCall: ToolCall): AssistantConfirmationInput | undefined {
	const input = parseAssistantConfirmationInput(toolCall.suspendPayload);
	if (!input) return undefined;
	// The suspend payload often leaves out the tool, which the approval title and
	// "Always allow" read.
	return {
		...input,
		toolName: input.toolName ?? toolCall.tool,
		args: input.args ?? (isRecord(toolCall.input) ? toolCall.input : {}),
	};
}

/** The Assistant confirmation cards in the agents chat of the Assistant agent. */
export const assistantConfirmationExtension: AgentsChatInteractionExtension<AssistantConfirmationInput> =
	{
		key: ASSISTANT_CONFIRMATION_KEY,
		parse: parseAssistantToolCall,
		component: defineAsyncComponent(async () => await import('./AssistantConfirmationCard.vue')),
		getProps: (input) => ({ input }),
	};

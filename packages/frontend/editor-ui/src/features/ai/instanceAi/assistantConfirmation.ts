import {
	confirmationRequestPayloadSchema,
	type InstanceAiConfirmationRequestPayload,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { defineAsyncComponent } from 'vue';
import { INTERACTION_EXTENSION_TOOL_NAME } from '@/features/ai/shared/agentsChat/constants';
import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { InteractivePayload, ToolCall } from '@/features/ai/shared/agentsChat/types';

/**
 * Key of the n8n Assistant confirmation card. The Assistant suspends many
 * different tools with the same confirmation payload, so the card is keyed by
 * the payload shape and not by the tool name.
 */
export const ASSISTANT_CONFIRMATION_KEY = 'assistant_confirmation';

/**
 * Renderable Assistant confirmation. All fields except `requestId` and
 * `message` are optional, because a partial payload must still render a
 * fallback card.
 */
export type AssistantConfirmationInput = Partial<InstanceAiConfirmationRequestPayload> & {
	requestId: string;
	message: string;
};

/** Fields that only an Assistant confirmation payload carries. */
const CARD_FIELDS = [
	'questions',
	'planItems',
	'tasks',
	'credentialRequests',
	'setupRequests',
	'domainAccess',
	'webSearch',
	'resourceDecision',
	'mcpConnectRequest',
	'channelConfig',
	'testListener',
	'credentialDestination',
] as const;

const lenientConfirmationSchema = confirmationRequestPayloadSchema.partial().passthrough();

/**
 * Parse a `tool-call-suspended` payload as an Assistant confirmation. Returns
 * `undefined` for payloads of other tools (for example the generic approval
 * or a chat card), so normal agents keep their own renderers.
 */
export function parseAssistantConfirmationInput(
	value: unknown,
): AssistantConfirmationInput | undefined {
	if (!isRecord(value) || typeof value.requestId !== 'string') return undefined;
	// A plain Assistant approval carries only requestId, message and severity.
	const isPlainApproval = typeof value.message === 'string' && typeof value.severity === 'string';
	const hasCardField =
		isPlainApproval ||
		typeof value.inputType === 'string' ||
		CARD_FIELDS.some((field) => value[field] !== undefined);
	if (!hasCardField) return undefined;

	const message = typeof value.message === 'string' ? value.message : '';
	const parsed = lenientConfirmationSchema.safeParse(value);
	if (parsed.success) {
		return { ...parsed.data, requestId: value.requestId, message };
	}
	// A field failed validation: keep only what the fallback card needs.
	return {
		requestId: value.requestId,
		message,
		...(typeof value.toolName === 'string' && { toolName: value.toolName }),
	};
}

/** The confirmation card input for a suspended Assistant tool call. */
function parseAssistantToolCall(tc: ToolCall): AssistantConfirmationInput | undefined {
	const input = parseAssistantConfirmationInput(tc.suspendPayload);
	if (!input) return undefined;
	// The suspend payload often omits the tool, which "Always allow" keys on.
	return {
		...input,
		toolName: input.toolName ?? tc.tool,
		args: input.args ?? (isRecord(tc.input) ? tc.input : {}),
	};
}

/** Renders the Assistant confirmations in the Agents chat of the Assistant. */
export const assistantConfirmationExtension: AgentsChatInteractionExtension<AssistantConfirmationInput> =
	{
		key: ASSISTANT_CONFIRMATION_KEY,
		parse: parseAssistantToolCall,
		component: defineAsyncComponent(
			async () => await import('./components/agentsChat/InstanceAiConfirmationCard.vue'),
		),
		getProps: (input) => ({ input }),
	};

/** Narrows an interactive card to an Assistant confirmation. */
export function getAssistantConfirmationInput(
	payload: InteractivePayload,
): AssistantConfirmationInput | undefined {
	if (payload.toolName !== INTERACTION_EXTENSION_TOOL_NAME) return undefined;
	if (payload.extensionKey !== ASSISTANT_CONFIRMATION_KEY) return undefined;
	return parseAssistantConfirmationInput(payload.input);
}

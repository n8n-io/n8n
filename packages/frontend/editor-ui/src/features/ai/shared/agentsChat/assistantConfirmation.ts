import {
	confirmationRequestPayloadSchema,
	type InstanceAiConfirmationRequestPayload,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/**
 * Synthetic tool name for an n8n Assistant confirmation card. The Assistant
 * suspends many different tools with the same confirmation payload, so the
 * card is keyed by the payload shape and not by the tool name.
 */
export const ASSISTANT_CONFIRMATION_TOOL_NAME = 'assistant_confirmation';

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
	'automationProposal',
] as const;

const lenientConfirmationSchema = confirmationRequestPayloadSchema.partial().passthrough();

/**
 * The card for a payload with a field that failed validation. It keeps the
 * capability flag, because a capability answer cannot store "Always allow".
 */
function fallbackInput(
	value: Record<string, unknown>,
	requestId: string,
	message: string,
): AssistantConfirmationInput {
	return {
		requestId,
		message,
		...(typeof value.toolName === 'string' && { toolName: value.toolName }),
		...(value.capability === true && { capability: true }),
	};
}

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
	return fallbackInput(value, value.requestId, message);
}

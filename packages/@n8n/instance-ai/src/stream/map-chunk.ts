import { credentialRequestSchema } from '@n8n/api-types';
import type { InstanceAiCredentialRequest, InstanceAiEvent } from '@n8n/api-types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Maps a Mastra fullStream chunk to our InstanceAiEvent schema.
 *
 * Mastra chunks have the shape: { type, runId, from, payload: { ... } }
 * The actual data (textDelta, toolCallId, etc.) lives inside chunk.payload.
 *
 * Returns null for unrecognized chunk types (step-finish, finish, etc.)
 */
export function mapMastraChunkToEvent(
	runId: string,
	agentId: string,
	chunk: unknown,
): InstanceAiEvent | null {
	if (!isRecord(chunk)) return null;

	const { type } = chunk;
	const payload = isRecord(chunk.payload) ? chunk.payload : {};

	// Mastra payload uses `text` (not `textDelta`) for text-delta chunks
	const textValue =
		typeof payload.text === 'string'
			? payload.text
			: typeof payload.textDelta === 'string'
				? payload.textDelta
				: undefined;

	if (type === 'text-delta' && textValue !== undefined) {
		return {
			type: 'text-delta',
			runId,
			agentId,
			payload: { text: textValue },
		};
	}

	if ((type === 'reasoning-delta' || type === 'reasoning') && textValue !== undefined) {
		return {
			type: 'reasoning-delta',
			runId,
			agentId,
			payload: { text: textValue },
		};
	}

	if (type === 'tool-call') {
		return {
			type: 'tool-call',
			runId,
			agentId,
			payload: {
				toolCallId: typeof payload.toolCallId === 'string' ? payload.toolCallId : '',
				toolName: typeof payload.toolName === 'string' ? payload.toolName : '',
				args: isRecord(payload.args) ? payload.args : {},
			},
		};
	}

	if (type === 'tool-result' || type === 'tool-error') {
		const toolCallId = typeof payload.toolCallId === 'string' ? payload.toolCallId : '';

		// Mastra signals tool errors via `isError` on tool-result chunks,
		// not a separate event type. Map to our `tool-error` event.
		if (payload.isError === true) {
			return {
				type: 'tool-error',
				runId,
				agentId,
				payload: {
					toolCallId,
					error: typeof payload.result === 'string' ? payload.result : 'Tool execution failed',
				},
			};
		}

		return {
			type: 'tool-result',
			runId,
			agentId,
			payload: {
				toolCallId,
				result: payload.result,
			},
		};
	}

	if (type === 'tool-call-suspended') {
		const suspendPayload = isRecord(payload.suspendPayload) ? payload.suspendPayload : {};
		const toolCallId = typeof payload.toolCallId === 'string' ? payload.toolCallId : '';

		const requestId =
			typeof suspendPayload.requestId === 'string' && suspendPayload.requestId
				? suspendPayload.requestId
				: toolCallId;

		if (!requestId || !toolCallId) return null;

		const rawSeverity = typeof suspendPayload.severity === 'string' ? suspendPayload.severity : '';
		const validSeverities = ['destructive', 'warning', 'info'] as const;
		const severity = (validSeverities as readonly string[]).includes(rawSeverity)
			? (rawSeverity as (typeof validSeverities)[number])
			: 'warning';

		// Extract and validate optional credentialRequests for credential setup HITL
		let credentialRequests: InstanceAiCredentialRequest[] | undefined;
		if (Array.isArray(suspendPayload.credentialRequests)) {
			const parsed = suspendPayload.credentialRequests
				.map((item) => credentialRequestSchema.safeParse(item))
				.filter((r) => r.success)
				.map((r) => r.data);
			if (parsed.length > 0) {
				credentialRequests = parsed;
			}
		}

		// Extract optional inputType (e.g., 'text' for ask-user tool)
		const rawInputType =
			typeof suspendPayload.inputType === 'string' ? suspendPayload.inputType : undefined;
		const inputType =
			rawInputType === 'text'
				? ('text' as const)
				: rawInputType === 'approval'
					? ('approval' as const)
					: undefined;

		return {
			type: 'confirmation-request',
			runId,
			agentId,
			payload: {
				requestId,
				toolCallId,
				toolName: typeof payload.toolName === 'string' ? payload.toolName : '',
				args: isRecord(payload.args) ? payload.args : {},
				severity,
				message:
					typeof suspendPayload.message === 'string'
						? suspendPayload.message
						: 'Confirmation required',
				...(credentialRequests ? { credentialRequests } : {}),
				...(inputType ? { inputType } : {}),
			},
		};
	}

	if (type === 'error') {
		return {
			type: 'error',
			runId,
			agentId,
			payload: {
				content: typeof payload.error === 'string' ? payload.error : 'Unknown error',
			},
		};
	}

	// Other Mastra chunk types (step-finish, finish, etc.) are ignored
	return null;
}

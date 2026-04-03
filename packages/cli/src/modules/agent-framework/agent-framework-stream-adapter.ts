import type { InstanceAiEvent } from '@n8n/api-types';
import type { StreamChunk } from '@n8n/agents';

const DEFAULT_AGENT_ID = 'sdk-agent';

/**
 * Translates `@n8n/agents` SDK stream chunks into the Instance AI event
 * format that the SSE endpoint and frontend reducer expect.
 *
 * The adapter wraps the raw SDK stream with `run-start` / `run-finish`
 * bookend events and maps each `StreamChunk` variant to the corresponding
 * `InstanceAiEvent` discriminant.
 */
export class AgentFrameworkStreamAdapter {
	/**
	 * Consumes an SDK stream and yields Instance AI events.
	 *
	 * @param sdkStream  - AsyncIterable of `StreamChunk` from `agent.stream()`
	 * @param runId      - Unique run identifier for this execution
	 * @param messageGroupId - Stable group ID across follow-up runs within one user turn
	 * @param agentId    - Agent identifier (defaults to `'sdk-agent'`)
	 */
	async *translate(
		sdkStream: AsyncIterable<StreamChunk>,
		runId: string,
		messageGroupId: string,
		agentId: string = DEFAULT_AGENT_ID,
	): AsyncGenerator<InstanceAiEvent> {
		// --- run-start bookend ---
		yield {
			type: 'run-start',
			runId,
			agentId,
			payload: { messageId: runId, messageGroupId },
		};

		let lastError: string | undefined;

		for await (const chunk of sdkStream) {
			const events = this.mapChunk(chunk, runId, agentId);
			for (const event of events) {
				yield event;
			}

			if (chunk.type === 'error') {
				lastError = extractErrorMessage(chunk.error);
			}
		}

		// --- run-finish bookend ---
		yield {
			type: 'run-finish',
			runId,
			agentId,
			payload: lastError ? { status: 'error', reason: lastError } : { status: 'completed' },
		};
	}

	/**
	 * Maps a single SDK `StreamChunk` to zero or more `InstanceAiEvent`s.
	 *
	 * Most chunk types produce exactly one event; `message` chunks can
	 * produce multiple events (one per tool-call or tool-result content
	 * part), and unrecognised types produce none.
	 */
	private mapChunk(chunk: StreamChunk, runId: string, agentId: string): InstanceAiEvent[] {
		switch (chunk.type) {
			case 'text-delta':
				return [
					{
						type: 'text-delta',
						runId,
						agentId,
						payload: { text: chunk.delta },
					},
				];

			case 'reasoning-delta':
				return [
					{
						type: 'reasoning-delta',
						runId,
						agentId,
						payload: { text: chunk.delta },
					},
				];

			case 'tool-call-delta':
				// The frontend reducer does not handle partial tool-call
				// deltas — it only processes completed tool-call events.
				// We silently skip these.
				return [];

			case 'error':
				return [
					{
						type: 'error',
						runId,
						agentId,
						payload: { content: extractErrorMessage(chunk.error) },
					},
				];

			case 'finish':
				// The finish chunk carries usage/model metadata but no
				// separate event is needed — the run-finish bookend that
				// `translate()` emits after the loop covers this.
				return [];

			case 'tool-call-suspended':
				return this.mapToolCallSuspended(chunk, runId, agentId);

			case 'message':
				return this.mapMessage(chunk, runId, agentId);

			default:
				return [];
		}
	}

	/**
	 * Maps a `tool-call-suspended` SDK chunk to a `confirmation-request`
	 * Instance AI event — the same shape the frontend reducer uses to
	 * render the approval / text-input UI.
	 */
	private mapToolCallSuspended(
		chunk: Extract<StreamChunk, { type: 'tool-call-suspended' }>,
		runId: string,
		agentId: string,
	): InstanceAiEvent[] {
		const toolCallId = chunk.toolCallId ?? '';
		const suspendPayload = isRecord(chunk.suspendPayload) ? chunk.suspendPayload : {};

		const requestId =
			typeof suspendPayload.requestId === 'string' && suspendPayload.requestId
				? suspendPayload.requestId
				: toolCallId;

		if (!requestId || !toolCallId) return [];

		const rawSeverity = typeof suspendPayload.severity === 'string' ? suspendPayload.severity : '';
		const validSeverities = ['destructive', 'warning', 'info'] as const;
		const severity = (validSeverities as readonly string[]).includes(rawSeverity)
			? (rawSeverity as (typeof validSeverities)[number])
			: 'warning';

		const rawInputType =
			typeof suspendPayload.inputType === 'string' ? suspendPayload.inputType : undefined;
		const inputType =
			rawInputType === 'text'
				? ('text' as const)
				: rawInputType === 'approval'
					? ('approval' as const)
					: undefined;

		// Extract optional credentialRequests for credential setup HITL
		let credentialRequests:
			| Array<{
					reason: string;
					credentialType: string;
					existingCredentials: Array<{ id: string; name: string }>;
			  }>
			| undefined;
		if (Array.isArray(suspendPayload.credentialRequests)) {
			credentialRequests = suspendPayload.credentialRequests
				.filter((item): item is Record<string, unknown> => isRecord(item))
				.map((item) => ({
					reason: typeof item.reason === 'string' ? item.reason : '',
					credentialType: typeof item.credentialType === 'string' ? item.credentialType : '',
					existingCredentials: Array.isArray(item.existingCredentials)
						? (item.existingCredentials as Array<{ id: string; name: string }>)
						: [],
				}));
			if (credentialRequests.length === 0) credentialRequests = undefined;
		}

		return [
			{
				type: 'confirmation-request',
				runId,
				agentId,
				payload: {
					requestId,
					toolCallId,
					toolName: chunk.toolName ?? '',
					args: isRecord(chunk.input) ? chunk.input : {},
					severity,
					message:
						typeof suspendPayload.message === 'string'
							? suspendPayload.message
							: 'Confirmation required',
					...(credentialRequests ? { credentialRequests } : {}),
					...(inputType ? { inputType } : {}),
				},
			},
		];
	}

	/**
	 * Maps an SDK `message` chunk to Instance AI events.
	 *
	 * A single `AgentMessage` can contain multiple content parts — each
	 * tool-call part becomes a `tool-call` event and each tool-result
	 * part becomes either a `tool-result` or `tool-error` event.
	 */
	private mapMessage(
		chunk: Extract<StreamChunk, { type: 'message' }>,
		runId: string,
		agentId: string,
	): InstanceAiEvent[] {
		const { message } = chunk;
		// Custom agent messages don't carry content parts we can map
		if (message.type === 'custom') return [];
		// Only LLM messages (type is 'llm' or undefined) have content[]
		if (!('content' in message) || !Array.isArray(message.content)) return [];

		const events: InstanceAiEvent[] = [];

		for (const part of message.content) {
			if (part.type === 'tool-call') {
				events.push({
					type: 'tool-call',
					runId,
					agentId,
					payload: {
						toolCallId: part.toolCallId ?? '',
						toolName: part.toolName,
						args: isRecord(part.input) ? (part.input as Record<string, unknown>) : {},
					},
				});
			} else if (part.type === 'tool-result') {
				if (part.isError) {
					events.push({
						type: 'tool-error',
						runId,
						agentId,
						payload: {
							toolCallId: part.toolCallId,
							error: typeof part.result === 'string' ? part.result : 'Tool execution failed',
						},
					});
				} else {
					events.push({
						type: 'tool-result',
						runId,
						agentId,
						payload: {
							toolCallId: part.toolCallId,
							result: part.result,
						},
					});
				}
			}
		}

		return events;
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractErrorMessage(error: unknown): string {
	if (typeof error === 'string') return error;
	if (error instanceof Error) return error.message;
	return 'Unknown error';
}

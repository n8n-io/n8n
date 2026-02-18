import type { Logger } from '@n8n/backend-common';

import type {
	AssistantContext,
	AssistantResult,
	AssistantSdkClient,
	SdkAgentSuggestionMessage,
	SdkCodeDiffMessage,
	SdkEndSessionEvent,
	SdkErrorMessage,
	SdkIntermediateStep,
	SdkMessageResponse,
	SdkStreamChunk,
	SdkSummaryMessage,
	SdkTextMessage,
	StreamWriter,
} from './types';
import { STREAM_SEPARATOR } from '../constants';
import type { AgentMessageChunk, StreamChunk, ToolProgressChunk } from '../types/streaming';

const SUMMARY_MAX_LENGTH = 200;

/**
 * Core handler for routing queries to the AI Assistant SDK.
 * Framework-agnostic — no LangGraph imports. Can be used from both
 * the multi-agent subgraph and the code builder planning agent.
 */
export class AssistantHandler {
	constructor(
		private readonly client: AssistantSdkClient,
		private readonly logger?: Logger,
	) {}

	/**
	 * Execute an assistant SDK request: build payload, call SDK, consume stream.
	 * Emits a "Connecting to assistant..." progress chunk before the HTTP call
	 * to fill the gap while waiting for the SDK to respond.
	 */
	async execute(
		context: AssistantContext,
		userId: string,
		writer: StreamWriter,
		abortSignal?: AbortSignal,
	): Promise<AssistantResult> {
		const payload = this.buildSdkPayload(context);

		const toolCallId = `assistant-${crypto.randomUUID()}`;

		await writer({
			type: 'tool',
			toolName: 'assistant',
			toolCallId,
			customDisplayTitle: 'Connecting to assistant...',
			status: 'running',
		});

		try {
			const response = await this.callSdk(payload, userId);
			return await this.consumeSdkStream(response, writer, abortSignal, toolCallId);
		} finally {
			await writer({
				type: 'tool',
				toolName: 'assistant',
				toolCallId,
				customDisplayTitle: 'Done',
				status: 'completed',
			});
		}
	}

	/**
	 * Build the SDK request payload from the assistant context.
	 * First message → `init-support-chat` payload.
	 * Continuation (has sdkSessionId) → `UserChatMessage` with sessionId.
	 */
	buildSdkPayload(context: AssistantContext): { payload: object; sessionId?: string } {
		if (context.sdkSessionId) {
			return {
				payload: {
					role: 'user' as const,
					type: 'message' as const,
					text: context.query,
				},
				sessionId: context.sdkSessionId,
			};
		}

		const initPayload: Record<string, unknown> = {
			role: 'user' as const,
			type: 'init-support-chat' as const,
			user: { firstName: context.userName ?? 'User' },
			question: context.query,
		};

		if (context.workflowJSON) {
			initPayload.workflowContext = {
				currentWorkflow: {
					name: context.workflowJSON.name,
					nodes: context.workflowJSON.nodes.map((n) => ({ name: n.name, type: n.type })),
					connections: context.workflowJSON.connections,
				},
			};
		}

		if (context.errorContext) {
			initPayload.context = {
				...((initPayload.context as object) ?? {}),
				activeNodeInfo: {
					node: { name: context.errorContext.nodeName },
					executionStatus: {
						status: 'error',
						error: {
							message: context.errorContext.errorMessage,
							description: context.errorContext.errorDescription,
						},
					},
				},
			};
		}

		if (context.credentialContext) {
			initPayload.context = {
				...((initPayload.context as object) ?? {}),
				activeCredentials: {
					name: context.credentialContext.credentialType,
					displayName: context.credentialContext.displayName,
				},
			};
		}

		return { payload: initPayload };
	}

	/**
	 * Call the SDK and validate the response.
	 */
	private async callSdk(
		payload: { payload: object; sessionId?: string },
		userId: string,
	): Promise<Response> {
		const response = await this.client.chat(payload, { id: userId });

		if (!response.ok) {
			throw new Error(`Assistant SDK returned HTTP ${String(response.status)}`);
		}

		return response;
	}

	/**
	 * Consume the SDK's streaming response, mapping messages and writing chunks.
	 * Follows the same approach as the frontend streamRequest() utility.
	 */
	private async consumeSdkStream(
		response: Response,
		writer: StreamWriter,
		signal?: AbortSignal,
		toolCallId?: string,
	): Promise<AssistantResult> {
		const body = response.body;
		if (!body) {
			throw new Error('Assistant SDK response has no body');
		}

		const reader = (body as ReadableStream<Uint8Array>).getReader();
		const decoder = new TextDecoder();

		let buffer = '';
		const state = {
			sdkSessionId: undefined as string | undefined,
			collectedTexts: [] as string[],
			hasCodeDiff: false,
			suggestionIds: [] as string[],
		};

		try {
			while (true) {
				if (signal?.aborted) {
					break;
				}

				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const segments = buffer.split(STREAM_SEPARATOR);

				// Last segment may be incomplete — keep in buffer
				buffer = segments.pop() ?? '';

				for (const segment of segments) {
					const trimmed = segment.trim();
					if (!trimmed) continue;

					let chunk: SdkStreamChunk;
					try {
						chunk = JSON.parse(trimmed) as SdkStreamChunk;
					} catch {
						this.logger?.warn('[AssistantHandler] Failed to parse SDK stream segment', {
							segment: trimmed.substring(0, 100),
						});
						continue;
					}

					await this.processChunkMessages(chunk, state, writer, toolCallId);
				}
			}
		} finally {
			reader.releaseLock();
		}

		const remaining = buffer.trim();
		if (remaining) {
			try {
				const chunk = JSON.parse(remaining) as SdkStreamChunk;
				await this.processChunkMessages(chunk, state, writer, toolCallId);
			} catch {
				// If the remaining buffer is not JSON, it's likely a plain-text error from the SDK.
				// Throw so callers can handle it as a proper error instead of an empty response.
				throw new Error(`Assistant SDK error: ${remaining.substring(0, 500)}`);
			}
		}

		const responseText = state.collectedTexts.join('\n');
		const summary =
			responseText.length > SUMMARY_MAX_LENGTH
				? responseText.substring(0, SUMMARY_MAX_LENGTH) + '...'
				: responseText;

		return {
			responseText,
			summary,
			sdkSessionId: state.sdkSessionId,
			hasCodeDiff: state.hasCodeDiff,
			suggestionIds: state.suggestionIds,
		};
	}

	/**
	 * Process all messages in a single SDK stream chunk, updating state and writing mapped chunks.
	 */
	private async processChunkMessages(
		chunk: SdkStreamChunk,
		state: {
			sdkSessionId: string | undefined;
			collectedTexts: string[];
			hasCodeDiff: boolean;
			suggestionIds: string[];
		},
		writer: StreamWriter,
		toolCallId?: string,
	): Promise<void> {
		if (chunk.sessionId && !state.sdkSessionId) {
			state.sdkSessionId = chunk.sessionId;
		}

		for (const msg of chunk.messages) {
			const mapped = this.mapSdkMessage(msg, toolCallId);
			if (!mapped) continue;

			if (mapped.type === 'message' && 'text' in mapped && mapped.text) {
				state.collectedTexts.push(mapped.text);
			}

			if (this.isSdkCodeDiff(msg)) {
				state.hasCodeDiff = true;
				if (msg.suggestionId) {
					state.suggestionIds.push(msg.suggestionId);
				}
			}

			if (this.isSdkAgentSuggestion(msg) && msg.suggestionId) {
				state.suggestionIds.push(msg.suggestionId);
			}

			await writer(mapped);
		}
	}

	/**
	 * Map an SDK message to a builder StreamChunk type.
	 * Phase 0 graceful degradation: only emits types the builder frontend already renders.
	 */
	private mapSdkMessage(msg: SdkMessageResponse, toolCallId?: string): StreamChunk | null {
		if (this.isSdkText(msg)) {
			if (!msg.text) return null;
			return {
				role: 'assistant',
				type: 'message',
				text: msg.text,
			} satisfies AgentMessageChunk;
		}

		if (this.isSdkCodeDiff(msg)) {
			const text = `${msg.description}\n\n\`\`\`diff\n${msg.codeDiff}\n\`\`\``;
			return {
				role: 'assistant',
				type: 'message',
				text,
			} satisfies AgentMessageChunk;
		}

		if (this.isSdkSummary(msg)) {
			return {
				role: 'assistant',
				type: 'message',
				text: `**${msg.title}**\n\n${msg.content}`,
			} satisfies AgentMessageChunk;
		}

		if (this.isSdkAgentSuggestion(msg)) {
			return {
				role: 'assistant',
				type: 'message',
				text: `**${msg.title}**\n\n${msg.text}`,
			} satisfies AgentMessageChunk;
		}

		if (this.isSdkIntermediateStep(msg)) {
			return {
				type: 'tool',
				toolName: 'assistant',
				toolCallId,
				customDisplayTitle: msg.text,
				status: 'running',
			} satisfies ToolProgressChunk;
		}

		if (this.isSdkEvent(msg)) {
			return null;
		}

		if (this.isSdkError(msg)) {
			return {
				role: 'assistant',
				type: 'message',
				text: msg.text,
			} satisfies AgentMessageChunk;
		}

		return null;
	}
	// -- Type guards ----------------------------------------------------------

	private isSdkText(msg: SdkMessageResponse): msg is SdkTextMessage {
		return msg.type === 'message' && 'text' in msg;
	}

	private isSdkCodeDiff(msg: SdkMessageResponse): msg is SdkCodeDiffMessage {
		return msg.type === 'code-diff' && 'codeDiff' in msg;
	}

	private isSdkSummary(msg: SdkMessageResponse): msg is SdkSummaryMessage {
		return msg.type === 'summary' && 'title' in msg;
	}

	private isSdkAgentSuggestion(msg: SdkMessageResponse): msg is SdkAgentSuggestionMessage {
		return msg.type === 'agent-suggestion' && 'title' in msg;
	}

	private isSdkIntermediateStep(msg: SdkMessageResponse): msg is SdkIntermediateStep {
		return msg.type === 'intermediate-step';
	}

	private isSdkEvent(msg: SdkMessageResponse): msg is SdkEndSessionEvent {
		return msg.type === 'event';
	}

	private isSdkError(msg: SdkMessageResponse): msg is SdkErrorMessage {
		return msg.type === 'error' && 'text' in msg;
	}
}

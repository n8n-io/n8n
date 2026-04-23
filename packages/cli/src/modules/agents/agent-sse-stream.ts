import type { AgentMessage, StreamChunk } from '@n8n/agents';
import type { AgentSseEvent, ToolSuspendedPayload } from '@n8n/api-types';
import { randomUUID } from 'crypto';
import type { Response } from 'express';

export type FlushableResponse = Response & { flush?: () => void };

export interface ToolEventCallbacks {
	toolCall?: (toolName: string) => void;
	toolResult?: (toolName: string) => void;
	toolCallDelta?: (toolName: string | undefined, argumentsDelta: string) => void;
}

interface ChunkHandlerCtx {
	send: (e: AgentSseEvent) => void;
	getMessageId: () => string;
	startNewTurn: () => void;
	onToolEvent?: ToolEventCallbacks;
}

/**
 * Set up SSE headers and return a typed `send(event)` helper plus a
 * per-turn `messageId` tracker. Every per-turn event (text, reasoning, tool
 * calls, tool results, suspensions, resumes) is tagged with the current
 * messageId; the id rolls over when a tool-result is emitted, so the next
 * assistant turn (the next LLM call) starts a fresh ChatMessage on the FE.
 */
export function initSseStream(res: FlushableResponse) {
	res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no');
	res.flushHeaders();
	(res.socket as { setNoDelay?: (v: boolean) => void })?.setNoDelay?.(true);

	const send = (event: AgentSseEvent) => {
		res.write(`data: ${JSON.stringify(event)}\n\n`);
		res.flush?.();
	};

	let currentTurnMessageId: string | undefined;
	const getMessageId = (): string => {
		currentTurnMessageId ??= randomUUID();
		return currentTurnMessageId;
	};
	const startNewTurn = () => {
		currentTurnMessageId = undefined;
	};

	return { send, getMessageId, startNewTurn };
}

/** Translate a single non-suspension chunk into one or more SSE events. */
function emitChunkEvents(chunk: StreamChunk, ctx: ChunkHandlerCtx): void {
	const { send, getMessageId, onToolEvent } = ctx;

	switch (chunk.type) {
		case 'text-delta':
			if (chunk.delta) send({ type: 'text', messageId: getMessageId(), delta: chunk.delta });
			break;
		case 'reasoning-delta':
			if (chunk.delta) send({ type: 'reasoning', messageId: getMessageId(), delta: chunk.delta });
			break;
		case 'tool-call-delta':
			if (chunk.argumentsDelta) {
				send({
					type: 'toolCallDelta',
					messageId: getMessageId(),
					toolName: chunk.name,
					argumentsDelta: chunk.argumentsDelta,
				});
				onToolEvent?.toolCallDelta?.(chunk.name, chunk.argumentsDelta);
			}
			break;
		case 'message':
			emitMessageParts(chunk.message, ctx);
			break;
		case 'tool-execution-start':
			send({
				type: 'toolExecutionStart',
				messageId: getMessageId(),
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
			});
			break;
		case 'error': {
			const errMsg = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
			send({ type: 'error', message: errMsg });
			break;
		}
		default:
			break;
	}
}

/** Flatten an `AgentMessage` into per-part SSE events. */
function emitMessageParts(message: AgentMessage, ctx: ChunkHandlerCtx): void {
	if (!('content' in message) || !Array.isArray(message.content)) return;
	const { send, getMessageId, startNewTurn, onToolEvent } = ctx;

	for (const part of message.content) {
		if (part.type === 'text' && 'text' in part) {
			// Text content is already streamed via text-delta; the final
			// `message` chunk repeats it. Skip to avoid duplication.
			continue;
		}
		if (part.type === 'tool-call' && 'toolName' in part) {
			send({
				type: 'toolCall',
				messageId: getMessageId(),
				toolCallId: part.toolCallId ?? '',
				toolName: part.toolName,
				input: part.input,
			});
			onToolEvent?.toolCall?.(part.toolName);
			continue;
		}
		if (part.type === 'tool-result' && 'toolName' in part) {
			send({
				type: 'toolResult',
				messageId: getMessageId(),
				toolCallId: part.toolCallId ?? '',
				toolName: part.toolName,
				output: part.result,
				...(part.isError !== undefined && { isError: part.isError }),
			});
			onToolEvent?.toolResult?.(part.toolName);
			// A tool-result message ends the current "turn" — the next
			// assistant message (next LLM call) gets a fresh messageId.
			startNewTurn();
		}
	}
}

/**
 * Pump SDK stream chunks through a typed AgentSseEvent stream.
 *
 * Side-effects (configUpdated / toolUpdated / codeDelta) for the agent builder
 * are surfaced via the `onToolEvent` callback so the chat path can ignore them.
 *
 * Returns `true` when a suspension was emitted (the run paused), `false` otherwise.
 */
export async function pumpChunks(
	chunks: AsyncIterable<StreamChunk>,
	send: (e: AgentSseEvent) => void,
	getMessageId: () => string,
	startNewTurn: () => void,
	onToolEvent?: ToolEventCallbacks,
): Promise<boolean> {
	// TODO: update SDK to sent step-start, step-finish, text-start, text-finish events to avoid counting turns manually
	const ctx: ChunkHandlerCtx = { send, getMessageId, startNewTurn, onToolEvent };

	for await (const chunk of chunks) {
		if (chunk.type === 'tool-call-suspended') {
			const payload: ToolSuspendedPayload = {
				toolCallId: chunk.toolCallId ?? '',
				runId: chunk.runId ?? '',
				toolName: chunk.toolName ?? '',
				input: chunk.suspendPayload,
			};
			send({ type: 'toolSuspended', messageId: getMessageId(), payload });
			return true;
		}
		emitChunkEvents(chunk, ctx);
	}
	return false;
}

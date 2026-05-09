import { UPDATE_WORKING_MEMORY_TOOL_NAME, type AgentMessage, type StreamChunk } from '@n8n/agents';
import type {
	AgentPersistedMessageContentPart,
	AgentSseEvent,
	AgentSseMessage,
	ToolSuspendedPayload,
} from '@n8n/api-types';
import type { Response } from 'express';

export type FlushableResponse = Response & { flush?: () => void };

/**
 * Side-effect callbacks for the agent builder. Keyed off discrete tool events
 * — no more `messageId` turn tracking. `toolInputStart` lets the builder
 * remember which tool is currently streaming arguments so it can route
 * `toolInputDelta` text into the right side-effect (e.g. `code-delta`).
 */
export interface ToolEventCallbacks {
	toolInputStart?: (toolName: string) => void;
	toolInputDelta?: (toolCallId: string, delta: string) => void;
	toolResult?: (toolName: string) => void;
}

interface ChunkHandlerCtx {
	send: (e: AgentSseEvent) => void;
	onToolEvent?: ToolEventCallbacks;
	/**
	 * Tool-call ids belonging to the SDK-internal working-memory tool. The id
	 * Set is needed because `tool-input-delta` chunks carry only the id, not
	 * the tool name — we capture the id on `tool-input-start` / `tool-call`
	 * and use it to drop the matching streamed memory content.
	 */
	workingMemoryToolCallIds: Set<string>;
}

/**
 * Set up SSE headers and return a typed `send(event)` helper.
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

	return { send };
}

function toAgentSseMessage(message: AgentMessage): AgentSseMessage | undefined {
	if (!('content' in message) || !Array.isArray(message.content)) return undefined;

	const content: AgentPersistedMessageContentPart[] = [];
	for (const part of message.content) {
		if (part.type === 'text' && 'text' in part) {
			content.push({ type: 'text', text: part.text });
		} else if (part.type === 'reasoning' && 'text' in part) {
			content.push({ type: 'reasoning', text: part.text });
		}
	}

	if (content.length === 0) return undefined;
	return { role: message.role, content };
}

/** SSE-emit text/reasoning lifecycle chunks. */
function emitTextLikeChunk(
	chunk: Extract<
		StreamChunk,
		{
			type:
				| 'text-start'
				| 'text-delta'
				| 'text-end'
				| 'reasoning-start'
				| 'reasoning-delta'
				| 'reasoning-end';
		}
	>,
	send: (e: AgentSseEvent) => void,
): void {
	switch (chunk.type) {
		case 'text-start':
			send({ type: 'text-start', id: chunk.id });
			break;
		case 'text-delta':
			if (chunk.delta) send({ type: 'text-delta', id: chunk.id, delta: chunk.delta });
			break;
		case 'text-end':
			send({ type: 'text-end', id: chunk.id });
			break;
		case 'reasoning-start':
			send({ type: 'reasoning-start', id: chunk.id });
			break;
		case 'reasoning-delta':
			if (chunk.delta) send({ type: 'reasoning-delta', id: chunk.id, delta: chunk.delta });
			break;
		case 'reasoning-end':
			send({ type: 'reasoning-end', id: chunk.id });
			break;
	}
}

/**
 * SSE-emit a tool-* chunk and fire any matching builder side-effect callback.
 * Returns `{ suspended: true }` when the chunk was `tool-call-suspended`.
 */
/**
 * Working memory is implemented as an SDK tool, but n8n surfaces it as a
 * distinct memory event in the chat UI rather than a regular tool step.
 * Returns `true` when the chunk was handled and should not flow through the
 * regular tool emission path.
 */
function handleWorkingMemoryChunk(
	chunk: Extract<
		StreamChunk,
		{
			type:
				| 'tool-input-start'
				| 'tool-input-delta'
				| 'tool-call'
				| 'tool-execution-start'
				| 'tool-result';
		}
	>,
	ctx: ChunkHandlerCtx,
): boolean {
	const { send, workingMemoryToolCallIds } = ctx;
	const isWmName = 'toolName' in chunk && chunk.toolName === UPDATE_WORKING_MEMORY_TOOL_NAME;

	if (chunk.type === 'tool-input-delta') {
		return workingMemoryToolCallIds.has(chunk.toolCallId);
	}
	if (!isWmName) return false;

	if (chunk.type === 'tool-input-start' || chunk.type === 'tool-call') {
		workingMemoryToolCallIds.add(chunk.toolCallId);
		return true;
	}
	if (chunk.type === 'tool-execution-start') return true;
	if (chunk.type === 'tool-result') {
		if (chunk.isError) {
			const errMsg = chunk.output instanceof Error ? chunk.output.message : String(chunk.output);
			send({ type: 'error', message: `Working memory update failed: ${errMsg}` });
		} else {
			send({ type: 'working-memory-update', toolName: chunk.toolName });
		}
		return true;
	}
	return false;
}

function emitToolChunk(
	chunk: Extract<
		StreamChunk,
		{
			type:
				| 'tool-input-start'
				| 'tool-input-delta'
				| 'tool-call'
				| 'tool-execution-start'
				| 'tool-result'
				| 'tool-call-suspended';
		}
	>,
	ctx: ChunkHandlerCtx,
): { suspended: boolean } {
	const { send, onToolEvent } = ctx;

	if (chunk.type !== 'tool-call-suspended' && handleWorkingMemoryChunk(chunk, ctx)) {
		return { suspended: false };
	}

	switch (chunk.type) {
		case 'tool-input-start':
			send({
				type: 'tool-input-start',
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
			});
			onToolEvent?.toolInputStart?.(chunk.toolName);
			break;
		case 'tool-input-delta':
			if (chunk.delta) {
				send({ type: 'tool-input-delta', toolCallId: chunk.toolCallId, delta: chunk.delta });
				onToolEvent?.toolInputDelta?.(chunk.toolCallId, chunk.delta);
			}
			break;
		case 'tool-call':
			send({
				type: 'tool-call',
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
				input: chunk.input,
			});
			break;
		case 'tool-execution-start':
			send({
				type: 'tool-execution-start',
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
			});
			break;
		case 'tool-result':
			send({
				type: 'tool-result',
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
				output: chunk.output,
				...(chunk.isError !== undefined && { isError: chunk.isError }),
			});
			onToolEvent?.toolResult?.(chunk.toolName);
			break;
		case 'tool-call-suspended': {
			const payload: ToolSuspendedPayload = {
				toolCallId: chunk.toolCallId,
				runId: chunk.runId,
				toolName: chunk.toolName,
				input: chunk.suspendPayload,
			};
			send({ type: 'tool-call-suspended', payload });
			return { suspended: true };
		}
	}
	return { suspended: false };
}

/**
 * Translate a single chunk into one or more SSE events.
 *
 * Returns `{ suspended: true }` when the chunk was a `tool-call-suspended`
 * — the run pauses and the caller stops pumping. All other chunks return
 * `{ suspended: false }`.
 */
function emitChunkEvents(chunk: StreamChunk, ctx: ChunkHandlerCtx): { suspended: boolean } {
	switch (chunk.type) {
		case 'start-step':
			ctx.send({ type: 'start-step' });
			return { suspended: false };
		case 'finish-step':
			ctx.send({ type: 'finish-step' });
			return { suspended: false };
		case 'text-start':
		case 'text-delta':
		case 'text-end':
		case 'reasoning-start':
		case 'reasoning-delta':
		case 'reasoning-end':
			emitTextLikeChunk(chunk, ctx.send);
			return { suspended: false };
		case 'tool-input-start':
		case 'tool-input-delta':
		case 'tool-call':
		case 'tool-execution-start':
		case 'tool-result':
		case 'tool-call-suspended':
			return emitToolChunk(chunk, ctx);
		case 'message': {
			const sseMessage = toAgentSseMessage(chunk.message);
			if (sseMessage) ctx.send({ type: 'message', message: sseMessage });
			return { suspended: false };
		}
		case 'error': {
			const errMsg = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
			ctx.send({ type: 'error', message: errMsg });
			return { suspended: false };
		}
		default:
			return { suspended: false };
	}
}

/**
 * Pump SDK stream chunks through a typed AgentSseEvent stream.
 *
 * Side-effects (`config-updated` / `tool-updated` / `code-delta`) for the
 * agent builder are surfaced via the `onToolEvent` callback so the chat path
 * can ignore them.
 *
 * Returns `true` when a suspension was emitted (the run paused), `false`
 * otherwise.
 */
export async function pumpChunks(
	chunks: AsyncIterable<StreamChunk>,
	send: (e: AgentSseEvent) => void,
	onToolEvent?: ToolEventCallbacks,
): Promise<boolean> {
	const ctx: ChunkHandlerCtx = {
		send,
		onToolEvent,
		workingMemoryToolCallIds: new Set<string>(),
	};

	for await (const chunk of chunks) {
		const { suspended } = emitChunkEvents(chunk, ctx);
		if (suspended) return true;
	}
	return false;
}

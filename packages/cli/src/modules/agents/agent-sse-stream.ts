import type { AgentMessage, StreamChunk } from '@n8n/agents';
import type {
	AgentPersistedMessageContentPart,
	AgentSseEvent,
	AgentSseMessage,
	ToolSuspendedPayload,
} from '@n8n/api-types';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import type { Response } from 'express';
import { LoggerProxy } from 'n8n-workflow';

export type FlushableResponse = Response & { flush?: () => void };

const SSE_HEARTBEAT_INTERVAL_MS = 30_000;

/** The abort signal describes delivery. An accepted execution owns its cancellation. */
export function initSseStream(res: FlushableResponse) {
	res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no');
	res.flushHeaders();
	res.socket?.setTimeout(0);
	res.socket?.setNoDelay(true);
	res.socket?.setKeepAlive(true);
	const abortController = new AbortController();
	const detach = () => {
		abortController.abort();
		clearInterval(heartbeat);
	};
	const write = (data: string) => {
		if (abortController.signal.aborted) return;
		if (res.writableEnded || res.destroyed) return detach();
		try {
			res.write(data);
			res.flush?.();
		} catch {
			detach();
		}
	};
	const heartbeat = setInterval(() => write(':ping\n\n'), SSE_HEARTBEAT_INTERVAL_MS);
	heartbeat.unref();
	res.once('finish', detach);
	res.once('close', detach);
	res.once('error', detach);
	write(':ok\n\n');
	const close = () => {
		res.off('close', detach);
		res.off('finish', detach);
		res.off('error', detach);
		clearInterval(heartbeat);
		if (!res.writableEnded && !res.destroyed) res.end();
	};

	const send = (event: AgentSseEvent) => {
		write(`data: ${JSON.stringify(event)}\n\n`);
	};

	const onChunk = (chunk: StreamChunk) => {
		if (abortController.signal.aborted) return;
		try {
			emitChunkEvents(chunk, send);
		} catch {
			detach();
		}
	};

	return { send, onChunk, abortSignal: abortController.signal, close };
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

function toolResultOutputForSse(output: unknown, isError: boolean | undefined): unknown {
	if (!isError) return output;
	const fallback = output instanceof Error ? output.name : undefined;
	return scrubSecretsInText(stringifyError(output) || fallback || 'Tool execution failed');
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

/** Map tool chunks to SSE events. */
function emitToolChunk(
	chunk: Extract<
		StreamChunk,
		{
			type:
				| 'tool-input-start'
				| 'tool-input-delta'
				| 'tool-call'
				| 'tool-execution-start'
				| 'tool-execution-end'
				| 'tool-result'
				| 'tool-call-suspended';
		}
	>,
	send: (e: AgentSseEvent) => void,
): void {
	switch (chunk.type) {
		case 'tool-input-start':
			send({
				type: 'tool-input-start',
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
			});
			break;
		case 'tool-input-delta':
			if (chunk.delta) {
				send({ type: 'tool-input-delta', toolCallId: chunk.toolCallId, delta: chunk.delta });
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
				startTime: chunk.startTime,
			});
			break;
		case 'tool-execution-end':
			send({
				type: 'tool-execution-end',
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
				isError: chunk.isError,
				endTime: chunk.endTime,
			});
			break;
		case 'tool-result': {
			const toolResultChunk = chunk;
			send({
				type: 'tool-result',
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
				output: toolResultOutputForSse(chunk.output, chunk.isError),
				...(chunk.isError !== undefined && { isError: chunk.isError }),
				...(toolResultChunk.canceled !== undefined && { canceled: toolResultChunk.canceled }),
			});
			break;
		}
		case 'tool-call-suspended': {
			const payload: ToolSuspendedPayload = {
				toolCallId: chunk.toolCallId,
				runId: chunk.runId,
				toolName: chunk.toolName,
				input: chunk.suspendPayload,
			};
			send({ type: 'tool-call-suspended', payload });
			break;
		}
	}
}

/**
 * Translate a single chunk into one or more SSE events.
 */
export function emitChunkEvents(chunk: StreamChunk, send: (event: AgentSseEvent) => void): void {
	switch (chunk.type) {
		case 'start-step':
			send({ type: 'start-step' });
			return;
		case 'finish-step':
			send({ type: 'finish-step' });
			return;
		case 'text-start':
		case 'text-delta':
		case 'text-end':
		case 'reasoning-start':
		case 'reasoning-delta':
		case 'reasoning-end':
			emitTextLikeChunk(chunk, send);
			return;
		case 'tool-input-start':
		case 'tool-input-delta':
		case 'tool-call':
		case 'tool-execution-start':
		case 'tool-execution-end':
		case 'tool-result':
		case 'tool-call-suspended':
			emitToolChunk(chunk, send);
			return;
		case 'message': {
			const sseMessage = toAgentSseMessage(chunk.message);
			if (sseMessage) send({ type: 'message', message: sseMessage });
			return;
		}
		case 'subagent-chunk': {
			if (chunk.parentToolCallId === undefined) return;
			send({
				type: 'subagent-chunk',
				parentToolCallId: chunk.parentToolCallId,
				taskPath: chunk.taskPath,
				chunk: chunk.chunk,
			});
			return;
		}
		case 'error': {
			const errMsg = stringifyError(chunk.error);
			send({ type: 'error', message: errMsg });
			return;
		}
		case 'warning': {
			send({
				type: 'warning',
				message: chunk.message,
				...(chunk.code !== undefined && { code: chunk.code }),
				...(chunk.source !== undefined && { source: chunk.source }),
				...(chunk.server !== undefined && { server: chunk.server }),
			});
			return;
		}
		default:
			return;
	}
}

/** Find an ai-sdk `responseBody` on the error or its `cause` chain (the API error can arrive wrapped). */
function readResponseBody(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	if ('responseBody' in error && typeof error.responseBody === 'string') return error.responseBody;
	if ('cause' in error && error.cause !== error) return readResponseBody(error.cause);
	return undefined;
}

/**
 * The actionable message an ai-sdk error carries in its JSON `responseBody` —
 * e.g. the n8n Connect gateway's "switch to your own credential" guidance. Prefer
 * this over the bare status text ("Bad Request") so the chat shows what to do.
 */
function apiCallErrorMessage(error: unknown): string | undefined {
	const body = readResponseBody(error);
	if (!body) return undefined;
	try {
		const parsed = JSON.parse(body) as { message?: string; error?: { message?: string } };
		return parsed?.error?.message ?? parsed?.message ?? undefined;
	} catch {
		return undefined;
	}
}

function stringifyError(error: unknown): string {
	try {
		const gatewayMessage = apiCallErrorMessage(error);
		if (gatewayMessage) return gatewayMessage;
		if (error instanceof Error) {
			return error.message;
		}
		if (typeof error === 'object') {
			return JSON.stringify(error, null, 2);
		}
		return `Error: ${String(error)}`;
	} catch {
		LoggerProxy.warn('Failed to stringify agent streaming error');
	}
	return 'Unknown error';
}

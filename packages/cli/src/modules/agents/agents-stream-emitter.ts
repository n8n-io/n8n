import type { AgentMessage, StreamChunk } from '@n8n/agents';

export type SseSend = (data: Record<string, unknown>) => void;

/**
 * Translates agent `StreamChunk`s into the SSE event shape consumed by the
 * editor-ui chat streams.
 *
 * Owns per-stream state so tool-call identifiers emitted during
 * `tool-call-delta` can be deduplicated against the later `message` chunk that
 * carries the same tool call's input/result. Without this, the FE either sees
 * the tool call twice (once early, once in the message) or — if we only emit
 * from the message — doesn't see the pending state until the handler has
 * already run.
 *
 * Construct a fresh instance per request; it is not safe to share across
 * concurrent streams.
 */
export class AgentStreamEmitter {
	private readonly startedToolCallIds = new Set<string>();

	constructor(private readonly send: SseSend) {}

	/**
	 * Map a single stream chunk to SSE events, emit them, and return the list
	 * of emitted events. Callers that need to react to specific events
	 * (e.g. `toolResult` → `configUpdated`) can iterate the returned array.
	 */
	handleChunk(chunk: StreamChunk): Array<Record<string, unknown>> {
		const emitted: Array<Record<string, unknown>> = [];
		switch (chunk.type) {
			case 'text-delta':
				if (chunk.delta) this.emit({ text: chunk.delta }, emitted);
				break;
			case 'reasoning-delta':
				if (chunk.delta) this.emit({ thinking: chunk.delta }, emitted);
				break;
			case 'tool-call-delta':
				this.emitToolCallStart(chunk.id, chunk.name, emitted);
				break;
			case 'tool-execution-start':
				this.emit(
					{ toolCallExecuting: { toolCallId: chunk.toolCallId, tool: chunk.toolName } },
					emitted,
				);
				break;
			case 'message':
				this.emitMessageEvents(chunk.message, emitted);
				break;
			case 'error': {
				const errMsg = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
				this.emit({ error: errMsg }, emitted);
				break;
			}
			default:
				break;
		}
		return emitted;
	}

	/**
	 * Announce a tool call as soon as the LLM commits to a name, before the
	 * handler actually runs. No-ops if we've already announced this id, or if
	 * the chunk is missing an id or name.
	 */
	private emitToolCallStart(
		id: string | undefined,
		name: string | undefined,
		emitted: Array<Record<string, unknown>>,
	): void {
		if (!id || !name || this.startedToolCallIds.has(id)) return;
		this.emit({ toolCall: { tool: name, toolCallId: id } }, emitted);
		this.startedToolCallIds.add(id);
	}

	private emitMessageEvents(message: AgentMessage, emitted: Array<Record<string, unknown>>): void {
		if (!('content' in message) || !Array.isArray(message.content)) return;
		for (const part of message.content) {
			if (part.type === 'text' && 'text' in part) {
				this.emit({ text: part.text }, emitted);
			} else if (part.type === 'tool-call' && 'toolName' in part) {
				const toolCallId =
					'toolCallId' in part && typeof part.toolCallId === 'string' ? part.toolCallId : undefined;
				if (toolCallId && this.startedToolCallIds.has(toolCallId)) {
					// Already announced via tool-call-delta; fill in the full input now.
					this.emit({ toolCallInput: { toolCallId, input: part.input } }, emitted);
				} else {
					this.emit({ toolCall: { tool: part.toolName, toolCallId, input: part.input } }, emitted);
					if (toolCallId) this.startedToolCallIds.add(toolCallId);
				}
			} else if (part.type === 'tool-result' && 'toolName' in part) {
				const toolCallId =
					'toolCallId' in part && typeof part.toolCallId === 'string' ? part.toolCallId : undefined;
				this.emit(
					{ toolResult: { tool: part.toolName, toolCallId, output: part.result } },
					emitted,
				);
			}
		}
	}

	private emit(data: Record<string, unknown>, emitted: Array<Record<string, unknown>>): void {
		this.send(data);
		emitted.push(data);
	}
}

import type { AgentPersistedMessageDto } from '@n8n/api-types';

export interface ToolCall {
	tool: string;
	toolCallId?: string;
	input?: unknown;
	output?: unknown;
	/**
	 * Lifecycle state:
	 * - `pending`: the LLM has committed to the call but the handler has not started.
	 * - `running`: the handler is executing (between tool-execution-start and tool-result).
	 * - `done`: the handler has returned (also implied by `output` being set).
	 */
	status?: 'pending' | 'running' | 'done';
}

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	thinking?: string;
	toolCalls?: ToolCall[];
	status?: 'streaming' | 'success' | 'error';
}

/**
 * Presentation group for the message list. We fold every consecutive assistant
 * message into one `agentTurn` — thinking, tool calls, and final text are
 * rendered inside a single robot avatar so the list matches the live-stream
 * shape (one turn = one bubble) regardless of how many persisted assistant
 * messages the builder emitted.
 */
export type DisplayGroup =
	| { kind: 'message'; id: string; message: ChatMessage }
	| {
			kind: 'agentTurn';
			id: string;
			thinking: string;
			toolCalls: ToolCall[];
			/** The final assistant message in the turn — the one that carries text. */
			finalMessage?: ChatMessage;
	  };

export function buildDisplayGroups(messages: ChatMessage[]): DisplayGroup[] {
	const groups: DisplayGroup[] = [];
	for (const msg of messages) {
		if (msg.role === 'user') {
			groups.push({ kind: 'message', id: msg.id, message: msg });
			continue;
		}

		// Assistant — extend the current turn if one is open, else start a new one.
		const last = groups[groups.length - 1];
		const turn =
			last && last.kind === 'agentTurn'
				? last
				: (() => {
						const fresh = {
							kind: 'agentTurn' as const,
							id: msg.id,
							thinking: '',
							toolCalls: [] as ToolCall[],
							finalMessage: undefined as ChatMessage | undefined,
						};
						groups.push(fresh);
						return fresh;
					})();

		if (msg.thinking) {
			turn.thinking = turn.thinking ? `${turn.thinking}\n\n${msg.thinking}` : msg.thinking;
		}
		if (msg.toolCalls?.length) {
			turn.toolCalls = [...turn.toolCalls, ...msg.toolCalls];
		}
		// Last assistant message that has actual text (or is still streaming) wins
		// the "final message" slot. A later tool-only message won't overwrite it
		// with empty content, but a later text message will replace the previous.
		if (msg.content.trim() || msg.status === 'streaming') {
			turn.finalMessage = msg;
		}
	}
	return groups;
}

/**
 * Convert persisted agent messages into the frontend ChatMessage format.
 *
 * Tool results are persisted in separate `role: 'tool'` messages, not inlined
 * on the assistant message that issued the call. Without cross-message matching
 * the tool-call UI would stay on the loading indicator forever on reload.
 */
export function convertDbMessages(dbMessages: AgentPersistedMessageDto[]): ChatMessage[] {
	const result: ChatMessage[] = [];

	const applyToolResult = (toolName: string, toolCallId: string | undefined, output: unknown) => {
		for (let i = result.length - 1; i >= 0; i--) {
			const tcs = result[i].toolCalls;
			if (!tcs) continue;
			const match = tcs.find((t) =>
				toolCallId ? t.toolCallId === toolCallId : t.tool === toolName && t.output === undefined,
			);
			if (match) {
				match.output = output;
				return;
			}
		}
	};

	for (const msg of dbMessages) {
		if (!msg.role || !Array.isArray(msg.content)) continue;

		if (msg.role === 'tool') {
			for (const part of msg.content) {
				if (part.type === 'tool-result' && part.toolName) {
					applyToolResult(part.toolName, part.toolCallId, part.result);
				}
			}
			continue;
		}

		const role: ChatMessage['role'] | null =
			msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : null;
		if (role === null) continue;

		let text = '';
		let thinking = '';
		const toolCalls: ToolCall[] = [];

		for (const part of msg.content) {
			if (part.type === 'text' && part.text) {
				text += part.text;
			} else if (part.type === 'reasoning' && part.text) {
				thinking += part.text;
			} else if (part.type === 'tool-call' && part.toolName) {
				toolCalls.push({
					tool: part.toolName,
					toolCallId: part.toolCallId,
					input: part.input,
				});
			} else if (part.type === 'tool-result' && part.toolName) {
				const existing = toolCalls.find((t) => t.tool === part.toolName && t.output === undefined);
				if (existing) {
					existing.output = part.result;
				}
			}
		}

		result.push({
			id: msg.id ?? crypto.randomUUID(),
			role,
			content: text,
			thinking: thinking || undefined,
			toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
		});
	}
	return result;
}

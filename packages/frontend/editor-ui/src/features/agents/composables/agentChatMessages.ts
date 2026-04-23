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
 * Presentation group for the message list. The builder persists one assistant
 * message per tool-use turn, so a single conversation fragments into many robot
 * avatars on reload. We fold consecutive tool-only assistant messages into a
 * single `toolRun` block to match the live-stream look.
 */
export type DisplayGroup =
	| { kind: 'message'; id: string; message: ChatMessage }
	| {
			kind: 'toolRun';
			id: string;
			thinking: string;
			toolCalls: ToolCall[];
	  };

export function isGroupable(msg: ChatMessage): boolean {
	return (
		msg.role === 'assistant' &&
		!!msg.toolCalls?.length &&
		!msg.content.trim() &&
		msg.status !== 'streaming'
	);
}

export function buildDisplayGroups(messages: ChatMessage[]): DisplayGroup[] {
	const groups: DisplayGroup[] = [];
	for (const msg of messages) {
		if (isGroupable(msg)) {
			const last = groups[groups.length - 1];
			if (last && last.kind === 'toolRun') {
				last.toolCalls = [...last.toolCalls, ...(msg.toolCalls ?? [])];
				if (msg.thinking) {
					last.thinking = last.thinking ? `${last.thinking}\n\n${msg.thinking}` : msg.thinking;
				}
				continue;
			}
			groups.push({
				kind: 'toolRun',
				id: msg.id,
				thinking: msg.thinking ?? '',
				toolCalls: [...(msg.toolCalls ?? [])],
			});
			continue;
		}
		groups.push({ kind: 'message', id: msg.id, message: msg });
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

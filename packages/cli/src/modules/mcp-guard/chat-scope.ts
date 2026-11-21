import { AsyncLocalStorage } from 'node:async_hooks';

interface Scope {
	chatId: string;
	agentId?: string;
}

// The chat a guarded tool call belongs to. MCP tool calls carry no chat identity and one MCP
// connection serves every chat of an agent, so the turn sets the chat here and the guard reads it.
// The agent id lets a node tool call find the tenant of its chat.
const scope = new AsyncLocalStorage<Scope>();

/** Runs `fn` with `chatId` as the current chat. Work that `fn` starts keeps it. */
export function withChatScope<T>(chatId: string | undefined, fn: () => T, agentId?: string): T {
	return chatId ? scope.run({ chatId, agentId }, fn) : fn();
}

export function currentChatId(): string | undefined {
	return scope.getStore()?.chatId;
}

export function currentAgentId(): string | undefined {
	return scope.getStore()?.agentId;
}

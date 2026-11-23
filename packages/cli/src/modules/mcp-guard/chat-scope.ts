import { AsyncLocalStorage } from 'node:async_hooks';

// The chat a guarded tool call belongs to. MCP tool calls carry no chat identity and one MCP
// connection serves every chat of an agent, so the turn sets the chat here and the guard reads it.
const scope = new AsyncLocalStorage<{ chatId: string }>();

/** Runs `fn` with `chatId` as the current chat. Work that `fn` starts keeps it. */
export function withChatScope<T>(chatId: string | undefined, fn: () => T): T {
	return chatId ? scope.run({ chatId }, fn) : fn();
}

export function currentChatId(): string | undefined {
	return scope.getStore()?.chatId;
}

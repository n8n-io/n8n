import { AsyncLocalStorage } from 'node:async_hooks';

import type { HydrationModel } from './hydration-llm';

interface Scope {
	chatId: string;
	agentId?: string;
	// Set around the run of a node tool of a guarded test chat. Only calls made inside it are guarded.
	nodeGuard?: { model: HydrationModel };
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

/** Runs a node tool as guarded: its network calls go to the guard. Needs a chat scope. */
export function withNodeGuard<T>(model: HydrationModel, fn: () => T): T {
	const store = scope.getStore();
	return store ? scope.run({ ...store, nodeGuard: { model } }, fn) : fn();
}

export function currentNodeGuard(): { model: HydrationModel } | undefined {
	return scope.getStore()?.nodeGuard;
}

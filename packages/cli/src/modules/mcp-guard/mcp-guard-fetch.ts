import { Container } from '@n8n/di';

import { currentChatId } from './chat-scope';
import type { HydrationModel } from './hydration-llm';
import { GUARD_PROFILES, guardMode } from './services';

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const GUARDED_HOSTS: ReadonlySet<string> = new Set(GUARD_PROFILES.map((p) => p.host));

const OAUTH_PATHS: ReadonlySet<string> = new Set(['/authorize', '/token', '/register']);

/**
 * The Builder preview chat sends Linear and Notion MCP calls to the guard when it is on. Manual and chat
 * workflow runs also have `runType` 'test', but they have no chat scope. An evaluation run has its own
 * MCP fetch and never uses the guard.
 */
export const isMcpGuardActive = (
	runType: string | undefined,
	hasInstrumentedFetch: boolean,
	previewChat: boolean | undefined,
) =>
	runType === 'test' && previewChat === true && !hasInstrumentedFetch && guardMode() !== undefined;

/** How long a guarded tool call may take. A call can wait for a hydration, which can need several model turns. */
export const GUARDED_CALL_TIMEOUT_MS = 5 * 60 * 1000;

// `mcp.linear.app.` (trailing dot) and `MCP.LINEAR.APP` name the same server. Compare the canonical host.
const canonicalHost = (hostname: string): string => hostname.toLowerCase().replace(/\.+$/, '');

// One run (one gym tenant) for each chat of the agent. Outside a chat the run is the agent's.
const chatRunId = (agentId: string): string => {
	const chatId = currentChatId();
	return chatId ? `${agentId}-${chatId}` : agentId;
};

/** Sends Linear and Notion MCP requests to the in-process guard. Everything else goes to baseFetch. */
export function withMcpGuard<T extends FetchFn>(
	baseFetch: T,
	runId: string,
	model?: HydrationModel,
): FetchFn {
	return async (input, init) => {
		// Read the URL without a `Request`. A `Request` built from a stream body would consume it.
		const url = new URL(input instanceof Request ? input.url : String(input));
		const host = canonicalHost(url.hostname);
		if (!GUARDED_HOSTS.has(host)) return await baseFetch(input, init);
		// `/mcp/` is the same endpoint as `/mcp`.
		const path = url.pathname.replace(/\/+$/, '') || '/';
		if (path !== '/mcp') {
			// Fail closed. Only the OAuth and discovery paths go to the real server.
			if (OAUTH_PATHS.has(path) || path.startsWith('/.well-known/')) {
				return await baseFetch(input, init);
			}
			return new Response(`mcp-guard: ${path} is not allowed in test runs`, { status: 403 });
		}
		const req = new Request(input, init);
		// Load the guard only when a call needs it. Most chats never do.
		const { McpGuardService } = await import('./mcp-guard.service.js');
		return await Container.get(McpGuardService).handleMcp(host, chatRunId(runId), req, model);
	};
}

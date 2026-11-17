import { Container } from '@n8n/di';

import { currentChatId } from './chat-scope';
import type { HydrationModel } from './hydration-llm';
import { McpGuardService } from './mcp-guard.service';
import { GUARD_PROFILES } from './services';

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const GUARDED_HOSTS: ReadonlySet<string> = new Set(GUARD_PROFILES.map((p) => p.host));

/** How long a guarded tool call may take. A call can wait for a hydration, which can need several model turns. */
export const GUARDED_CALL_TIMEOUT_MS = 5 * 60 * 1000;

export const isGuardedUrl = (url: string): boolean => {
	try {
		return GUARDED_HOSTS.has(new URL(url).hostname);
	} catch {
		return false;
	}
};

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
		const req = new Request(input, init);
		const url = new URL(req.url);
		if (!GUARDED_HOSTS.has(url.hostname)) return await baseFetch(input, init);
		// The SSE transport has no guard. Refuse it, so a call cannot reach the real server.
		if (
			url.pathname === '/sse' ||
			url.pathname.startsWith('/sse/') ||
			url.pathname === '/messages'
		) {
			return new Response('mcp-guard: the SSE transport is not supported in test runs', {
				status: 403,
			});
		}
		// OAuth and discovery requests of the same host go to the real server.
		if (url.pathname !== '/mcp') return await baseFetch(input, init);
		return await Container.get(McpGuardService).handleMcp(
			url.hostname,
			chatRunId(runId),
			req,
			model,
		);
	};
}

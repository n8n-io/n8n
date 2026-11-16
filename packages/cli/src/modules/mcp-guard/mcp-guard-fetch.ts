import { Container } from '@n8n/di';

import { McpGuardService } from './mcp-guard.service';
import { GUARD_PROFILES } from './services';

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const GUARDED_HOSTS: ReadonlySet<string> = new Set(GUARD_PROFILES.map((p) => p.host));

/** Sends Linear and Notion MCP requests to the in-process guard. Everything else goes to baseFetch. */
export function withMcpGuard<T extends FetchFn>(baseFetch: T, runId: string): FetchFn {
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
		return await Container.get(McpGuardService).handleMcp(url.hostname, runId, req);
	};
}

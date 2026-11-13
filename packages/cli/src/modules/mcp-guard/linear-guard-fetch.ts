import { Container } from '@n8n/di';

import { McpGuardService } from './mcp-guard.service';

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** Sends Linear MCP requests to the in-process guard. Everything else goes to baseFetch. */
export function withLinearGuard<T extends FetchFn>(baseFetch: T, runId: string): FetchFn {
	return async (input, init) => {
		const req = new Request(input, init);
		const url = new URL(req.url);
		if (url.hostname !== 'mcp.linear.app' || url.pathname !== '/mcp') {
			return await baseFetch(input, init);
		}
		return await Container.get(McpGuardService).handleMcp(runId, req);
	};
}

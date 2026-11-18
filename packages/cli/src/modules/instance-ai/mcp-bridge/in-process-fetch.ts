import type { McpHttpHandler } from '@modelcontextprotocol/server';

/** The signature the v2 client transport accepts in place of the global `fetch`. */
export type InProcessFetch = (url: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * A `fetch` that hands every request to an in-process MCP handler. The handler
 * is the same `createMcpHandler(...)` the public endpoint runs behind
 * `toNodeHandler`, so the client exercises the real protocol path (envelope
 * validation, routing headers, result encoding) without a socket or a token.
 */
export function createInProcessFetch(handler: McpHttpHandler): InProcessFetch {
	return async (url, init) => await handler.fetch(new Request(url, init));
}

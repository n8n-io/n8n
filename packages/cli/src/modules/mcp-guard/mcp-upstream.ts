import http from 'node:http';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema, type CallToolResult, type Tool } from '@modelcontextprotocol/sdk/types.js';

export interface McpCaller {
	listTools(): Promise<Tool[]>;
	callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
}

// One short-lived MCP client session per operation. No state is kept.
export function createMcpCaller(url: string, bearer: string, extraHeaders: Record<string, string> = {}): McpCaller {
	const withClient = async <T>(fn: (c: Client) => Promise<T>): Promise<T> => {
		const client = new Client({ name: 'mcp-guard', version: '0.1.0' });
		const transport = new StreamableHTTPClientTransport(new URL(url), {
			requestInit: { headers: { Authorization: `Bearer ${bearer}`, ...extraHeaders } },
			// Node fetch ignores a Host override. Use http.request when one is set.
			...(extraHeaders.Host ? { fetch: hostFetch } : {}),
		});
		await client.connect(transport);
		try {
			return await fn(client);
		} finally {
			await client.close().catch(() => {});
		}
	};
	return {
		listTools: async () => await withClient(async (c) => (await c.listTools()).tools),
		callTool: async (name, args) =>
			await withClient(async (c) => {
				const res = await c.callTool({ name, arguments: args });
				return CallToolResultSchema.parse(res);
			}),
	};
}

const hostFetch: typeof fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : String(input));
	const headers: Record<string, string> = {};
	new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
	const body = typeof init?.body === 'string' ? init.body : undefined;
	return await new Promise<Response>((resolve, reject) => {
		const req = http.request(
			{ host: url.hostname, port: url.port, path: url.pathname + url.search, method: init?.method ?? 'GET', headers },
			(res) => {
				const out = new Headers();
				for (const [k, v] of Object.entries(res.headers)) {
					if (typeof v === 'string') out.set(k, v);
				}
				const noBody = res.statusCode === 202 || res.statusCode === 204;
				// Buffer the body. The gym answers each call with one finite response.
					const chunks: Buffer[] = [];
					res.on('data', (chunk: Buffer) => chunks.push(chunk));
					res.on('error', reject);
					res.on('end', () => {
						resolve(
							new Response(noBody ? null : new Uint8Array(Buffer.concat(chunks)), {
								status: res.statusCode ?? 500,
								headers: out,
							}),
						);
					});
			},
		);
		req.on('error', reject);
		init?.signal?.addEventListener('abort', () => req.destroy());
		req.end(body);
	});
};

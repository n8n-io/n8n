/**
 * In-process MCP test server helpers.
 * Creates real MCP servers (SSE and StreamableHTTP) bound to random localhost ports
 * for use in integration tests. No mocking of SDK internals.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import http from 'http';
import { z } from 'zod';

/** 1×1 transparent PNG in base64 (smallest valid PNG). Used for image tool tests. */
export const TINY_PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export interface TestServer {
	url: string;
	close: () => Promise<void>;
}

/** Create an in-process MCP Server with three test tools: echo, add, and image. */
export function createTestMcpServer(): McpServer {
	const server = new McpServer({ name: 'test-mcp-server', version: '1.0.0' });
	server.registerTool(
		'echo',
		{
			description: 'Echo the message back as-is',
			inputSchema: { message: z.string().describe('Message to echo') },
		},
		async ({ message }) => ({ content: [{ type: 'text', text: message }] }),
	);
	server.registerTool(
		'add',
		{
			description: 'Add two numbers together',
			inputSchema: {
				a: z.number().describe('First number'),
				b: z.number().describe('Second number'),
			},
		},
		async ({ a, b }) => ({ content: [{ type: 'text', text: String(a + b) }] }),
	);
	server.registerTool(
		'image',
		{
			description: 'Return a small image with a caption',
			inputSchema: { caption: z.string().describe('Image caption') },
		},
		async ({ caption }) => ({
			content: [
				{ type: 'text', text: caption },
				{ type: 'image', data: TINY_PNG, mimeType: 'image/png' },
			],
		}),
	);

	return server;
}

/** Start an SSE MCP server on a random port. Returns the SSE endpoint URL and a close function. */
export async function startSseServer(): Promise<TestServer> {
	// oxlint-disable-next-line typescript/no-deprecated -- Test the supported SSE compatibility path.
	const transports = new Map<string, SSEServerTransport>();

	const httpServer = http.createServer(async (req, res) => {
		try {
			if (req.method === 'GET' && req.url === '/sse') {
				// Create a fresh McpServer per client connection — the Server class holds
				// a single active transport reference and rejects a second connect() call
				// if the first transport hasn't been fully torn down yet.
				const mcpServer = createTestMcpServer();
				// oxlint-disable-next-line typescript/no-deprecated -- Test the supported SSE compatibility path.
				const transport = new SSEServerTransport('/message', res);
				transports.set(transport.sessionId, transport);
				await mcpServer.connect(transport);
			} else if (req.method === 'POST' && req.url?.startsWith('/message')) {
				const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId') ?? '';
				const transport = transports.get(sessionId);
				if (transport) {
					await transport.handlePostMessage(req, res);
				} else {
					res.writeHead(404).end(`No transport for sessionId: ${sessionId}`);
				}
			} else {
				res.writeHead(404).end('Not found');
			}
		} catch {
			if (!res.headersSent) res.writeHead(500).end('Internal server error');
		}
	});

	await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
	const { port } = httpServer.address() as { port: number };

	return {
		url: `http://127.0.0.1:${port}/sse`,
		close: async () => {
			httpServer.closeAllConnections();
			await new Promise<void>((resolve) => httpServer.close(() => resolve()));
		},
	};
}

/** Start a Streamable HTTP MCP server on a random port. Returns the endpoint URL and a close function. */
export async function startStreamableHttpServer(): Promise<TestServer> {
	// In stateless mode (sessionIdGenerator: undefined) the SDK enforces that each
	// transport instance handles exactly one HTTP request. A fresh McpServer + transport
	// must therefore be created per-request, mirroring the SSE server pattern above.
	const httpServer = http.createServer(async (req, res) => {
		try {
			const mcpServer = createTestMcpServer();
			const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
			await mcpServer.connect(transport);
			await transport.handleRequest(req, res);
		} catch {
			if (!res.headersSent) res.writeHead(500).end('Internal server error');
		}
	});

	await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
	const { port } = httpServer.address() as { port: number };

	return {
		url: `http://127.0.0.1:${port}/mcp`,
		close: async () => {
			httpServer.closeAllConnections();
			await new Promise<void>((resolve) => httpServer.close(() => resolve()));
		},
	};
}

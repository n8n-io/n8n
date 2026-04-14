/**
 * In-process MCP test server helpers.
 * Creates real MCP servers (SSE and StreamableHTTP) bound to random localhost ports
 * for use in integration tests. No mocking of SDK internals.
 */

import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import http from 'http';

/** 1×1 transparent PNG in base64 (smallest valid PNG). Used for image tool tests. */
export const TINY_PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export interface TestServer {
	url: string;
	close: () => Promise<void>;
}

/** Create an in-process MCP Server with three test tools: echo, add, and image. */
export function createTestMcpServer(): McpServer {
	const server = new McpServer(
		{ name: 'test-mcp-server', version: '1.0.0' },
		{ capabilities: { tools: {} } },
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: [
			{
				name: 'echo',
				description: 'Echo the message back as-is',
				inputSchema: {
					type: 'object',
					properties: { message: { type: 'string', description: 'Message to echo' } },
					required: ['message'],
				},
			},
			{
				name: 'add',
				description: 'Add two numbers together',
				inputSchema: {
					type: 'object',
					properties: {
						a: { type: 'number', description: 'First number' },
						b: { type: 'number', description: 'Second number' },
					},
					required: ['a', 'b'],
				},
			},
			{
				name: 'image',
				description: 'Return a small image with a caption',
				inputSchema: {
					type: 'object',
					properties: { caption: { type: 'string', description: 'Image caption' } },
					required: ['caption'],
				},
			},
		],
	}));

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args = {} } = request.params;

		if (name === 'echo') {
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			return { content: [{ type: 'text', text: String(args.message ?? '') }] };
		}

		if (name === 'add') {
			const sum = Number(args.a ?? 0) + Number(args.b ?? 0);
			return { content: [{ type: 'text', text: String(sum) }] };
		}

		if (name === 'image') {
			return {
				content: [
					// eslint-disable-next-line @typescript-eslint/no-base-to-string
					{ type: 'text', text: String(args.caption ?? '') },
					{ type: 'image', data: TINY_PNG, mimeType: 'image/png' },
				],
			};
		}

		return {
			isError: true,
			content: [{ type: 'text', text: `Unknown tool: ${name}` }],
		};
	});

	return server;
}

/** Start an SSE MCP server on a random port. Returns the SSE endpoint URL and a close function. */
export async function startSseServer(): Promise<TestServer> {
	const transports = new Map<string, SSEServerTransport>();

	const httpServer = http.createServer(async (req, res) => {
		try {
			if (req.method === 'GET' && req.url === '/sse') {
				// Create a fresh McpServer per client connection — the Server class holds
				// a single active transport reference and rejects a second connect() call
				// if the first transport hasn't been fully torn down yet.
				const mcpServer = createTestMcpServer();
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

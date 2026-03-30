#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

import { parseServerOptions } from './server-config';
import { createBrowserTools } from './tools/index';

function registerTools(server: McpServer, tools: ReturnType<typeof createBrowserTools>['tools']) {
	for (const tool of tools) {
		server.registerTool(
			tool.name,
			{
				description: tool.description,
				inputSchema: tool.inputSchema,
				outputSchema: tool.outputSchema,
			},
			async (args) => {
				const result = await tool.execute(args as Record<string, unknown>, { dir: '' });
				// Spread to satisfy SDK's index-signature requirement
				return { ...result };
			},
		);
	}
}

async function main() {
	const { config, transport: transportType, port } = parseServerOptions();
	const { tools, connection } = createBrowserTools(config);

	if (transportType === 'http') {
		const sessions = new Map<string, StreamableHTTPServerTransport>();

		/* eslint-disable @typescript-eslint/naming-convention -- HTTP header names */
		const corsHeaders: Record<string, string> = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version',
			'Access-Control-Expose-Headers': 'Mcp-Session-Id',
		};
		/* eslint-enable @typescript-eslint/naming-convention */

		const httpServer = createServer((req, res) => {
			if (req.method === 'OPTIONS') {
				res.writeHead(204, corsHeaders);
				res.end();
				return;
			}

			for (const [key, value] of Object.entries(corsHeaders)) {
				res.setHeader(key, value);
			}

			const sessionId = req.headers['mcp-session-id'] as string | undefined;
			const existingTransport = sessionId ? sessions.get(sessionId) : undefined;

			if (existingTransport) {
				void existingTransport.handleRequest(req, res);
				return;
			}

			if (sessionId) {
				// Unknown session ID — tell client to re-initialize
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
				res.writeHead(404, { 'Content-Type': 'application/json' });
				res.end(
					JSON.stringify({
						jsonrpc: '2.0',
						error: { code: -32000, message: 'Session not found' },
						id: null,
					}),
				);
				return;
			}

			// New session: create a fresh transport + server pair
			const transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: () => randomUUID(),
				onsessioninitialized: (id) => {
					sessions.set(id, transport);
				},
			});

			transport.onclose = () => {
				if (transport.sessionId) {
					sessions.delete(transport.sessionId);
				}
			};

			const mcpServer = new McpServer({ name: 'n8n-browser', version: '1.0.0' });
			registerTools(mcpServer, tools);

			void mcpServer.connect(transport).then(() => {
				void transport.handleRequest(req, res);
			});
		});

		httpServer.listen(port, () => {
			console.debug(`n8n-browser MCP server listening on http://localhost:${port}`);
		});
	} else {
		const server = new McpServer({ name: 'n8n-browser', version: '1.0.0' });
		registerTools(server, tools);
		const transport = new StdioServerTransport();
		await server.connect(transport);
	}

	const shutdown = async () => {
		await connection.shutdown();
		process.exit(0);
	};

	// eslint-disable-next-line no-void
	process.on('SIGTERM', () => void shutdown());
	// eslint-disable-next-line no-void
	process.on('SIGINT', () => void shutdown());
}

void main();

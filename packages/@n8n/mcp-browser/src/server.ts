#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { parseServerOptions } from './server-config';
import { createBrowserTools } from './tools/index';
import type { McpImageContent, ToolResponse } from './types';

/**
 * Convert our internal `media`/`mediaType` content to the MCP SDK's `image`/`mimeType` format.
 * This is the boundary conversion — internally we use `media`/`mediaType` everywhere,
 * but the MCP SDK expects `image`/`mimeType`.
 */
function toMcpResult(response: ToolResponse) {
	return {
		...response,
		content: response.content.map((c) => {
			if (c.type === 'media') {
				const media = c as McpImageContent;
				return { type: 'image' as const, data: media.data, mimeType: media.mediaType };
			}
			return c;
		}),
	};
}

function registerTools(server: McpServer, tools: ReturnType<typeof createBrowserTools>['tools']) {
	for (const tool of tools) {
		server.tool(tool.name, tool.description, tool.inputSchema.shape, async (args) => {
			const result = await tool.execute(args as Record<string, unknown>, { dir: '' });
			return toMcpResult(result);
		});
	}
}

async function main() {
	const { config, transport: transportType, port } = parseServerOptions();
	const { tools, sessionManager } = createBrowserTools(config);

	if (transportType === 'http') {
		const sessions = new Map<string, StreamableHTTPServerTransport>();

		const corsHeaders: Record<string, string> = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version',
			'Access-Control-Expose-Headers': 'Mcp-Session-Id',
		};

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
			console.error(`n8n-browser MCP server listening on http://localhost:${port}`);
		});
	} else {
		const server = new McpServer({ name: 'n8n-browser', version: '1.0.0' });
		registerTools(server, tools);
		const transport = new StdioServerTransport();
		await server.connect(transport);
	}

	const shutdown = async () => {
		await sessionManager.shutdown();
		process.exit(0);
	};

	process.on('SIGTERM', () => void shutdown());
	process.on('SIGINT', () => void shutdown());
}

void main();

#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import type { BrowserConnection } from './connection';
import { parseServerOptions } from './server-config';
import { createBrowserTools } from './tools/index';
import type { Config, ToolDefinition } from './types';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

function registerTools(server: McpServer, tools: ToolDefinition[]) {
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
				return { ...result };
			},
		);
	}
}

export function buildAllowedHosts(host: string, port: number): string[] | undefined {
	// When the user explicitly binds to a non-loopback address (e.g. `--host 0.0.0.0`
	// for a container or LAN exposure), real clients send the LAN IP or hostname as
	// the Host header, never the bind address. Returning undefined makes the SDK
	// skip Host header validation; the user has opted in to LAN exposure and is
	// expected to gate access via the bearer token and the Origin guard below.
	if (!LOOPBACK_HOSTS.has(host)) return undefined;
	const hosts = new Set<string>();
	for (const alias of LOOPBACK_HOSTS) hosts.add(`${alias}:${port}`);
	return [...hosts];
}

function constantTimeEqual(a: string, b: string): boolean {
	const aBuf = Buffer.from(a, 'utf8');
	const bBuf = Buffer.from(b, 'utf8');
	if (aBuf.length !== bBuf.length) return false;
	return timingSafeEqual(aBuf, bBuf);
}

// The MCP SDK ships `requireBearerAuth` middleware, but it expects an OAuth
// `TokenVerifier` and an Express handler. For this static-token, raw-`http`
// transport we keep the check inline.
export function isAuthorized(req: IncomingMessage, expectedToken: string): boolean {
	const header = req.headers.authorization;
	if (typeof header !== 'string') return false;
	const match = /^Bearer\s+(.+)$/i.exec(header.trim());
	if (!match) return false;
	return constantTimeEqual(match[1], expectedToken);
}

function writeJsonError(res: ServerResponse, status: number, message: string) {
	res.writeHead(status, {
		// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
		'Content-Type': 'application/json',
	});
	res.end(
		JSON.stringify({
			jsonrpc: '2.0',
			error: { code: -32000, message },
			id: null,
		}),
	);
}

export async function startHttpTransport(opts: {
	config: Partial<Config>;
	host: string;
	port: number;
	authToken: string;
}): Promise<{
	httpServer: ReturnType<typeof createServer>;
	activeConnections: Set<BrowserConnection>;
}> {
	const { config, host, port, authToken } = opts;
	const sessions = new Map<string, StreamableHTTPServerTransport>();
	const activeConnections = new Set<BrowserConnection>();
	const allowedHosts = buildAllowedHosts(host, port);

	const httpServer = createServer((req, res) => {
		// Reject any request that carries an Origin header. The transport has no
		// browser clients; the only way an Origin header appears is from a
		// fetch/XHR initiated by web content, which we never want to serve.
		// Browser CORS preflights also carry Origin and are blocked here.
		if (typeof req.headers.origin === 'string' && req.headers.origin.length > 0) {
			writeJsonError(res, 403, 'Origin not allowed');
			return;
		}

		if (!isAuthorized(req, authToken)) {
			writeJsonError(res, 401, 'Unauthorized');
			return;
		}

		const sessionId = req.headers['mcp-session-id'] as string | undefined;
		const existingTransport = sessionId ? sessions.get(sessionId) : undefined;

		if (existingTransport) {
			void existingTransport.handleRequest(req, res);
			return;
		}

		if (sessionId) {
			writeJsonError(res, 404, 'Session not found');
			return;
		}

		const { tools, connection } = createBrowserTools(config);
		activeConnections.add(connection);

		// SDK Origin enforcement only activates when `allowedOrigins` is non-empty,
		// and our policy is "no browser origin is ever acceptable" — the manual
		// guard above handles that. DNS-rebinding protection on the Host header
		// still adds value when bound to loopback, so keep it enabled there.
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => randomUUID(),
			enableDnsRebindingProtection: allowedHosts !== undefined,
			allowedHosts,
			onsessioninitialized: (id) => {
				sessions.set(id, transport);
			},
		});

		transport.onclose = () => {
			if (transport.sessionId) sessions.delete(transport.sessionId);
			activeConnections.delete(connection);
			void connection.shutdown();
		};

		const mcpServer = new McpServer({ name: 'n8n-browser', version: '1.0.0' });
		registerTools(mcpServer, tools);

		void mcpServer.connect(transport).then(() => {
			void transport.handleRequest(req, res);
		});
	});

	await new Promise<void>((resolve) => {
		httpServer.listen(port, host, () => {
			console.debug(`n8n-browser MCP server listening on http://${host}:${port}`);
			resolve();
		});
	});

	return { httpServer, activeConnections };
}

async function main() {
	const {
		config,
		transport: transportType,
		host,
		port,
		authToken,
		authTokenGenerated,
	} = parseServerOptions();

	let cleanup: () => Promise<void>;

	if (transportType === 'http') {
		const { activeConnections, httpServer } = await startHttpTransport({
			config,
			host,
			port,
			authToken,
		});

		if (authTokenGenerated) {
			console.error(`Auth token: ${authToken}`);
			console.error('Pass this token as "Authorization: Bearer <token>" on every request.');
		}

		cleanup = async () => {
			const connections = [...activeConnections];
			activeConnections.clear();
			await new Promise<void>((resolve) => httpServer.close(() => resolve()));
			await Promise.allSettled(connections.map(async (c) => await c.shutdown()));
		};
	} else {
		const { tools, connection } = createBrowserTools(config);
		const server = new McpServer({ name: 'n8n-browser', version: '1.0.0' });
		registerTools(server, tools);
		const transport = new StdioServerTransport();
		await server.connect(transport);

		cleanup = async () => {
			await connection.shutdown();
		};
	}

	const shutdown = async () => {
		await cleanup();
		process.exit(0);
	};

	// eslint-disable-next-line no-void
	process.on('SIGTERM', () => void shutdown());
	// eslint-disable-next-line no-void
	process.on('SIGINT', () => void shutdown());
}

if (require.main === module) {
	void main();
}

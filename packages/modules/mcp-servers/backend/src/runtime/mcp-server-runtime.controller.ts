import { Logger } from '@n8n/backend-common';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	createIpRateLimit,
	Delete,
	Get,
	Options,
	Post,
	RootLevelController,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { lazyImport } from '@n8n/utils/lazy-import';
import type { Request, Response } from 'express';

import { McpServerConnectionRecorder } from '../access/mcp-server-connection-recorder';
import type { McpServer } from '../database/entities/mcp-server.entity';
import { McpServersConfig } from '../mcp-servers.config';
import { MCP_SERVERS_PATH, McpServerProtectedResource } from './mcp-server-protected-resource';
import type { McpServerCaller } from './mcp-server-runtime.service';
import { McpServerRuntimeService } from './mcp-server-runtime.service';

type RuntimeRequest = Request<{ slug: string }>;

// The routes skip the n8n session and take a bearer token, so they get an IP rate limit, as the
// instance MCP does.
const routeOptions = {
	skipAuth: true,
	usesTemplates: true,
	ipRateLimit: createIpRateLimit(Container.get(McpServersConfig).rateLimit),
} as const;

/**
 * The MCP endpoint of each custom server: MCP over streamable HTTP, with no session and no SSE.
 * Each POST carries the token, and n8n builds a new MCP server object for the request, so any
 * main instance can answer.
 */
@RootLevelController(MCP_SERVERS_PATH)
export class McpServerRuntimeController {
	constructor(
		private readonly resources: McpServerProtectedResource,
		private readonly runtime: McpServerRuntimeService,
		private readonly connections: McpServerConnectionRecorder,
		private readonly logger: Logger,
	) {}

	@Post('/:slug', routeOptions)
	async handle(req: RuntimeRequest, res: Response) {
		this.setCorsHeaders(res);
		const server = await this.resources.findServer(req.params.slug);
		if (!server) {
			res.status(404).end();
			return;
		}

		const admitted = await this.runtime.admit(server, req);
		if (!admitted.ok) {
			const status = admitted.reason === 'insufficient_scope' ? 403 : 401;
			res.set('WWW-Authenticate', await this.runtime.challenge(admitted));
			res.status(status).end();
			return;
		}

		const caller = this.runtime.callerOf(admitted.context);
		await this.recordUse(server, caller);

		try {
			const { createMcpHandler } = await lazyImport<typeof import('@modelcontextprotocol/server')>(
				async () => await import('@modelcontextprotocol/server'),
			);
			const { toNodeHandler } = await lazyImport<typeof import('@modelcontextprotocol/node')>(
				async () => await import('@modelcontextprotocol/node'),
			);
			const handler = createMcpHandler(
				async () => await this.runtime.createServer(server, caller),
				{ legacy: 'stateless', onerror: (error) => this.logError(error) },
			);
			await toNodeHandler(handler)(req, res, req.body);
		} catch (error) {
			this.logError(error);
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: '2.0',
					error: { code: -32603, message: 'Internal server error' },
					id: null,
				});
			}
		}
	}

	/** The CORS preflight of a browser-based MCP client. */
	@Options('/:slug', routeOptions)
	preflight(_req: RuntimeRequest, res: Response) {
		this.setCorsHeaders(res);
		res.header('Access-Control-Max-Age', '86400');
		res.status(204).end();
	}

	/** The endpoint keeps no session, so it has no stream to offer and nothing to end. */
	@Get('/:slug', routeOptions)
	async get(req: RuntimeRequest, res: Response) {
		await this.methodNotAllowed(req, res);
	}

	@Delete('/:slug', routeOptions)
	async delete(req: RuntimeRequest, res: Response) {
		await this.methodNotAllowed(req, res);
	}

	/** The connection row only informs the builder. A failed write must not fail the request. */
	private async recordUse(server: McpServer, caller: McpServerCaller) {
		if (!caller.clientId) return;
		try {
			await this.connections.recordUse(server, caller.userId, caller.clientId);
		} catch (error) {
			this.logger.warn('Could not record the use of a custom MCP server', {
				error: ensureError(error).message,
			});
		}
	}

	private logError(error: unknown) {
		this.logger.error('Custom MCP server request failed', { error: ensureError(error).message });
	}

	/** An unknown server, or one behind a flag that is off, answers 404 for every method. */
	private async methodNotAllowed(req: RuntimeRequest, res: Response) {
		this.setCorsHeaders(res);
		if (!(await this.resources.findServer(req.params.slug))) {
			res.status(404).end();
			return;
		}
		res.set('Allow', 'POST');
		res.status(405).end();
	}

	private setCorsHeaders(res: Response) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
		res.header(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
		);
		res.header('Access-Control-Expose-Headers', 'WWW-Authenticate');
	}
}

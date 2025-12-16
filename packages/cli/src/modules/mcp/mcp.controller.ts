import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Head, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { Telemetry } from '@/telemetry';

import { McpServerMiddlewareService } from './mcp-server-middleware.service';
import {
	USER_CONNECTED_TO_MCP_EVENT,
	MCP_ACCESS_DISABLED_ERROR_MESSAGE,
	INTERNAL_SERVER_ERROR_MESSAGE,
} from './mcp.constants';
import { McpService } from './mcp.service';
import { McpSettingsService } from './mcp.settings.service';
import { isJSONRPCRequest } from './mcp.typeguards';
import type { UserConnectedToMCPEventPayload } from './mcp.types';
import { getClientInfo } from './mcp.utils';

export type FlushableResponse = Response & { flush: () => void };

const getAuthMiddleware = () => Container.get(McpServerMiddlewareService).getAuthMiddleware();

@RootLevelController('/mcp-server')
export class McpController {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly mcpService: McpService,
		private readonly mcpSettingsService: McpSettingsService,
		private readonly telemetry: Telemetry,
		private readonly logger: Logger,
	) {}

	// Add CORS headers helper
	private setCorsHeaders(res: Response) {
		// Allow requests from Claude AI playground and other MCP clients
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Max-Age', '86400'); // 24 hours
	}

	// // Handle OPTIONS preflight requests
	// @Option('/http', {
	// 	skipAuth: true,
	// })
	// async handlePreflight(req: AuthenticatedRequest, res: Response) {
	// 	this.setCorsHeaders(res);
	// 	res.status(204).send();
	// }

	/**
	 * HEAD endpoint for authentication scheme discovery
	 * Per RFC 6750 Section 3, returns 401 with WWW-Authenticate header
	 * This allows MCP clients to probe the endpoint and discover Bearer token authentication
	 */
	@Head('/http', {
		skipAuth: true,
		usesTemplates: true,
	})
	async discoverAuthSchemeHead(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.header('WWW-Authenticate', 'Bearer realm="n8n MCP Server"');
		res.status(401).end();
	}

	@Post('/http', {
		rateLimit: { limit: 100 },
		middlewares: [getAuthMiddleware()],
		skipAuth: true,
		usesTemplates: true,
	})
	async build(req: AuthenticatedRequest, res: FlushableResponse) {
		// Set CORS headers for all responses
		this.setCorsHeaders(res);

		const body = req.body;
		this.logger.debug('MCP Request', { body });
		const isInitializationRequest = isJSONRPCRequest(body) ? body.method === 'initialize' : false;
		const isToolCallRequest = isJSONRPCRequest(body) ? body.method === 'toolCall' : false;
		const clientInfo = getClientInfo(req);

		const telemetryPayload: Partial<UserConnectedToMCPEventPayload> = {
			user_id: req.user.id,
			client_name: clientInfo?.name,
			client_version: clientInfo?.version,
		};

		// Deny if MCP access is disabled
		const enabled = await this.mcpSettingsService.getEnabled();

		if (!enabled) {
			if (isInitializationRequest) {
				this.trackConnectionEvent({
					...telemetryPayload,
					mcp_connection_status: 'error',
					error: MCP_ACCESS_DISABLED_ERROR_MESSAGE,
				});
			}
			// Return 403 Forbidden
			res.status(403).json({ message: MCP_ACCESS_DISABLED_ERROR_MESSAGE });
			return;
		}
		// In stateless mode, create a new instance of transport and server for each request
		// to ensure complete isolation. A single instance would cause request ID collisions
		// when multiple clients connect concurrently.
		try {
			const server = this.mcpService.getServer(req.user);
			const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
			});
			res.on('close', () => {
				void transport.close();
				void server.close();
			});
			await server.connect(transport);
			await transport.handleRequest(req, res, req.body);
			if (isInitializationRequest) {
				this.trackConnectionEvent({
					...telemetryPayload,
					mcp_connection_status: 'success',
				});
			} else if (isToolCallRequest) {
				this.logger.debug('MCP Tool Call request', body);
			}
		} catch (error) {
			this.errorReporter.error(error);
			if (isInitializationRequest) {
				this.trackConnectionEvent({
					...telemetryPayload,
					mcp_connection_status: 'error',
					error: error instanceof Error ? error.message : String(error),
				});
			}
			// Return JSON-RPC error response
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: '2.0',
					error: {
						code: -32603,
						message: INTERNAL_SERVER_ERROR_MESSAGE,
					},
					id: null,
				});
			}
		}
	}

	private trackConnectionEvent(payload: UserConnectedToMCPEventPayload) {
		this.telemetry.track(USER_CONNECTED_TO_MCP_EVENT, payload);
	}
}

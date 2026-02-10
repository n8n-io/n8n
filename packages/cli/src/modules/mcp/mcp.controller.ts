import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Head, Options, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { Telemetry } from '@/telemetry';

import { McpServerMiddlewareService } from './mcp-server-middleware.service';
import {
	USER_CONNECTED_TO_MCP_EVENT,
	MCP_ACCESS_DISABLED_ERROR_MESSAGE,
	INTERNAL_SERVER_ERROR_MESSAGE,
	MCP_ENDPOINT_INFO,
} from './mcp.constants';
import { McpService } from './mcp.service';
import { McpSettingsService } from './mcp.settings.service';
import { isJSONRPCRequest } from './mcp.typeguards';
import type { UserConnectedToMCPEventPayload } from './mcp.types';
import { getClientInfo } from './mcp.utils';

export type FlushableResponse = Response & { flush: () => void };

const getAuthMiddleware = () => Container.get(McpServerMiddlewareService).getAuthMiddleware();

/**
 * MCP (Model Context Protocol) HTTP Server Controller
 * 
 * Exposes the /mcp-server/http endpoint for MCP clients to connect and interact with n8n workflows.
 * 
 * ## Endpoint Registration
 * This controller is automatically registered when the MCP module is loaded (it's in the default modules list).
 * The endpoint is available at: https://[your-domain]/mcp-server/http
 * 
 * ## Common 404 Issues and Solutions
 * 
 * If you're getting a 404 error when accessing /mcp-server/http:
 * 
 * 1. **Module Not Loaded**: Ensure the MCP module is not disabled
 *    - Check that 'mcp' is not in N8N_DISABLED_MODULES environment variable
 *    - The module is enabled by default, so this is rare
 * 
 * 2. **MCP Access Disabled**: The endpoint exists but returns 403 if MCP access is disabled
 *    - Enable MCP access in n8n UI: Settings > MCP Access
 *    - Or use the API: PATCH /rest/mcp/settings with {"mcpAccessEnabled": true}
 *    - Note: There is NO N8N_MCP_ENABLED environment variable
 * 
 * 3. **Reverse Proxy Configuration**: If using Cloudflare Tunnel, nginx, or similar
 *    - Ensure the proxy passes through all HTTP methods (GET, POST, HEAD, OPTIONS)
 *    - Verify WebSocket/SSE support if using SSE transport
 *    - Check that the /mcp-server/* path is correctly forwarded
 * 
 * ## Authentication
 * The POST endpoint requires Bearer token authentication (API key or OAuth token).
 * Use HEAD or GET requests without auth to discover the endpoint and check if MCP is enabled.
 * 
 * ## Supported HTTP Methods
 * - OPTIONS: CORS preflight (no auth required)
 * - GET: Endpoint discovery and health check (no auth required)
 * - HEAD: Authentication scheme discovery (no auth required)
 * - POST: MCP JSON-RPC requests (requires Bearer token)
 */
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
		res.header('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Max-Age', '86400'); // 24 hours
	}

	/**
	 * OPTIONS endpoint for CORS preflight requests
	 * Handles preflight requests from browsers before actual MCP requests
	 */
	@Options('/http', {
		skipAuth: true,
		usesTemplates: true,
	})
	async handlePreflight(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	/**
	 * GET endpoint for endpoint discovery and health check
	 * Returns information about the MCP server endpoint
	 */
	@Get('/http', {
		skipAuth: true,
		usesTemplates: true,
	})
	async discoverEndpoint(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		
		const enabled = await this.mcpSettingsService.getEnabled();
		
		if (!enabled) {
			res.status(403).json({
				error: 'MCP access is disabled',
				message: MCP_ACCESS_DISABLED_ERROR_MESSAGE,
			});
			return;
		}

		res.status(200).json(MCP_ENDPOINT_INFO);
	}

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
		ipRateLimit: { limit: 100 },
		middlewares: [getAuthMiddleware()],
		skipAuth: true,
		usesTemplates: true,
	})
	async build(req: AuthenticatedRequest, res: FlushableResponse) {
		// Set CORS headers for all responses
		this.setCorsHeaders(res);

		const body = req.body;
		this.logger.debug('MCP Request received', { 
			method: isJSONRPCRequest(body) ? body.method : 'unknown',
			hasUser: !!req.user,
			userId: req.user?.id,
		});

		// Verify user is authenticated (middleware should have set this)
		if (!req.user) {
			this.logger.warn('MCP request rejected: No authenticated user');
			res.status(401).json({
				jsonrpc: '2.0',
				error: {
					code: -32001,
					message: 'Authentication required',
				},
				id: null,
			});
			return;
		}

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
			this.logger.warn('MCP request rejected: MCP access is disabled', {
				userId: req.user.id,
				method: isJSONRPCRequest(body) ? body.method : 'unknown',
			});

			if (isInitializationRequest) {
				this.trackConnectionEvent({
					...telemetryPayload,
					mcp_connection_status: 'error',
					error: MCP_ACCESS_DISABLED_ERROR_MESSAGE,
				});
			}
			// Return 403 Forbidden
			res.status(403).json({ 
				jsonrpc: '2.0',
				error: {
					code: -32002,
					message: MCP_ACCESS_DISABLED_ERROR_MESSAGE,
				},
				id: isJSONRPCRequest(body) ? body.id : null,
			});
			return;
		}

		// In stateless mode, create a new instance of transport and server for each request
		// to ensure complete isolation. A single instance would cause request ID collisions
		// when multiple clients connect concurrently.
		try {
			this.logger.debug('Creating MCP server and transport', { userId: req.user.id });

			const { StreamableHTTPServerTransport } = await import(
				'@modelcontextprotocol/sdk/server/streamableHttp.js'
			);
			const server = await this.mcpService.getServer(req.user);
			const transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
			});

			res.on('close', () => {
				this.logger.debug('MCP connection closed', { userId: req.user.id });
				void transport.close();
				void server.close();
			});

			await server.connect(transport);
			await transport.handleRequest(req, res, req.body);

			if (isInitializationRequest) {
				this.logger.info('MCP client initialized successfully', {
					userId: req.user.id,
					clientName: clientInfo?.name,
					clientVersion: clientInfo?.version,
				});
				this.trackConnectionEvent({
					...telemetryPayload,
					mcp_connection_status: 'success',
				});
			} else if (isToolCallRequest) {
				this.logger.debug('MCP tool call processed', { 
					userId: req.user.id,
					tool: isJSONRPCRequest(body) ? body.params : undefined,
				});
			}
		} catch (error) {
			this.logger.error('MCP request failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});

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
						data: error instanceof Error ? error.message : String(error),
					},
					id: isJSONRPCRequest(body) ? body.id : null,
				});
			}
		}
	}

	private trackConnectionEvent(payload: UserConnectedToMCPEventPayload) {
		this.telemetry.track(USER_CONNECTED_TO_MCP_EVENT, payload);
	}
}

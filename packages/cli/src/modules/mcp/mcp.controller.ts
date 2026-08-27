import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { createIpRateLimit, Get, Head, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { lazyImport } from '@n8n/utils/lazy-import';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { Telemetry } from '@/telemetry';

import { McpProtectedResource } from './mcp-protected-resource';
import { McpServerMiddlewareService } from './mcp-server-middleware.service';
import { McpConfig } from './mcp.config';
import {
	USER_CONNECTED_TO_MCP_EVENT,
	MCP_ACCESS_DISABLED_ERROR_MESSAGE,
	INTERNAL_SERVER_ERROR_MESSAGE,
	MCP_DISCOVER_METHOD,
} from './mcp.constants';
import { McpService, type McpFeatureFlags } from './mcp.service';
import { McpSettingsService } from './mcp.settings.service';
import { isJSONRPCRequest } from './mcp.typeguards';
import type {
	McpAuthContext,
	McpAuthenticatedRequest,
	UserConnectedToMCPEventPayload,
} from './mcp.types';
import { getClientInfo, getProtocolVersion } from './mcp.utils';

export type FlushableResponse = Response & { flush: () => void };

const getAuthMiddleware = () => Container.get(McpServerMiddlewareService).getAuthMiddleware();

const mcpConfig = Container.get(McpConfig);

@RootLevelController('/mcp-server')
export class McpController {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly mcpService: McpService,
		private readonly mcpSettingsService: McpSettingsService,
		private readonly telemetry: Telemetry,
		private readonly logger: Logger,
		private readonly mcpProtectedResource: McpProtectedResource,
	) {}

	// Add CORS headers helper
	private setCorsHeaders(res: Response) {
		// Allow requests from Claude AI playground and other MCP clients
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		// MCP-Protocol-Version, Mcp-Method and Mcp-Name are the 2026-07-28 routing
		// headers. Without listing them here a browser-based client can't send
		// them, so the server would reject its requests with a header mismatch.
		res.header(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-Requested-With, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
		);
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
		const prmUrl = this.mcpProtectedResource.getProtectedResourceMetadataUrl();
		res.header('WWW-Authenticate', `Bearer realm="n8n MCP Server", resource_metadata="${prmUrl}"`);
		res.status(401).end();
	}

	/**
	 * GET endpoint (MCP Streamable HTTP spec). The server runs in stateless mode
	 * (a fresh transport per request), so it can never deliver server-initiated
	 * messages on a GET listen stream: routing the request into the transport
	 * leaves the SSE stream open and silent forever, stalling clients during
	 * connection setup. The spec requires servers that don't offer the stream
	 * to respond with 405.
	 */
	@Get('/http', {
		ipRateLimit: createIpRateLimit(mcpConfig.rateLimitServer),
		middlewares: [getAuthMiddleware()],
		skipAuth: true,
		usesTemplates: true,
	})
	async handleGet(_req: AuthenticatedRequest, res: Response) {
		this.setCorsHeaders(res);

		const enabled = await this.mcpSettingsService.getEnabled();
		if (!enabled) {
			res.status(403).json({ message: MCP_ACCESS_DISABLED_ERROR_MESSAGE });
			return;
		}

		res.header('Allow', 'POST');
		res.status(405).json({
			jsonrpc: '2.0',
			error: {
				code: -32000,
				message: 'Method not allowed.',
			},
			id: null,
		});
	}

	@Post('/http', {
		ipRateLimit: createIpRateLimit(mcpConfig.rateLimitServer),
		middlewares: [getAuthMiddleware()],
		skipAuth: true,
		usesTemplates: true,
	})
	async build(req: AuthenticatedRequest, res: FlushableResponse) {
		// Set CORS headers for all responses
		this.setCorsHeaders(res);

		const body = req.body;
		this.logger.debug('MCP Request', { body });
		// The 2026-07-28 revision drops `initialize`; a modern client's first
		// request is `server/discover`, so both mark the connection handshake for
		// telemetry. Legacy clients on the stateless fallback still send
		// `initialize`.
		const isConnectionHandshake = isJSONRPCRequest(body)
			? body.method === 'initialize' || body.method === MCP_DISCOVER_METHOD
			: false;
		const isToolCallRequest = isJSONRPCRequest(body) ? body.method === 'tools/call' : false;
		const clientInfo = getClientInfo(req);

		const baseTelemetryPayload: Partial<UserConnectedToMCPEventPayload> = {
			user_id: req.user.id,
			client_name: clientInfo?.name,
			client_version: clientInfo?.version,
			protocol_version: getProtocolVersion(req),
			auth_type: (req as McpAuthenticatedRequest).mcpCaller?.authType,
		};

		const enabled = await this.mcpSettingsService.getEnabled();

		if (!enabled) {
			if (isConnectionHandshake) {
				this.trackConnectionEvent({
					...baseTelemetryPayload,
					mcp_connection_status: 'error',
					error: MCP_ACCESS_DISABLED_ERROR_MESSAGE,
				});
			}
			// Return 403 Forbidden
			res.status(403).json({ message: MCP_ACCESS_DISABLED_ERROR_MESSAGE });
			return;
		}

		const featureFlags = await this.mcpService.resolveFeatureFlags(req.user);

		const telemetryPayload: Partial<UserConnectedToMCPEventPayload> = {
			...baseTelemetryPayload,
			mcp_apps_enabled: featureFlags.mcpApps.enabled,
			mcp_apps_variant: featureFlags.mcpApps.variant,
			mcp_canvas_groups_enabled: featureFlags.canvasGroupsEnabled,
		};

		// In stateless mode, create a new instance of transport and server for each request
		// to ensure complete isolation. A single instance would cause request ID collisions
		// when multiple clients connect concurrently.
		try {
			await this.handleTransportRequest(req, res, featureFlags, req.body);
			if (isConnectionHandshake) {
				this.trackConnectionEvent({
					...telemetryPayload,
					mcp_connection_status: 'success',
				});
			} else if (isToolCallRequest) {
				this.logger.debug('MCP Tool Call request', body);
			}
		} catch (error) {
			this.errorReporter.error(error);
			if (isConnectionHandshake) {
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

	private async handleTransportRequest(
		req: AuthenticatedRequest,
		res: FlushableResponse,
		featureFlags: McpFeatureFlags,
		body: unknown,
	) {
		const { createMcpHandler } = await lazyImport<typeof import('@modelcontextprotocol/server')>(
			async () => await import('@modelcontextprotocol/server'),
		);
		const { toNodeHandler } = await lazyImport<typeof import('@modelcontextprotocol/node')>(
			async () => await import('@modelcontextprotocol/node'),
		);
		const mcpReq = req as McpAuthenticatedRequest;
		const auth: McpAuthContext = {
			caller: mcpReq.mcpCaller,
			grantedScopes: mcpReq.mcpScopes,
		};

		// The handler builds a fresh server per request (complete isolation, no
		// request-ID collisions across concurrent clients) and serves both the
		// 2026-07-28 protocol and, via the stateless legacy fallback, 2025-era
		// clients on this same endpoint.
		const handler = createMcpHandler(
			async () => await this.mcpService.getServer(req.user, featureFlags, getClientInfo(req), auth),
			{
				legacy: 'stateless',
				onerror: (error) => this.errorReporter.error(error),
			},
		);
		await toNodeHandler(handler)(req, res, body);
	}

	private trackConnectionEvent(payload: UserConnectedToMCPEventPayload) {
		this.telemetry.track(USER_CONNECTED_TO_MCP_EVENT, payload);
	}
}

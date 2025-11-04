import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { AuthenticatedRequest } from '@n8n/db';
import { Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { McpServerApiKeyService } from './mcp-api-key.service';
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

import { Telemetry } from '@/telemetry';

export type FlushableResponse = Response & { flush: () => void };

const getAuthMiddleware = () => Container.get(McpServerApiKeyService).getAuthMiddleware();

@RootLevelController('/mcp-server')
export class McpController {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly mcpService: McpService,
		private readonly mcpSettingsService: McpSettingsService,
		private readonly telemetry: Telemetry,
	) {}

	@Post('/http', {
		rateLimit: { limit: 100 },
		middlewares: [getAuthMiddleware()],
		skipAuth: true,
		usesTemplates: true,
	})
	async build(req: AuthenticatedRequest, res: FlushableResponse) {
		const body = req.body;
		const isInitializationRequest = isJSONRPCRequest(body) ? body.method === 'initialize' : false;
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

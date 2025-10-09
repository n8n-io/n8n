import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { AuthenticatedRequest } from '@n8n/db';
import { Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpService } from './mcp.service';
import { McpSettingsService } from './mcp.settings.service';

export type FlushableResponse = Response & { flush: () => void };

const getAuthMiddleware = () => Container.get(McpServerApiKeyService).getAuthMiddleware();

@RootLevelController('/mcp-server')
export class McpController {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly mcpService: McpService,
		private readonly mcpSettingsService: McpSettingsService,
	) {}

	@Post('/http', {
		rateLimit: { limit: 100 },
		middlewares: [getAuthMiddleware()],
		skipAuth: true,
		usesTemplates: true,
	})
	async build(req: AuthenticatedRequest, res: FlushableResponse) {
		// Deny if MCP access is disabled
		const enabled = await this.mcpSettingsService.getEnabled();
		if (!enabled) {
			res.status(403).json({ message: 'MCP access is disabled' });
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
		} catch (error) {
			this.errorReporter.error(error);
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: '2.0',
					error: {
						code: -32603,
						message: 'Internal server error',
					},
					id: null,
				});
			}
		}
	}
}

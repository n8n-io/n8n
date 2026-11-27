import {
	mcpRegistryDiscoveryRequestSchema,
	type McpRegistryDiscoveryResponse,
	type McpRegistryServerResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Post, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';

import { McpConnectionDiscoveryService } from './mcp-connection-discovery.service';
import { toMcpRegistryServerResponse } from './mcp-registry-response';
import { McpRegistryService } from './registry/mcp-registry.service';

@RestController('/mcp-registry')
export class McpRegistryController {
	constructor(
		private readonly service: McpRegistryService,
		private readonly discoveryService: McpConnectionDiscoveryService,
	) {}

	@Get('/servers')
	@GlobalScope('mcp:oauth')
	async listServers(): Promise<McpRegistryServerResponse[]> {
		const servers = await this.service.getAll({ includeDeprecated: false });
		return servers.flatMap((server) => {
			const response = toMcpRegistryServerResponse(server);
			return response ? [response] : [];
		});
	}

	@Post('/discover')
	@GlobalScope('mcp:oauth')
	async discover(req: AuthenticatedRequest): Promise<McpRegistryDiscoveryResponse> {
		const payload = mcpRegistryDiscoveryRequestSchema.safeParse(req.body);
		if (!payload.success) throw new BadRequestError('Invalid MCP discovery request');
		return await this.discoveryService.discover(req.user, payload.data);
	}
}

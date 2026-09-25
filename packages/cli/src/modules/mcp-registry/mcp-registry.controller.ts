import {
	mcpRegistryDiscoveryRequestSchema,
	type McpRegistryDiscoveryResponse,
	type McpRegistryServerResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Post, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { McpConnectionDiscoveryService } from './mcp-connection-discovery.service';
import { resolveMcpRegistryConnection } from './mcp-registry-connection';
import { getMcpRegistryCredentialOptions } from './node-description-transform';
import { McpRegistryService } from './registry/mcp-registry.service';
import type { McpRegistryServer } from './registry/mcp-registry.types';

@RestController('/mcp-registry')
export class McpRegistryController {
	constructor(
		private readonly service: McpRegistryService,
		private readonly discoveryService: McpConnectionDiscoveryService,
	) {}

	@Get('/servers')
	@GlobalScope('mcp:discover')
	async listServers(): Promise<McpRegistryServerResponse[]> {
		const servers = await this.service.getAll({ includeDeprecated: false });
		return servers.flatMap((server) => {
			const response = toResponse(server);
			return response ? [response] : [];
		});
	}

	@Post('/discover')
	@GlobalScope('mcp:discover')
	async discover(req: AuthenticatedRequest): Promise<McpRegistryDiscoveryResponse> {
		const payload = mcpRegistryDiscoveryRequestSchema.safeParse(req.body);
		if (!payload.success) throw new BadRequestError('Invalid MCP discovery request');
		return await this.discoveryService.discover(req.user, payload.data);
	}
}

function toResponse(server: McpRegistryServer): McpRegistryServerResponse | null {
	const connection = resolveMcpRegistryConnection(server);
	if (!connection) return null;
	const credentials = getMcpRegistryCredentialOptions(server).filter((option) =>
		connection.credentialBindings.some(
			(binding) => binding.credentialType === option.credentialType,
		),
	);
	if (credentials.length === 0) return null;
	return {
		slug: server.slug,
		nodeTypeName: connection.nodeTypeName,
		name: server.name,
		title: server.title,
		description: server.description,
		tagline: server.tagline,
		version: server.version,
		updatedAt: server.updatedAt,
		icons: server.icons,
		websiteUrl: server.websiteUrl,
		credentials,
		tools: server.tools.map((tool) => ({
			name: tool.name,
			...(tool.title ? { title: tool.title } : {}),
		})),
		isOfficial: server.isOfficial,
		status: server.status,
		tags: server.tags,
	};
}

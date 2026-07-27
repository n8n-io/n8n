import type { McpRegistryServerResponse } from '@n8n/api-types';
import { Get, RestController } from '@n8n/decorators';

import { getMcpRegistryCredentialTypeName } from './node-description-transform';
import { McpRegistryService } from './registry/mcp-registry.service';
import type { McpRegistryServer } from './registry/mcp-registry.types';

@RestController('/mcp-registry')
export class McpRegistryController {
	constructor(private readonly service: McpRegistryService) {}

	@Get('/servers')
	async listServers(): Promise<McpRegistryServerResponse[]> {
		const servers = await this.service.getAll({ includeDeprecated: false });
		return servers.map(toResponse);
	}
}

function toResponse(server: McpRegistryServer): McpRegistryServerResponse {
	return {
		slug: server.slug,
		name: server.name,
		title: server.title,
		description: server.description,
		tagline: server.tagline,
		version: server.version,
		updatedAt: server.updatedAt,
		icons: server.icons,
		websiteUrl: server.websiteUrl,
		credentialType: getMcpRegistryCredentialTypeName(server),
		tools: server.tools,
		isOfficial: server.isOfficial,
		status: server.status,
		tags: server.tags,
	};
}

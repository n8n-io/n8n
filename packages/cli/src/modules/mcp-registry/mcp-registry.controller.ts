import type { McpRegistryServerResponse } from '@n8n/api-types';
import { Get, RestController } from '@n8n/decorators';

import { resolveMcpRegistryConnection } from './mcp-registry-connection';
import { getMcpRegistryCredentialOptions } from './node-description-transform';
import { McpRegistryService } from './registry/mcp-registry.service';
import type { McpRegistryServer } from './registry/mcp-registry.types';
import { AI_GATEWAY_MANAGED_AUTH_TYPE } from './registry/mcp-registry.types';

@RestController('/mcp-registry')
export class McpRegistryController {
	constructor(private readonly service: McpRegistryService) {}

	/**
	 * Only Instance AI reads this, to fill its tool-connection picker. A
	 * templated row is dropped: that path cannot resolve the template, so
	 * `createConnection` refuses it and offering it leads nowhere. An n8n
	 * Connect MCP server is dropped too: Instance AI connects with a stored
	 * user credential, which such a server has none of, so it can never be
	 * connected.
	 */
	@Get('/servers')
	async listServers(): Promise<McpRegistryServerResponse[]> {
		const servers = await this.service.getAll({ includeDeprecated: false });
		return servers
			.filter(
				(server) =>
					server.authType !== AI_GATEWAY_MANAGED_AUTH_TYPE &&
					!resolveMcpRegistryConnection(server)?.isTemplated,
			)
			.map(toResponse);
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
		credentials: getMcpRegistryCredentialOptions(server),
		tools: server.tools.map((tool) => ({
			name: tool.name,
			...(tool.title ? { title: tool.title } : {}),
		})),
		isOfficial: server.isOfficial,
		status: server.status,
		tags: server.tags,
	};
}

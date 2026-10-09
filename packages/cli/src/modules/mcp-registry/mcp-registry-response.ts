import type { McpRegistryServerResponse } from '@n8n/api-types';

import { resolveMcpRegistryConnection } from './mcp-registry-connection';
import { getMcpRegistryCredentialOptions } from './node-description-transform';
import type { McpRegistryServer } from './registry/mcp-registry.types';

export function toMcpRegistryServerResponse(
	server: McpRegistryServer,
): McpRegistryServerResponse | null {
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
		isTemplated: connection.isTemplated === true,
		isOfficial: server.isOfficial,
		status: server.status,
		tags: server.tags,
	};
}

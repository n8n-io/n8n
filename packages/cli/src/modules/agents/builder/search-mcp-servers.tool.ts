import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { AgentJsonMcpServerConfig } from '@n8n/api-types';
import { camelCase } from 'change-case';
import { z } from 'zod';

import { MCP_REGISTRY_PACKAGE_NAME } from '@/modules/mcp-registry/node-description-transform';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';

import { BUILDER_TOOLS } from './builder-tool-names';

export interface SearchMcpServersDeps {
	mcpRegistryService: McpRegistryService;
}

type SearchMcpServersResult = Pick<
	AgentJsonMcpServerConfig,
	'name' | 'url' | 'transport' | 'authentication' | 'metadata'
> & {
	credentialType: string;
	title: string;
	description: string;
	tools: Array<{ name: string; title?: string }>;
};

const searchMcpServersInputSchema = z.object({
	queries: z
		.array(z.string())
		.min(1)
		.describe('Search queries for MCP servers (e.g., ["github"], ["slack"])'),
});

function getMcpRegistryCredentialTypeName(server: McpRegistryServer): string {
	return `${camelCase(server.slug)}McpOAuth2Api`;
}

function pickPreferredRemote(
	server: McpRegistryServer,
): { type: 'streamableHttp' | 'sse'; url: string } | null {
	const streamable = server.remotes.find((remote) => remote.type === 'streamable-http');
	if (streamable) return { type: 'streamableHttp', url: streamable.url };

	const sse = server.remotes.find((remote) => remote.type === 'sse');
	if (sse) return { type: 'sse', url: sse.url };

	return null;
}

function registryServerToMcpConfig(server: McpRegistryServer): SearchMcpServersResult | null {
	const remote = pickPreferredRemote(server);
	if (!remote) return null;

	const credentialType = getMcpRegistryCredentialTypeName(server);
	const nodeTypeName = `${MCP_REGISTRY_PACKAGE_NAME}.${camelCase(server.slug)}`;

	return {
		name: camelCase(server.slug),
		title: server.title,
		description: server.tagline,
		url: remote.url,
		transport: remote.type,
		authentication: credentialType,
		credentialType,
		tools: server.tools.map((tool) => ({
			name: tool.name,
			...(tool.title ? { title: tool.title } : {}),
		})),
		metadata: {
			nodeTypeName,
		},
	};
}

function normalizeQueries(queries: string[]): string[] {
	return queries.map((query) => query.trim().toLowerCase()).filter((query) => query.length > 0);
}

function matchesServerQuery(server: McpRegistryServer, normalizedQueries: string[]): boolean {
	const fields = [
		server.slug,
		camelCase(server.slug),
		server.title,
		server.description,
		server.tagline,
	]
		.map((field) => (typeof field === 'string' ? field.toLowerCase() : null))
		.filter((field) => field !== null);

	return normalizedQueries.some((query) => fields.some((field) => field.includes(query)));
}

export function buildSearchMcpServersTool(deps: SearchMcpServersDeps): BuiltTool {
	return new Tool(BUILDER_TOOLS.SEARCH_MCP_SERVERS)
		.description(
			'Search the MCP registry for available MCP servers. Returns MCP config-ready server details, ' +
				'including credentialType for ask_credential and server metadata needed for patch_config.',
		)
		.input(searchMcpServersInputSchema)
		.handler(async ({ queries }: { queries: string[] }) => {
			const normalizedQueries = normalizeQueries(queries);
			if (normalizedQueries.length === 0) return { results: [] };

			const servers = await deps.mcpRegistryService.getAll();
			const results = servers.flatMap((server) => {
				if (!matchesServerQuery(server, normalizedQueries)) return [];

				const transformed = registryServerToMcpConfig(server);
				return transformed ? [transformed] : [];
			});

			return { results };
		})
		.build();
}

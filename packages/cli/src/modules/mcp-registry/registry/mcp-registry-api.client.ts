import { Service } from '@n8n/di';

import { paginatedRequest } from '@/utils/strapi-utils';

import type { McpRegistryApiServer, McpRegistryServer } from './mcp-registry.types';

export type McpRegistryServerMetadata = Pick<McpRegistryServer, 'slug' | 'version' | 'updatedAt'>;

const MCP_SERVERS_STAGING_URL = 'https://api-staging.n8n.io/api/mcp-servers';
const MCP_SERVERS_PRODUCTION_URL = 'https://api.n8n.io/api/mcp-servers';

/** Strapi's qs parser has an arrayLimit of 100 */
const STRAPI_ARRAY_LIMIT = 100;

@Service()
export class McpRegistryApiClient {
	async fetchAllServers(): Promise<McpRegistryApiServer[]> {
		const servers = await paginatedRequest<McpRegistryServer>(
			this.getUrl(),
			{
				pagination: { page: 1, pageSize: 25 },
			},
			{
				throwOnError: true,
			},
		);

		return this.stripIds(servers);
	}

	async fetchServersMetadata(): Promise<McpRegistryServerMetadata[]> {
		return await paginatedRequest<McpRegistryServerMetadata>(
			this.getUrl(),
			{
				fields: ['slug', 'version', 'updatedAt'],
				pagination: { page: 1, pageSize: 500 },
			},
			{
				throwOnError: true,
			},
		);
	}

	async fetchServersBySlugs(slugs: string[]): Promise<McpRegistryApiServer[]> {
		const data: McpRegistryServer[] = [];
		for (let i = 0; i < slugs.length; i += STRAPI_ARRAY_LIMIT) {
			const batch = slugs.slice(i, i + STRAPI_ARRAY_LIMIT);
			const batchData = await paginatedRequest<McpRegistryServer>(
				this.getUrl(),
				{
					filters: {
						slug: {
							$in: batch,
						},
					},
					pagination: { page: 1, pageSize: 25 },
				},
				{
					throwOnError: true,
				},
			);
			data.push(...batchData);
		}

		return this.stripIds(data);
	}

	private stripIds(servers: McpRegistryServer[]): McpRegistryApiServer[] {
		return servers.map((server) => {
			const { id: _id, ...rest } = server;
			return rest;
		});
	}

	private getUrl(): string {
		const environment = process.env.ENVIRONMENT;
		if (environment === 'staging') {
			return MCP_SERVERS_STAGING_URL;
		}

		return MCP_SERVERS_PRODUCTION_URL;
	}
}

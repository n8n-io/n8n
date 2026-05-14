import { Service } from '@n8n/di';

import { buildStrapiUpdateQuery, paginatedRequest } from '@/utils/strapi-utils';

import type { McpRegistryServer } from './mcp-registry.types';

export type McpRegistryServerMetadata = Pick<McpRegistryServer, 'id' | 'version' | 'updatedAt'>;

const MCP_SERVERS_STAGING_URL = 'https://api-staging.n8n.io/api/mcp-servers';
const MCP_SERVERS_PRODUCTION_URL = 'https://api.n8n.io/api/mcp-servers';

/** Strapi's qs parser has an arrayLimit of 100 */
const STRAPI_ARRAY_LIMIT = 100;

@Service()
export class McpRegistryApiClient {
	async fetchAllServers(): Promise<McpRegistryServer[]> {
		return await paginatedRequest<McpRegistryServer>(this.getUrl(), {
			pagination: { page: 1, pageSize: 25 },
		});
	}

	async fetchServersMetadata(): Promise<McpRegistryServerMetadata[]> {
		return await paginatedRequest<McpRegistryServerMetadata>(
			this.getUrl(),
			{
				fields: ['version', 'updatedAt'],
				pagination: { page: 1, pageSize: 500 },
			},
			{
				throwOnError: true,
			},
		);
	}

	async fetchServersByIds(ids: number[]): Promise<McpRegistryServer[]> {
		const data: McpRegistryServer[] = [];
		for (let i = 0; i < ids.length; i += STRAPI_ARRAY_LIMIT) {
			const batch = ids.slice(i, i + STRAPI_ARRAY_LIMIT);
			const qs = buildStrapiUpdateQuery(batch);
			const batchData = await paginatedRequest<McpRegistryServer>(this.getUrl(), {
				...qs,
				pagination: { page: 1, pageSize: 25 },
			});
			data.push(...batchData);
		}

		return data;
	}

	private getUrl(): string {
		const environment = process.env.ENVIRONMENT;
		if (environment === 'staging') {
			return MCP_SERVERS_STAGING_URL;
		}

		return MCP_SERVERS_PRODUCTION_URL;
	}
}

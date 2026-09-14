import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
import { paginatedRequest } from '@/utils/strapi-utils';

import { isSupportedMcpRegistryCredentialType } from '../mcp-registry-connection';
import { parseMcpRegistryServer, type McpRegistryServer } from './mcp-registry.types';

export type McpRegistryServerMetadata = Pick<McpRegistryServer, 'slug' | 'version' | 'updatedAt'>;

const MCP_SERVERS_DEV_URL = 'http://127.0.0.1:1337/api/mcp-servers';
const MCP_SERVERS_STAGING_URL = 'https://api-staging.n8n.io/api/mcp-servers';
const MCP_SERVERS_PRODUCTION_URL = 'https://api.n8n.io/api/mcp-servers';

/** Strapi's qs parser has an arrayLimit of 100 */
const STRAPI_ARRAY_LIMIT = 100;
/** Version history:
 * 2 - introduced authType: `usesCredentials` field
 */
const STRAPI_API_VERSION = 2;

@Service()
export class McpRegistryApiClient {
	constructor(
		private readonly logger: Logger,
		private readonly credentialTypes: CredentialTypes,
	) {}

	async fetchAllServers(signal?: AbortSignal): Promise<McpRegistryServer[]> {
		const servers = await paginatedRequest<unknown>(
			this.getUrl(),
			{
				version: STRAPI_API_VERSION,
				pagination: { page: 1, pageSize: 25 },
			},
			{
				throwOnError: true,
				abortSignal: signal,
			},
		);
		return this.parseServers(servers);
	}

	async fetchServersMetadata(signal?: AbortSignal): Promise<McpRegistryServerMetadata[]> {
		return await paginatedRequest<McpRegistryServerMetadata>(
			this.getUrl(),
			{
				version: STRAPI_API_VERSION,
				fields: ['slug', 'version', 'updatedAt'],
				pagination: { page: 1, pageSize: 500 },
			},
			{
				throwOnError: true,
				abortSignal: signal,
			},
		);
	}

	async fetchServersBySlugs(slugs: string[], signal?: AbortSignal): Promise<McpRegistryServer[]> {
		const data: McpRegistryServer[] = [];
		for (let i = 0; i < slugs.length; i += STRAPI_ARRAY_LIMIT) {
			const batch = slugs.slice(i, i + STRAPI_ARRAY_LIMIT);
			const batchData = await paginatedRequest<unknown>(
				this.getUrl(),
				{
					version: STRAPI_API_VERSION,
					filters: {
						slug: {
							$in: batch,
						},
					},
					pagination: { page: 1, pageSize: 25 },
				},
				{
					throwOnError: true,
					abortSignal: signal,
				},
			);
			data.push(...this.parseServers(batchData));
		}

		return data;
	}

	private getUrl(): string {
		switch (process.env.ENVIRONMENT) {
			case 'dev':
				return process.env.N8N_MCP_SERVERS_DEV_URL || MCP_SERVERS_DEV_URL;
			case 'staging':
				return MCP_SERVERS_STAGING_URL;
			default:
				return MCP_SERVERS_PRODUCTION_URL;
		}
	}

	private parseServers(servers: unknown[]): McpRegistryServer[] {
		const parsedServers = servers
			.map(parseMcpRegistryServer)
			.map((server) => (server ? this.withSupportedCredentials(server) : null))
			.filter((server): server is McpRegistryServer => server !== null);
		const skippedCount = servers.length - parsedServers.length;
		if (skippedCount > 0) {
			this.logger.warn('Skipped invalid MCP registry entries', { skippedCount });
		}
		return parsedServers;
	}

	private withSupportedCredentials(server: McpRegistryServer): McpRegistryServer | null {
		if (server.authType === 'extendsCredential') {
			return server.extendsCredential &&
				isSupportedMcpRegistryCredentialType(this.credentialTypes, server.extendsCredential.extends)
				? server
				: null;
		}
		if (server.authType !== 'usesCredentials') return server;

		const usesCredentials = (server.usesCredentials ?? []).filter(({ credentialType }) =>
			isSupportedMcpRegistryCredentialType(this.credentialTypes, credentialType),
		);
		return usesCredentials.length > 0 ? { ...server, usesCredentials } : null;
	}
}

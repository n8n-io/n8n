import { Service } from '@n8n/di';

import type { McpRegistryServer } from './mcp-registry.types';
import { linearMockServer, notionMockServer } from './mock-servers';

export type McpRegistryServerMetadata = Pick<McpRegistryServer, 'id' | 'version' | 'updatedAt'>;

@Service()
export class McpRegistryApiClient {
	private readonly mockServers: McpRegistryServer[] = [notionMockServer, linearMockServer];

	async fetchAllServers(): Promise<McpRegistryServer[]> {
		return this.mockServers.map((server) => ({ ...server }));
	}

	async fetchServersMetadata(): Promise<McpRegistryServerMetadata[]> {
		return this.mockServers.map(({ id, version, updatedAt }) => ({ id, version, updatedAt }));
	}

	async fetchServersByIds(ids: number[]): Promise<McpRegistryServer[]> {
		const idSet = new Set(ids);
		return this.mockServers.filter(({ id }) => idSet.has(id)).map((server) => ({ ...server }));
	}
}

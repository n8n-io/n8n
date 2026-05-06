import { Service } from '@n8n/di';

import type { McpRegistryServer } from './mcp-registry.types';
import { notionMockServer } from './notion-mock-server';

@Service()
export class McpRegistryService {
	// TODO: Implement actual registry fetching and caching
	private readonly servers = new Map<string, McpRegistryServer>([
		[notionMockServer.slug, notionMockServer],
	]);

	getAll({ includeDeprecated = false }: { includeDeprecated?: boolean } = {}): McpRegistryServer[] {
		const all = Array.from(this.servers.values());
		return includeDeprecated ? all : all.filter((server) => server.status === 'active');
	}

	get(slug: string): McpRegistryServer | undefined {
		return this.servers.get(slug);
	}
}

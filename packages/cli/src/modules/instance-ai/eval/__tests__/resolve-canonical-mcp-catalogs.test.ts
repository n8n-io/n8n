import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';

import { resolveCanonicalMcpCatalogs } from '../agent-execution.service';

function registryWith(entries: Array<{ remote: string; tool: string }>) {
	const registry = mock<McpRegistryService>();
	registry.getAll.mockResolvedValue(
		entries.map(({ remote, tool }) => ({
			remotes: [{ url: remote }],
			tools: [{ name: tool, title: tool }],
		})) as never,
	);
	Container.set(McpRegistryService, registry);
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(true);
	return moduleRegistry;
}

const server = (url: string) => ({
	name: 'search',
	url,
	transport: 'streamableHttp' as const,
	authentication: 'none' as const,
});

describe('resolveCanonicalMcpCatalogs', () => {
	it('uses the catalog of the one registry server the URL matches', async () => {
		const moduleRegistry = registryWith([
			{ remote: 'https://mcp.firecrawl.dev/mcp', tool: 'firecrawl_scrape' },
		]);

		await expect(
			resolveCanonicalMcpCatalogs(
				[server('https://mcp.firecrawl.dev')],
				moduleRegistry,
				mock<Logger>(),
			),
		).resolves.toEqual({ search: [{ name: 'firecrawl_scrape', description: 'firecrawl_scrape' }] });
	});

	it('uses no catalog when an origin hosts several registry servers', async () => {
		const moduleRegistry = registryWith([
			{ remote: 'https://mcp.example.com/firecrawl/mcp', tool: 'firecrawl_scrape' },
			{ remote: 'https://mcp.example.com/brave/mcp', tool: 'brave_web_search' },
		]);

		await expect(
			resolveCanonicalMcpCatalogs(
				[server('https://mcp.example.com')],
				moduleRegistry,
				mock<Logger>(),
			),
		).resolves.toBeUndefined();
	});
});

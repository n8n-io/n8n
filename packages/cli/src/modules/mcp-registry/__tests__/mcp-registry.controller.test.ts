import { mock } from 'vitest-mock-extended';

import type { McpConnectionDiscoveryService } from '../mcp-connection-discovery.service';
import { McpRegistryController } from '../mcp-registry.controller';
import type { McpRegistryService } from '../registry/mcp-registry.service';
import {
	databricksGenieTemplatedMockServer,
	linearMockServer,
	notionMockServer,
} from '../registry/mock-servers';

describe('McpRegistryController', () => {
	const service = mock<McpRegistryService>();
	const discoveryService = mock<McpConnectionDiscoveryService>();
	const controller = new McpRegistryController(service, discoveryService);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('listServers', () => {
		it('returns active servers projected to the public response shape', async () => {
			service.getAll.mockResolvedValue([notionMockServer, linearMockServer]);

			const result = await controller.listServers();

			expect(service.getAll).toHaveBeenCalledWith({ includeDeprecated: false });
			expect(result).toHaveLength(2);

			const notion = result.find((s) => s.slug === 'notion');
			expect(notion).toMatchObject({
				slug: 'notion',
				name: 'com.notion/mcp',
				title: 'Notion',
				credentials: [{ credentialType: 'notionMcpOAuth2Api', name: 'OAuth2', value: 'oAuth2' }],
				isOfficial: true,
				status: 'active',
			});
			// Internal transport URLs must not leak.
			expect(notion).not.toHaveProperty('remotes');
			expect(notion).not.toHaveProperty('origin');
		});

		it('marks a server whose URL is a template', async () => {
			service.getAll.mockResolvedValue([notionMockServer, databricksGenieTemplatedMockServer]);

			const result = await controller.listServers();

			expect(result.map((s) => s.slug)).toEqual(['notion', 'databricks-genie']);
			expect(result.find((server) => server.slug === 'notion')?.isTemplated).toBe(false);
			expect(result.find((server) => server.slug === 'databricks-genie')?.isTemplated).toBe(true);
		});

		it('returns an empty array when the registry has no servers', async () => {
			service.getAll.mockResolvedValue([]);

			const result = await controller.listServers();

			expect(result).toEqual([]);
		});
	});
});

import { mock } from 'vitest-mock-extended';

import { McpRegistryController } from '../mcp-registry.controller';
import type { McpRegistryService } from '../registry/mcp-registry.service';
import {
	databricksGenieTemplatedMockServer,
	linearMockServer,
	notionMockServer,
} from '../registry/mock-servers';

describe('McpRegistryController', () => {
	const service = mock<McpRegistryService>();
	const controller = new McpRegistryController(service);

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

		it('drops a server whose URL is a template', async () => {
			// Instance AI fills its connection picker from here and cannot resolve a
			// template, so offering the row would end at a refused connection.
			service.getAll.mockResolvedValue([notionMockServer, databricksGenieTemplatedMockServer]);

			const result = await controller.listServers();

			expect(result.map((s) => s.slug)).toEqual(['notion']);
		});

		it('returns an empty array when the registry has no servers', async () => {
			service.getAll.mockResolvedValue([]);

			const result = await controller.listServers();

			expect(result).toEqual([]);
		});
	});
});

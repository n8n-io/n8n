import type { McpRegistryDiscoveryResponse } from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
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
	const routes = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		McpRegistryController as never,
	).routes;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['listServers', 'discover'])(
		'%s requires the existing MCP OAuth scope',
		(handlerName) => {
			expect(routes.get(handlerName)?.accessScope).toEqual({
				scope: 'mcp:oauth',
				globalOnly: true,
			});
		},
	);

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

	describe('discover', () => {
		it('validates and delegates a discovery request for the authenticated user', async () => {
			const user = mock<User>();
			const response: McpRegistryDiscoveryResponse = {
				status: 'connected',
				connection: {
					url: 'https://mcp.example.com',
					transport: 'streamableHttp',
					authentication: 'githubMcpOAuth2Api',
					credentialId: 'credential-1',
				},
				tools: [{ name: 'list_repositories', category: 'read' }],
			};
			discoveryService.discover.mockResolvedValue(response);

			await expect(
				controller.discover(
					mock<AuthenticatedRequest>({
						user,
						body: { slug: ' github ', credentialId: ' cred-1 ' },
					}),
				),
			).resolves.toEqual(response);
			expect(discoveryService.discover).toHaveBeenCalledWith(user, {
				slug: 'github',
				credentialId: 'cred-1',
			});
		});

		it.each([
			{},
			{ slug: '', credentialId: 'credential-1' },
			{ slug: 'github', credentialId: '' },
			{ slug: 'github', credentialId: 'credential-1', extra: true },
		])('rejects an invalid discovery request without connecting: %o', async (body) => {
			await expect(
				controller.discover(mock<AuthenticatedRequest>({ body })),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(discoveryService.discover).not.toHaveBeenCalled();
		});
	});
});

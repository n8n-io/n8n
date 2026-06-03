import type { CredentialsEntity, User } from '@n8n/db';
import { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';

import type { InstanceAiMcpRegistryConnection } from '../../entities/instance-ai-mcp-registry-connection.entity';
import { InstanceAiMcpConnectionController } from '../instance-ai-mcp-connection.controller';
import type { InstanceAiMcpRegistryService } from '../instance-ai-mcp-registry.service';

describe('InstanceAiMcpConnectionController', () => {
	const user = { id: 'user-1' } as User;
	const credential = {
		id: 'cred-1',
		name: 'Linear OAuth2',
		type: 'mcpOAuth2Api',
	} as CredentialsEntity;
	const otherCredential = {
		id: 'cred-2',
		name: 'Linear Work OAuth2',
		type: 'mcpOAuth2Api',
	} as CredentialsEntity;

	const baseRow: InstanceAiMcpRegistryConnection = {
		id: 'conn-1',
		userId: user.id,
		serverSlug: 'linear',
		credentialId: 'cred-1',
		toolFilter: null,
		createdAt: new Date('2026-05-01T00:00:00.000Z'),
		updatedAt: new Date('2026-05-01T00:00:00.000Z'),
	} as InstanceAiMcpRegistryConnection;

	const linearServer = {
		slug: 'linear',
		title: 'Linear',
		icons: [
			{ src: 'https://example.com/linear-light.svg', theme: 'light' as const },
			{ src: 'https://example.com/linear-dark.svg', theme: 'dark' as const },
		],
	} as McpRegistryServer;

	function createController() {
		const service = mock<InstanceAiMcpRegistryService>();
		const credentialsFinderService = mock<CredentialsFinderService>();
		const mcpRegistryService = mock<McpRegistryService>();
		const controller = new InstanceAiMcpConnectionController(
			service,
			credentialsFinderService,
			mcpRegistryService,
		);
		return { controller, service, credentialsFinderService, mcpRegistryService };
	}

	function authedRequest(): AuthenticatedRequest {
		return { user } as unknown as AuthenticatedRequest;
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('list', () => {
		it('returns the user’s connections enriched with credential and server metadata', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			service.listConnectionsForUser.mockResolvedValue([
				baseRow,
				{ ...baseRow, id: 'conn-2', credentialId: 'cred-2' } as InstanceAiMcpRegistryConnection,
			]);
			credentialsFinderService.findCredentialForUser.mockImplementation(async (id) => {
				if (id === 'cred-1') return credential;
				if (id === 'cred-2') return otherCredential;
				return null;
			});
			mcpRegistryService.getBySlugs.mockResolvedValue([linearServer]);

			const result = await controller.list(authedRequest());

			expect(mcpRegistryService.getBySlugs).toHaveBeenCalledWith(['linear']);
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				id: 'conn-1',
				serverSlug: 'linear',
				serverTitle: 'Linear',
				serverIcons: linearServer.icons,
				credentialId: 'cred-1',
				credentialName: 'Linear OAuth2',
				credentialType: 'mcpOAuth2Api',
			});
			expect(result[1]).toMatchObject({
				id: 'conn-2',
				credentialId: 'cred-2',
				credentialName: 'Linear Work OAuth2',
				serverTitle: 'Linear',
			});
		});

		it('falls back to slug as title when the registry server is unknown', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			service.listConnectionsForUser.mockResolvedValue([baseRow]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			mcpRegistryService.getBySlugs.mockResolvedValue([]);

			const result = await controller.list(authedRequest());

			expect(result[0]).toMatchObject({ serverTitle: 'linear', serverIcons: [] });
		});

		it('drops rows whose credentials are no longer accessible to the user', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			service.listConnectionsForUser.mockResolvedValue([baseRow]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);
			mcpRegistryService.getBySlugs.mockResolvedValue([linearServer]);

			const result = await controller.list(authedRequest());

			expect(result).toEqual([]);
		});
	});

	describe('create', () => {
		it('creates a connection and returns the enriched response', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			service.createConnection.mockResolvedValue(baseRow);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			mcpRegistryService.get.mockResolvedValue(linearServer);

			const result = await controller.create(authedRequest(), {} as never, {
				serverSlug: 'linear',
				credentialId: 'cred-1',
			});

			expect(service.createConnection).toHaveBeenCalledWith(user, {
				serverSlug: 'linear',
				credentialId: 'cred-1',
			});
			expect(result).toMatchObject({
				id: 'conn-1',
				credentialName: 'Linear OAuth2',
				credentialType: 'mcpOAuth2Api',
				serverTitle: 'Linear',
				serverIcons: linearServer.icons,
			});
		});
	});

	describe('update', () => {
		it('persists the toolFilter and returns the updated connection', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			const updatedRow = { ...baseRow, toolFilter: { mode: 'exclude' as const, tools: ['t1'] } };
			service.updateConnection.mockResolvedValue(updatedRow);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			mcpRegistryService.get.mockResolvedValue(linearServer);

			const result = await controller.update(authedRequest(), {} as never, 'conn-1', {
				toolFilter: { mode: 'exclude', tools: ['t1'] },
			});

			expect(service.updateConnection).toHaveBeenCalledWith(user, 'conn-1', {
				toolFilter: { mode: 'exclude', tools: ['t1'] },
			});
			expect(result).toMatchObject({
				id: 'conn-1',
				toolFilter: { mode: 'exclude', tools: ['t1'] },
			});
		});

		it('propagates NotFoundError from the service', async () => {
			const { controller, service } = createController();
			service.updateConnection.mockRejectedValue(new NotFoundError('not found'));

			await expect(
				controller.update(authedRequest(), {} as never, 'missing', { toolFilter: null }),
			).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe('delete', () => {
		it('delegates to the service', async () => {
			const { controller, service } = createController();
			service.deleteConnection.mockResolvedValue();

			await controller.delete(authedRequest(), {} as never, 'conn-1');

			expect(service.deleteConnection).toHaveBeenCalledWith(user, 'conn-1');
		});
	});

	describe('listTools', () => {
		it('delegates to the service and returns the live tools', async () => {
			const { controller, service } = createController();
			const tools = [
				{ name: 'list-issues', description: 'List Linear issues' },
				{ name: 'create-issue' },
			];
			service.listToolsForConnection.mockResolvedValue(tools);

			const result = await controller.listTools(authedRequest(), {} as never, 'conn-1');

			expect(service.listToolsForConnection).toHaveBeenCalledWith(user, 'conn-1');
			expect(result).toBe(tools);
		});
	});
});

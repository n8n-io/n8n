import type { AuthenticatedRequest, CredentialsEntity, User } from '@n8n/db';
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
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				credential,
				otherCredential,
			]);
			mcpRegistryService.getBySlugs.mockResolvedValue([linearServer]);

			const result = await controller.list(authedRequest());

			expect(credentialsFinderService.findCredentialsForUser).toHaveBeenCalledWith(user, [
				'credential:read',
			]);
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
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([credential]);
			mcpRegistryService.getBySlugs.mockResolvedValue([]);

			const result = await controller.list(authedRequest());

			expect(result[0]).toMatchObject({ serverTitle: 'linear', serverIcons: [] });
		});

		it('drops rows whose credentials are no longer accessible to the user', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			service.listConnectionsForUser.mockResolvedValue([baseRow]);
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
			mcpRegistryService.getBySlugs.mockResolvedValue([linearServer]);

			const result = await controller.list(authedRequest());

			expect(result).toEqual([]);
		});

		it('skips downstream calls when the user has no connections', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			service.listConnectionsForUser.mockResolvedValue([]);

			const result = await controller.list(authedRequest());

			expect(result).toEqual([]);
			expect(credentialsFinderService.findCredentialsForUser).not.toHaveBeenCalled();
			expect(mcpRegistryService.getBySlugs).not.toHaveBeenCalled();
		});
	});

	describe('create', () => {
		it('creates a connection and returns the enriched response from the service bundle', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			service.createConnection.mockResolvedValue({
				connection: baseRow,
				credential,
				server: linearServer,
			});

			const result = await controller.create(authedRequest(), {} as never, {
				serverSlug: 'linear',
				credentialId: 'cred-1',
			});

			expect(service.createConnection).toHaveBeenCalledWith(user, {
				serverSlug: 'linear',
				credentialId: 'cred-1',
			});
			// The controller should rely on the service bundle, not refetch.
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
			expect(mcpRegistryService.get).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				id: 'conn-1',
				credentialName: 'Linear OAuth2',
				credentialType: 'mcpOAuth2Api',
				serverTitle: 'Linear',
				serverIcons: linearServer.icons,
			});
		});
	});

	describe('update (no-op)', () => {
		it('returns the existing connection without persisting the payload', async () => {
			const { controller, service, credentialsFinderService, mcpRegistryService } =
				createController();
			service.listConnectionsForUser.mockResolvedValue([baseRow]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			mcpRegistryService.get.mockResolvedValue(linearServer);

			const result = await controller.update(authedRequest(), {} as never, 'conn-1', {
				inclusionMode: 'except',
				excludedTools: ['t1'],
			});

			expect(result).toMatchObject({ id: 'conn-1', serverSlug: 'linear', serverTitle: 'Linear' });
		});

		it('throws NotFoundError when the connection does not belong to the user', async () => {
			const { controller, service } = createController();
			service.listConnectionsForUser.mockResolvedValue([]);

			await expect(
				controller.update(authedRequest(), {} as never, 'missing', {}),
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
});

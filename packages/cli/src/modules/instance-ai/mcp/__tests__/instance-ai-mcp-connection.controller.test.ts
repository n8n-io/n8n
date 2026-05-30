import type { CredentialsEntity, User } from '@n8n/db';
import { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

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

	function createController() {
		const service = mock<InstanceAiMcpRegistryService>();
		const credentialsFinderService = mock<CredentialsFinderService>();
		const controller = new InstanceAiMcpConnectionController(service, credentialsFinderService);
		return { controller, service, credentialsFinderService };
	}

	function authedRequest(): AuthenticatedRequest {
		return { user } as unknown as AuthenticatedRequest;
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('list', () => {
		it('returns the user’s connections enriched with credential metadata', async () => {
			const { controller, service, credentialsFinderService } = createController();
			service.listConnectionsForUser.mockResolvedValue([
				baseRow,
				{ ...baseRow, id: 'conn-2', credentialId: 'cred-2' } as InstanceAiMcpRegistryConnection,
			]);
			credentialsFinderService.findCredentialForUser.mockImplementation(async (id) => {
				if (id === 'cred-1') return credential;
				if (id === 'cred-2') return otherCredential;
				return null;
			});

			const result = await controller.list(authedRequest());

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				id: 'conn-1',
				serverSlug: 'linear',
				credentialId: 'cred-1',
				credentialName: 'Linear OAuth2',
				credentialType: 'mcpOAuth2Api',
			});
			expect(result[1]).toMatchObject({
				id: 'conn-2',
				credentialId: 'cred-2',
				credentialName: 'Linear Work OAuth2',
			});
		});

		it('drops rows whose credentials are no longer accessible to the user', async () => {
			const { controller, service, credentialsFinderService } = createController();
			service.listConnectionsForUser.mockResolvedValue([baseRow]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			const result = await controller.list(authedRequest());

			expect(result).toEqual([]);
		});
	});

	describe('create', () => {
		it('creates a connection and returns the enriched response', async () => {
			const { controller, service, credentialsFinderService } = createController();
			service.createConnection.mockResolvedValue(baseRow);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);

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
			});
		});
	});

	describe('update (no-op)', () => {
		it('returns the existing connection without persisting the payload', async () => {
			const { controller, service, credentialsFinderService } = createController();
			service.listConnectionsForUser.mockResolvedValue([baseRow]);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);

			const result = await controller.update(authedRequest(), {} as never, 'conn-1', {
				inclusionMode: 'except',
				excludedTools: ['t1'],
			});

			expect(result).toMatchObject({ id: 'conn-1', serverSlug: 'linear' });
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

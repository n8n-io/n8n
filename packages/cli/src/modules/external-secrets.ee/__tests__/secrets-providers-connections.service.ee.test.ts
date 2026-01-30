import type {
	ProjectSecretsProviderAccess,
	SecretsProviderConnection,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';
import { SecretsProvidersConnectionsService } from '@/modules/external-secrets.ee/secrets-providers-connections.service.ee';

describe('Secret Providers Connections Service', () => {
	const mockRepository = mock<SecretsProviderConnectionRepository>();
	const mockExternalSecretsManager = mock<ExternalSecretsManager>();
	const service = new SecretsProvidersConnectionsService(
		mockRepository,
		mock(),
		mock(),
		mockExternalSecretsManager,
	);

	const createdAt = new Date('2024-01-15T10:00:00.000Z');
	const updatedAt = new Date('2024-01-15T10:01:00.000Z');

	function createProjectAccess(
		projectId: string,
		projectName: string,
		connectionId: number,
	): ProjectSecretsProviderAccess {
		return {
			projectId,
			secretsProviderConnectionId: connectionId,
			project: { id: projectId, name: projectName },
			secretsProviderConnection: {},
			createdAt,
			updatedAt,
		} as ProjectSecretsProviderAccess;
	}

	function createConnection(
		overrides: Partial<SecretsProviderConnection> = {},
	): SecretsProviderConnection {
		return {
			id: 123,
			type: 'awsSecretsManager',
			isEnabled: true,
			providerKey: 'my-connection',
			encryptedSettings: 'encrypted-data',
			projectAccess: [],
			createdAt,
			updatedAt,
			...overrides,
		} as SecretsProviderConnection;
	}

	describe('toPublicConnection', () => {
		it('should map the entity to a public connection DTO', () => {
			const connection = createConnection({
				projectAccess: [
					createProjectAccess('tp-1', 'Project One', 123),
					createProjectAccess('tp-2', 'Project Two', 123),
				],
			});

			const actual = service.toPublicConnection(connection);

			expect(actual).toEqual({
				id: '123',
				name: 'my-connection',
				type: 'awsSecretsManager',
				isEnabled: true,
				projects: [
					{ id: 'tp-1', name: 'Project One' },
					{ id: 'tp-2', name: 'Project Two' },
				],
				createdAt: createdAt.toISOString(),
				updatedAt: updatedAt.toISOString(),
			});
		});

		it('should handle connection with no project access', () => {
			const connection = createConnection({
				id: 456,
				type: 'vault',
				isEnabled: false,
				providerKey: 'vault-connection',
				encryptedSettings: 'encrypted-vault-data',
			});

			const actual = service.toPublicConnection(connection);

			expect(actual).toEqual({
				id: '456',
				name: 'vault-connection',
				type: 'vault',
				isEnabled: false,
				projects: [],
				createdAt: createdAt.toISOString(),
				updatedAt: updatedAt.toISOString(),
			});
		});
	});

	describe('getSecretsCompletions', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should return only global secrets when no projectId is provided', async () => {
			const globalConnections = [
				createConnection({ providerKey: 'global-aws', type: 'awsSecretsManager' }),
				createConnection({ providerKey: 'global-vault', type: 'vault' }),
			];

			mockRepository.findGlobalConnections.mockResolvedValue(globalConnections);
			mockExternalSecretsManager.getSecretNames
				.mockReturnValueOnce(['aws-secret-1', 'aws-secret-2'])
				.mockReturnValueOnce(['vault-secret-1']);

			const result = await service.getSecretsCompletions({});

			expect(result).toEqual([
				{
					type: 'awsSecretsManager',
					providerKey: 'global-aws',
					secretCompletions: ['aws-secret-1', 'aws-secret-2'],
					isGlobal: true,
				},
				{
					type: 'vault',
					providerKey: 'global-vault',
					secretCompletions: ['vault-secret-1'],
					isGlobal: true,
				},
			]);
		});

		it('should return only project secrets when projectId is provided without includeGlobal', async () => {
			const projectConnections = [
				createConnection({ providerKey: 'project-aws', type: 'awsSecretsManager' }),
			];

			mockRepository.findByProjectId.mockResolvedValue(projectConnections);
			mockExternalSecretsManager.getSecretNames.mockReturnValue(['project-secret-1']);

			const result = await service.getSecretsCompletions({ projectId: 'project-123' });

			expect(result).toEqual([
				{
					type: 'awsSecretsManager',
					providerKey: 'project-aws',
					secretCompletions: ['project-secret-1'],
					isGlobal: false,
				},
			]);
		});

		it('should return both project and global secrets when projectId and includeGlobal are provided', async () => {
			const projectConnections = [
				createConnection({ providerKey: 'project-vault', type: 'vault' }),
			];
			const globalConnections = [
				createConnection({ providerKey: 'global-aws', type: 'awsSecretsManager' }),
			];

			mockRepository.findByProjectId.mockResolvedValue(projectConnections);
			mockRepository.findGlobalConnections.mockResolvedValue(globalConnections);
			mockExternalSecretsManager.getSecretNames
				.mockReturnValueOnce(['vault-project-secret'])
				.mockReturnValueOnce(['aws-global-secret']);

			const result = await service.getSecretsCompletions({
				projectId: 'project-456',
				includeGlobal: true,
			});

			expect(result).toEqual([
				{
					type: 'vault',
					providerKey: 'project-vault',
					secretCompletions: ['vault-project-secret'],
					isGlobal: false,
				},
				{
					type: 'awsSecretsManager',
					providerKey: 'global-aws',
					secretCompletions: ['aws-global-secret'],
					isGlobal: true,
				},
			]);
		});

		it('should return empty array when no connections exist', async () => {
			mockRepository.findGlobalConnections.mockResolvedValue([]);

			const result = await service.getSecretsCompletions({});

			expect(result).toEqual([]);
		});

		it('should return empty array when no connections exist for project', async () => {
			mockRepository.findByProjectId.mockResolvedValue([]);

			const result = await service.getSecretsCompletions({ projectId: 'project-789' });

			expect(result).toEqual([]);
		});
	});
});

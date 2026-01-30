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

	describe('getGlobalCompletions', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should return completions for global connections', async () => {
			const globalConnections = [
				createConnection({ providerKey: 'global-aws', type: 'awsSecretsManager' }),
				createConnection({ providerKey: 'global-vault', type: 'vault' }),
			];

			mockRepository.findGlobalConnections.mockResolvedValue(globalConnections);
			mockExternalSecretsManager.getSecretNames
				.mockReturnValueOnce(['aws-secret-1', 'aws-secret-2'])
				.mockReturnValueOnce(['vault-secret-1']);

			const result = await service.getGlobalCompletions();

			expect(mockRepository.findGlobalConnections).toHaveBeenCalledTimes(1);
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

		it('should return empty array when no global connections exist', async () => {
			mockRepository.findGlobalConnections.mockResolvedValue([]);

			const result = await service.getGlobalCompletions();

			expect(mockRepository.findGlobalConnections).toHaveBeenCalledTimes(1);
			expect(result).toEqual([]);
		});
	});

	describe('getProjectCompletions', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should return completions for project connections', async () => {
			const projectId = 'project-123';
			const projectConnections = [
				createConnection({ providerKey: 'project-aws', type: 'awsSecretsManager' }),
				createConnection({ providerKey: 'project-vault', type: 'vault' }),
			];

			mockRepository.findByProjectId.mockResolvedValue(projectConnections);
			mockExternalSecretsManager.getSecretNames
				.mockReturnValueOnce(['project-secret-1'])
				.mockReturnValueOnce(['project-secret-2', 'project-secret-3']);

			const result = await service.getProjectCompletions(projectId);

			expect(mockRepository.findByProjectId).toHaveBeenCalledWith(projectId);
			expect(mockRepository.findByProjectId).toHaveBeenCalledTimes(1);
			expect(result).toEqual([
				{
					type: 'awsSecretsManager',
					providerKey: 'project-aws',
					secretCompletions: ['project-secret-1'],
					isGlobal: false,
				},
				{
					type: 'vault',
					providerKey: 'project-vault',
					secretCompletions: ['project-secret-2', 'project-secret-3'],
					isGlobal: false,
				},
			]);
		});

		it('should return empty array when no project connections exist', async () => {
			const projectId = 'project-456';
			mockRepository.findByProjectId.mockResolvedValue([]);

			const result = await service.getProjectCompletions(projectId);

			expect(mockRepository.findByProjectId).toHaveBeenCalledWith(projectId);
			expect(mockRepository.findByProjectId).toHaveBeenCalledTimes(1);
			expect(result).toEqual([]);
		});
	});
});

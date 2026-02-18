import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { mockLogger } from '@n8n/backend-test-utils';
import type {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnection,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';
import type { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';
import type { RedactionService } from '@/modules/external-secrets.ee/redaction.service.ee';
import { SecretsProvidersConnectionsService } from '@/modules/external-secrets.ee/secrets-providers-connections.service.ee';
import type { SecretsProvider } from '@/modules/external-secrets.ee/types';

describe('SecretsProvidersConnectionsService', () => {
	const mockRepository = mock<SecretsProviderConnectionRepository>();
	const mockProjectAccessRepository = mock<ProjectSecretsProviderAccessRepository>();
	const mockExternalSecretsManager = mock<ExternalSecretsManager>();
	const mockRedactionService = mock<RedactionService>();
	const mockEventService = mock<EventService>();
	const mockCipher = {
		encrypt: jest.fn((data: IDataObject) => JSON.stringify(data)),
		decrypt: jest.fn((data: string) => data),
	};

	const service = new SecretsProvidersConnectionsService(
		mockLogger(),
		mockRepository,
		mockProjectAccessRepository,
		mockCipher as any,
		mockExternalSecretsManager,
		mockRedactionService,
		mockEventService,
	);

	beforeEach(() => {
		jest.clearAllMocks();
		mockCipher.decrypt.mockImplementation((data: string) => data);
	});

	describe('toPublicConnection', () => {
		it('should map entity to DTO with projects, redacted settings, secretsCount, and secrets', () => {
			const decryptedSettings = { apiKey: 'secret123', region: 'us-east-1' };
			const redactedSettings = { apiKey: CREDENTIAL_BLANKING_VALUE, region: 'us-east-1' };
			const mockProperties: INodeProperties[] = [
				{
					name: 'apiKey',
					type: 'string',
					displayName: 'API Key',
					default: '',
					typeOptions: { password: true },
				},
			];
			const mockProvider = {
				state: 'connected' as const,
				properties: mockProperties,
			} as SecretsProvider;

			const connection = {
				id: 1,
				providerKey: 'my-aws',
				type: 'awsSecretsManager',
				encryptedSettings: JSON.stringify(decryptedSettings),
				projectAccess: [
					{ project: { id: 'p1', name: 'Project 1' } },
					{ project: { id: 'p2', name: 'Project 2' } },
				],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			mockExternalSecretsManager.getProviderProperties.mockReturnValue(mockProperties);
			mockExternalSecretsManager.getProvider.mockReturnValue(mockProvider);
			mockExternalSecretsManager.getSecretNames.mockReturnValue(['secret-a', 'secret-b']);
			mockRedactionService.redact.mockReturnValue(redactedSettings);

			expect(service.toPublicConnection(connection)).toEqual({
				id: '1',
				name: 'my-aws',
				type: 'awsSecretsManager',
				secretsCount: 2,
				state: 'connected',
				secrets: [{ name: 'secret-a' }, { name: 'secret-b' }],
				projects: [
					{ id: 'p1', name: 'Project 1' },
					{ id: 'p2', name: 'Project 2' },
				],
				settings: redactedSettings,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			expect(mockExternalSecretsManager.getProviderProperties).toHaveBeenCalledWith(
				'awsSecretsManager',
			);
			expect(mockExternalSecretsManager.getProvider).toHaveBeenCalledWith('my-aws');
			expect(mockExternalSecretsManager.getSecretNames).toHaveBeenCalledWith('my-aws');
			expect(mockRedactionService.redact).toHaveBeenCalledWith(decryptedSettings, mockProperties);
		});

		it('should map entity to DTO without projects and with empty secrets', () => {
			const decryptedSettings = { token: 'secret-token' };
			const redactedSettings = { token: CREDENTIAL_BLANKING_VALUE };
			const mockProperties: INodeProperties[] = [
				{
					name: 'token',
					type: 'string',
					displayName: 'Token',
					default: '',
					typeOptions: { password: true },
				},
			];
			const mockProvider = {
				state: 'connected' as const,
				properties: mockProperties,
			} as SecretsProvider;

			const connection = {
				id: 2,
				providerKey: 'my-vault',
				type: 'vault',
				encryptedSettings: JSON.stringify(decryptedSettings),
				projectAccess: [],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			mockExternalSecretsManager.getProviderProperties.mockReturnValue(mockProperties);
			mockExternalSecretsManager.getProvider.mockReturnValue(mockProvider);
			mockExternalSecretsManager.getSecretNames.mockReturnValue([]);
			mockRedactionService.redact.mockReturnValue(redactedSettings);

			expect(service.toPublicConnection(connection)).toEqual({
				id: '2',
				name: 'my-vault',
				type: 'vault',
				secretsCount: 0,
				state: 'connected',
				secrets: [],
				projects: [],
				settings: redactedSettings,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			expect(mockExternalSecretsManager.getProviderProperties).toHaveBeenCalledWith('vault');
			expect(mockExternalSecretsManager.getProvider).toHaveBeenCalledWith('my-vault');
		});

		it('should use state "initializing" when provider instance is not in registry', () => {
			const mockProperties: INodeProperties[] = [
				{ name: 'token', type: 'string', displayName: 'Token', default: '' },
			];
			const redactedSettings = { token: CREDENTIAL_BLANKING_VALUE };

			mockExternalSecretsManager.getProviderProperties.mockReturnValue(mockProperties);
			mockExternalSecretsManager.getProvider.mockReturnValue(undefined);
			mockExternalSecretsManager.getSecretNames.mockReturnValue([]);
			mockRedactionService.redact.mockReturnValue(redactedSettings);

			const connection = {
				id: 3,
				providerKey: 'not-synced-yet',
				type: 'vault',
				encryptedSettings: '{}',
				projectAccess: [],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			const result = service.toPublicConnection(connection);

			expect(result.state).toBe('initializing');
			expect(mockExternalSecretsManager.getProvider).toHaveBeenCalledWith('not-synced-yet');
		});

		it('should pass through state "error" from provider instance', () => {
			const mockProperties: INodeProperties[] = [
				{ name: 'key', type: 'string', displayName: 'Key', default: '' },
			];
			const redactedSettings = { key: CREDENTIAL_BLANKING_VALUE };
			const mockProvider = {
				state: 'error' as const,
				properties: mockProperties,
			} as SecretsProvider;

			mockExternalSecretsManager.getProviderProperties.mockReturnValue(mockProperties);
			mockExternalSecretsManager.getProvider.mockReturnValue(mockProvider);
			mockExternalSecretsManager.getSecretNames.mockReturnValue([]);
			mockRedactionService.redact.mockReturnValue(redactedSettings);

			const connection = {
				id: 4,
				providerKey: 'failing-vault',
				type: 'vault',
				encryptedSettings: '{}',
				projectAccess: [],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			const result = service.toPublicConnection(connection);

			expect(result.state).toBe('error');
		});
	});

	describe('toPublicConnectionListItem', () => {
		it('should map entity to lightweight DTO with secretsCount, state, but without settings or secrets', () => {
			const mockProviderInstance = { state: 'connected' as const } as SecretsProvider;
			mockExternalSecretsManager.getProvider.mockReturnValue(mockProviderInstance);
			mockExternalSecretsManager.getSecretNames.mockReturnValue(['secret-a', 'secret-b']);

			const connection = {
				id: 1,
				providerKey: 'my-aws',
				type: 'awsSecretsManager',
				encryptedSettings: '{"apiKey":"secret"}',
				projectAccess: [
					{ project: { id: 'p1', name: 'Project 1' } },
					{ project: { id: 'p2', name: 'Project 2' } },
				],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			const result = service.toPublicConnectionListItem(connection);

			expect(result).toEqual({
				id: '1',
				name: 'my-aws',
				type: 'awsSecretsManager',
				secretsCount: 2,
				state: 'connected',
				projects: [
					{ id: 'p1', name: 'Project 1' },
					{ id: 'p2', name: 'Project 2' },
				],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			// Verify settings and secrets are NOT included in list response
			expect(result).not.toHaveProperty('settings');
			expect(result).not.toHaveProperty('secrets');

			expect(mockExternalSecretsManager.getProvider).toHaveBeenCalledWith('my-aws');
			expect(mockExternalSecretsManager.getSecretNames).toHaveBeenCalledWith('my-aws');
			// No decryption/redaction for list response
			expect(mockExternalSecretsManager.getProviderWithSettings).not.toHaveBeenCalled();
			expect(mockRedactionService.redact).not.toHaveBeenCalled();
		});

		it('should use state "initializing" when provider instance is not in registry', () => {
			mockExternalSecretsManager.getProvider.mockReturnValue(undefined);
			mockExternalSecretsManager.getSecretNames.mockReturnValue([]);

			const connection = {
				id: 2,
				providerKey: 'not-synced-yet',
				type: 'vault',
				encryptedSettings: '{}',
				projectAccess: [],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			const result = service.toPublicConnectionListItem(connection);

			expect(result.state).toBe('initializing');
			expect(mockExternalSecretsManager.getProvider).toHaveBeenCalledWith('not-synced-yet');
		});

		it('should pass through state "error" from provider instance', () => {
			const mockProviderInstance = { state: 'error' as const } as SecretsProvider;
			mockExternalSecretsManager.getProvider.mockReturnValue(mockProviderInstance);
			mockExternalSecretsManager.getSecretNames.mockReturnValue([]);

			const connection = {
				id: 3,
				providerKey: 'failing-connection',
				type: 'awsSecretsManager',
				encryptedSettings: '{}',
				projectAccess: [],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			const result = service.toPublicConnectionListItem(connection);

			expect(result.state).toBe('error');
			expect(mockExternalSecretsManager.getProvider).toHaveBeenCalledWith('failing-connection');
		});
	});

	describe('toSecretCompletionsResponse', () => {
		it('should map connections to completions keyed by providerKey', () => {
			mockExternalSecretsManager.getSecretNames.mockImplementation((providerKey) => {
				if (providerKey === 'aws') return ['secret-a', 'secret-b'];
				if (providerKey === 'vault') return ['secret-c'];
				return [];
			});

			const connections = [
				{ providerKey: 'aws' },
				{ providerKey: 'vault' },
				{ providerKey: 'missing_from_cache' },
			] as unknown as SecretsProviderConnection[];

			expect(service.toSecretCompletionsResponse(connections)).toEqual({
				aws: ['secret-a', 'secret-b'],
				vault: ['secret-c'],
				missing_from_cache: [],
			});
		});

		it('should return empty object for empty connections', () => {
			expect(service.toSecretCompletionsResponse([])).toEqual({});
		});
	});

	describe('CRUD operations reload providers', () => {
		const savedConnection = {
			id: 1,
			providerKey: 'my-aws',
			type: 'awsSecretsManager',
			encryptedSettings: '{"apiKey":"secret"}',
			isEnabled: true,
			projectAccess: [],
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-02'),
		} as unknown as SecretsProviderConnection;

		it('should sync provider connection after createConnection', async () => {
			mockRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(savedConnection);
			mockRepository.create.mockReturnValue(savedConnection);
			mockRepository.save.mockResolvedValue(savedConnection);

			await service.createConnection(
				{
					providerKey: 'my-aws',
					type: 'awsSecretsManager',
					settings: { apiKey: 'secret' },
					projectIds: [],
				},
				'user-123',
			);

			expect(mockExternalSecretsManager.syncProviderConnection).toHaveBeenCalledWith('my-aws');
		});

		it('should sync provider connection after updateConnection', async () => {
			mockRepository.findOne
				.mockResolvedValueOnce(savedConnection)
				.mockResolvedValueOnce(savedConnection);

			await service.updateConnection('my-aws', { projectIds: ['p1'] }, 'user-123');

			expect(mockExternalSecretsManager.syncProviderConnection).toHaveBeenCalledWith('my-aws');
		});

		it('should sync provider connection after deleteConnection', async () => {
			mockRepository.findOne.mockResolvedValueOnce(savedConnection);
			mockRepository.remove.mockResolvedValue(savedConnection);

			await service.deleteConnection('my-aws', 'user-123');

			expect(mockExternalSecretsManager.syncProviderConnection).toHaveBeenCalledWith('my-aws');
		});
	});

	describe('event emissions', () => {
		const connectionWithProjects = {
			id: 1,
			providerKey: 'my-aws',
			type: 'awsSecretsManager',
			encryptedSettings: '{"apiKey":"secret"}',
			isEnabled: true,
			projectAccess: [
				{ project: { id: 'p1', name: 'Project 1' } },
				{ project: { id: 'p2', name: 'Project 2' } },
			],
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-02'),
		} as unknown as SecretsProviderConnection;

		const expectedProjects = [
			{ id: 'p1', name: 'Project 1' },
			{ id: 'p2', name: 'Project 2' },
		];

		it('should emit external-secrets-connection-created after creating a connection', async () => {
			mockRepository.findOne
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(connectionWithProjects);
			mockRepository.create.mockReturnValue(connectionWithProjects);
			mockRepository.save.mockResolvedValue(connectionWithProjects);

			await service.createConnection(
				{
					providerKey: 'my-aws',
					type: 'awsSecretsManager',
					settings: { apiKey: 'secret' },
					projectIds: ['p1', 'p2'],
				},
				'user-123',
			);

			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-created', {
				userId: 'user-123',
				providerKey: 'my-aws',
				vaultType: 'awsSecretsManager',
				projects: expectedProjects,
			});
		});

		it('should emit external-secrets-connection-updated after updating a connection', async () => {
			mockRepository.findOne
				.mockResolvedValueOnce(connectionWithProjects)
				.mockResolvedValueOnce(connectionWithProjects);

			await service.updateConnection('my-aws', { projectIds: ['p1'] }, 'user-123');

			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-updated', {
				userId: 'user-123',
				providerKey: 'my-aws',
				vaultType: 'awsSecretsManager',
				projects: expectedProjects,
			});
		});

		it('should emit external-secrets-connection-deleted after deleting a connection', async () => {
			mockRepository.findOne.mockResolvedValueOnce(connectionWithProjects);
			mockRepository.remove.mockResolvedValue(connectionWithProjects);

			await service.deleteConnection('my-aws', 'user-123');

			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-deleted', {
				userId: 'user-123',
				providerKey: 'my-aws',
				vaultType: 'awsSecretsManager',
				projects: expectedProjects,
			});
		});

		it('should emit external-secrets-connection-tested with isValid after testing a connection', async () => {
			mockRepository.findOne.mockResolvedValueOnce(connectionWithProjects);
			mockExternalSecretsManager.testProviderSettings.mockResolvedValue({
				success: true,
				testState: 'connected',
			});

			await service.testConnection('my-aws', 'user-123');

			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-tested', {
				userId: 'user-123',
				providerKey: 'my-aws',
				vaultType: 'awsSecretsManager',
				projects: expectedProjects,
				isValid: true,
			});
		});

		it('should emit external-secrets-connection-tested with errorMessage on failure', async () => {
			mockRepository.findOne.mockResolvedValueOnce(connectionWithProjects);
			mockExternalSecretsManager.testProviderSettings.mockResolvedValue({
				success: false,
				testState: 'error',
				error: 'Invalid credentials',
			});

			await service.testConnection('my-aws', 'user-123');

			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-tested', {
				userId: 'user-123',
				providerKey: 'my-aws',
				vaultType: 'awsSecretsManager',
				projects: expectedProjects,
				isValid: false,
				errorMessage: 'Invalid credentials',
			});
		});

		it('should emit external-secrets-connection-reloaded after reloading secrets', async () => {
			mockRepository.findOne.mockResolvedValueOnce(connectionWithProjects);

			await service.reloadConnectionSecrets('my-aws', 'user-123');

			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-reloaded', {
				userId: 'user-123',
				providerKey: 'my-aws',
				vaultType: 'awsSecretsManager',
				projects: expectedProjects,
			});
		});
	});

	describe('reloadProjectConnectionSecrets', () => {
		it('should reload all connections for a project and emit events', async () => {
			const connections = [
				{
					providerKey: 'conn-1',
					type: 'awsSecretsManager',
					projectAccess: [{ project: { id: 'p1', name: 'Project 1' } }],
				},
				{
					providerKey: 'conn-2',
					type: 'vault',
					projectAccess: [{ project: { id: 'p1', name: 'Project 1' } }],
				},
				{
					providerKey: 'conn-3',
					type: 'gcpSecretsManager',
					projectAccess: [],
				},
			] as unknown as SecretsProviderConnection[];

			mockRepository.findByProjectId.mockResolvedValue(connections);
			mockExternalSecretsManager.updateProvider.mockResolvedValue(undefined);

			const result = await service.reloadProjectConnectionSecrets('project-1', 'user-123');

			expect(result).toEqual({
				success: true,
				providers: {
					'conn-1': { success: true },
					'conn-2': { success: true },
					'conn-3': { success: true },
				},
			});
			expect(mockRepository.findByProjectId).toHaveBeenCalledWith('project-1');
			expect(mockExternalSecretsManager.updateProvider).toHaveBeenCalledTimes(3);
			expect(mockExternalSecretsManager.updateProvider).toHaveBeenCalledWith('conn-1');
			expect(mockExternalSecretsManager.updateProvider).toHaveBeenCalledWith('conn-2');
			expect(mockExternalSecretsManager.updateProvider).toHaveBeenCalledWith('conn-3');

			expect(mockEventService.emit).toHaveBeenCalledTimes(3);
			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-reloaded', {
				userId: 'user-123',
				providerKey: 'conn-1',
				vaultType: 'awsSecretsManager',
				projects: [{ id: 'p1', name: 'Project 1' }],
			});
			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-reloaded', {
				userId: 'user-123',
				providerKey: 'conn-2',
				vaultType: 'vault',
				projects: [{ id: 'p1', name: 'Project 1' }],
			});
			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-reloaded', {
				userId: 'user-123',
				providerKey: 'conn-3',
				vaultType: 'gcpSecretsManager',
				projects: [],
			});
		});

		it('should return success when project has no connections', async () => {
			mockRepository.findByProjectId.mockResolvedValue([]);

			const result = await service.reloadProjectConnectionSecrets('empty-project', 'user-123');

			expect(result).toEqual({ success: true, providers: {} });
			expect(mockExternalSecretsManager.updateProvider).not.toHaveBeenCalled();
			expect(mockEventService.emit).not.toHaveBeenCalled();
		});

		it('should still attempt all providers when one fails and log warning', async () => {
			const connections = [
				{
					providerKey: 'ok-conn',
					type: 'awsSecretsManager',
					projectAccess: [{ project: { id: 'p1', name: 'Project 1' } }],
				},
				{
					providerKey: 'failing-conn',
					type: 'vault',
					projectAccess: [],
				},
			] as unknown as SecretsProviderConnection[];

			mockRepository.findByProjectId.mockResolvedValue(connections);
			mockExternalSecretsManager.updateProvider
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('Provider not connected'));

			const result = await service.reloadProjectConnectionSecrets('project-1', 'user-123');

			expect(result).toEqual({
				success: false,
				providers: {
					'ok-conn': { success: true },
					'failing-conn': { success: false },
				},
			});
			expect(mockExternalSecretsManager.updateProvider).toHaveBeenCalledTimes(2);
			expect(mockExternalSecretsManager.updateProvider).toHaveBeenCalledWith('ok-conn');
			expect(mockExternalSecretsManager.updateProvider).toHaveBeenCalledWith('failing-conn');

			// Only the successful provider should emit a reload event
			expect(mockEventService.emit).toHaveBeenCalledTimes(1);
			expect(mockEventService.emit).toHaveBeenCalledWith('external-secrets-connection-reloaded', {
				userId: 'user-123',
				providerKey: 'ok-conn',
				vaultType: 'awsSecretsManager',
				projects: [{ id: 'p1', name: 'Project 1' }],
			});
		});
	});

	describe('getConnectionForProject', () => {
		it('should return connection when found by providerKey and projectId', async () => {
			const connection = {
				id: 1,
				providerKey: 'my-aws',
			} as unknown as SecretsProviderConnection;

			mockRepository.findByProviderKeyAndProjectId.mockResolvedValue(connection);

			const result = await service.getConnectionForProject('my-aws', 'project-1');
			expect(result).toBe(connection);
			expect(mockRepository.findByProviderKeyAndProjectId).toHaveBeenCalledWith(
				'my-aws',
				'project-1',
			);
		});

		it('should throw NotFoundError when connection does not exist', async () => {
			mockRepository.findByProviderKeyAndProjectId.mockResolvedValue(null);

			await expect(service.getConnectionForProject('missing', 'project-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(mockRepository.findByProviderKeyAndProjectId).toHaveBeenCalledWith(
				'missing',
				'project-1',
			);
		});

		it('should throw NotFoundError when connection does not belong to the project', async () => {
			mockRepository.findByProviderKeyAndProjectId.mockResolvedValue(null);

			await expect(service.getConnectionForProject('my-aws', 'project-1')).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('deleteConnectionForProject', () => {
		const deletedConnection = {
			id: 1,
			providerKey: 'my-aws',
			type: 'awsSecretsManager',
			encryptedSettings: '{"apiKey":"secret"}',
			projectAccess: [],
		} as unknown as SecretsProviderConnection;

		it('should delete connection and sync provider when found', async () => {
			mockRepository.removeByProviderKeyAndProjectId.mockResolvedValue(deletedConnection);

			const result = await service.deleteConnectionForProject('my-aws', 'project-1');

			expect(result).toBe(deletedConnection);
			expect(mockRepository.removeByProviderKeyAndProjectId).toHaveBeenCalledWith(
				'my-aws',
				'project-1',
			);
			expect(mockProjectAccessRepository.deleteByConnectionId).toHaveBeenCalledWith(1);
			expect(mockExternalSecretsManager.syncProviderConnection).toHaveBeenCalledWith('my-aws');
		});

		it('should throw NotFoundError when connection does not exist', async () => {
			mockRepository.removeByProviderKeyAndProjectId.mockResolvedValue(null);

			await expect(service.deleteConnectionForProject('missing', 'project-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(mockProjectAccessRepository.deleteByConnectionId).not.toHaveBeenCalled();
			expect(mockExternalSecretsManager.syncProviderConnection).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError when connection does not belong to the project', async () => {
			mockRepository.removeByProviderKeyAndProjectId.mockResolvedValue(null);

			await expect(service.deleteConnectionForProject('my-aws', 'other-project')).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('CRUD operations reload providers', () => {
		const savedConnection = {
			id: 1,
			providerKey: 'my-aws',
			type: 'awsSecretsManager',
			encryptedSettings: '{"apiKey":"secret"}',
			isEnabled: true,
			projectAccess: [],
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-02'),
		} as unknown as SecretsProviderConnection;

		it('should sync provider connection after createConnection', async () => {
			mockRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(savedConnection);
			mockRepository.create.mockReturnValue(savedConnection);
			mockRepository.save.mockResolvedValue(savedConnection);

			await service.createConnection(
				{
					providerKey: 'my-aws',
					type: 'awsSecretsManager',
					settings: { apiKey: 'secret' },
					projectIds: [],
				},
				'test-user',
			);

			expect(mockExternalSecretsManager.syncProviderConnection).toHaveBeenCalledWith('my-aws');
		});

		it('should sync provider connection after updateConnection', async () => {
			mockRepository.findOne
				.mockResolvedValueOnce(savedConnection)
				.mockResolvedValueOnce(savedConnection);

			await service.updateConnection('my-aws', { projectIds: ['p1'] }, 'test-user');

			expect(mockExternalSecretsManager.syncProviderConnection).toHaveBeenCalledWith('my-aws');
		});

		it('should sync provider connection after deleteConnection', async () => {
			mockRepository.findOne.mockResolvedValueOnce(savedConnection);
			mockRepository.remove.mockResolvedValue(savedConnection);

			await service.deleteConnection('my-aws', 'test-user');

			expect(mockExternalSecretsManager.syncProviderConnection).toHaveBeenCalledWith('my-aws');
		});
	});
});

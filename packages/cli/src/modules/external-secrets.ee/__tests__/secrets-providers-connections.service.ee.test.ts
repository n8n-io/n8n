import type { IDataObject } from 'n8n-workflow';
import type {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnection,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
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
		it('should map entity to DTO with projects and redacted settings', () => {
			const decryptedSettings = { apiKey: 'secret123', region: 'us-east-1' };
			const redactedSettings = { apiKey: CREDENTIAL_BLANKING_VALUE, region: 'us-east-1' };
			const mockProvider = {
				properties: [
					{
						name: 'apiKey',
						type: 'string',
						displayName: 'API Key',
						default: '',
						typeOptions: { password: true },
					},
				],
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

			mockExternalSecretsManager.getProviderWithSettings.mockReturnValue({
				provider: mockProvider,
				settings: {} as any,
			});
			mockRedactionService.redact.mockReturnValue(redactedSettings);

			expect(service.toPublicConnection(connection)).toEqual({
				id: '1',
				name: 'my-aws',
				type: 'awsSecretsManager',
				projects: [
					{ id: 'p1', name: 'Project 1' },
					{ id: 'p2', name: 'Project 2' },
				],
				settings: redactedSettings,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			expect(mockExternalSecretsManager.getProviderWithSettings).toHaveBeenCalledWith(
				'awsSecretsManager',
			);
			expect(mockRedactionService.redact).toHaveBeenCalledWith(
				decryptedSettings,
				mockProvider.properties,
			);
		});

		it('should map entity to DTO without projects', () => {
			const decryptedSettings = { token: 'secret-token' };
			const redactedSettings = { token: CREDENTIAL_BLANKING_VALUE };
			const mockProvider = {
				properties: [
					{
						name: 'token',
						type: 'string',
						displayName: 'Token',
						default: '',
						typeOptions: { password: true },
					},
				],
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

			mockExternalSecretsManager.getProviderWithSettings.mockReturnValue({
				provider: mockProvider,
				settings: {} as any,
			});
			mockRedactionService.redact.mockReturnValue(redactedSettings);

			expect(service.toPublicConnection(connection)).toEqual({
				id: '2',
				name: 'my-vault',
				type: 'vault',
				projects: [],
				settings: redactedSettings,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});
		});
	});

	describe('toPublicConnectionListItem', () => {
		it('should map entity to lightweight DTO without settings', () => {
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
				projects: [
					{ id: 'p1', name: 'Project 1' },
					{ id: 'p2', name: 'Project 2' },
				],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			// Verify settings are NOT included in list response
			expect(result).not.toHaveProperty('settings');

			// Verify no external services were called (no decryption/redaction needed)
			expect(mockExternalSecretsManager.getProviderWithSettings).not.toHaveBeenCalled();
			expect(mockRedactionService.redact).not.toHaveBeenCalled();
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
});

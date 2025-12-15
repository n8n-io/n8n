import type { Logger } from '@n8n/backend-common';
import type { ICredentialResolver } from '@n8n/decorators';
import type { Cipher } from 'n8n-core';
import type {
	ICredentialContext,
	ICredentialDataDecryptedObject,
	IWorkflowSettings,
} from 'n8n-workflow';

import type { CredentialStoreMetadata } from '@/credentials/dynamic-credential-storage.interface';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import type { DynamicCredentialResolver } from '../../database/entities/credential-resolver';
import type { DynamicCredentialResolverRepository } from '../../database/repositories/credential-resolver.repository';
import { CredentialStorageError } from '../../errors/credential-storage.error';
import type { DynamicCredentialResolverRegistry } from '../credential-resolver-registry.service';
import { DynamicCredentialStorageService } from '../dynamic-credential-storage.service';

describe('DynamicCredentialStorageService', () => {
	let service: DynamicCredentialStorageService;
	let mockResolverRegistry: jest.Mocked<DynamicCredentialResolverRegistry>;
	let mockResolverRepository: jest.Mocked<DynamicCredentialResolverRepository>;
	let mockLoadNodesAndCredentials: jest.Mocked<LoadNodesAndCredentials>;
	let mockCipher: jest.Mocked<Cipher>;
	let mockLogger: jest.Mocked<Logger>;

	const createMockCredentialMetadata = (
		overrides: Partial<CredentialStoreMetadata> = {},
	): CredentialStoreMetadata => ({
		id: 'cred-123',
		name: 'Test Credential',
		type: 'oAuth2Api',
		isResolvable: true,
		resolverId: 'resolver-456',
		...overrides,
	});

	const createMockResolverEntity = (
		overrides: Partial<DynamicCredentialResolver> = {},
	): DynamicCredentialResolver =>
		({
			id: 'resolver-456',
			name: 'test-resolver',
			type: 'stub-resolver-1.0',
			config: 'encrypted-config',
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		}) as DynamicCredentialResolver;

	const createMockResolver = (): jest.Mocked<ICredentialResolver> => ({
		metadata: {
			name: 'stub-resolver-1.0',
			description: 'Test resolver',
		},
		getSecret: jest.fn(),
		setSecret: jest.fn(),
		validateOptions: jest.fn(),
	});

	const createMockCredentialContext = (): ICredentialContext => ({
		version: 1,
		identity: 'user-123',
		metadata: {},
	});

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		mockResolverRegistry = {
			getResolverByName: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRegistry>;

		mockResolverRepository = {
			findOneBy: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRepository>;

		mockLoadNodesAndCredentials = {
			getCredential: jest.fn(),
		} as unknown as jest.Mocked<LoadNodesAndCredentials>;

		mockLoadNodesAndCredentials.getCredential.mockReturnValue({
			type: {
				displayName: 'OAuth2 API',
				name: 'oAuth2Api',
				extends: [],
				properties: [],
			},
			sourcePath: '',
		});

		mockCipher = {
			decrypt: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;

		service = new DynamicCredentialStorageService(
			mockResolverRegistry,
			mockResolverRepository,
			mockLoadNodesAndCredentials,
			mockCipher,
			mockLogger,
		);
	});

	describe('storeIfNeeded', () => {
		const dynamicData: ICredentialDataDecryptedObject = {
			accessToken: 'new-token',
			refreshToken: 'new-refresh',
		};
		const staticData: ICredentialDataDecryptedObject = {
			clientId: 'client-123',
			clientSecret: 'secret-456',
		};
		const credentialContext = createMockCredentialContext();

		describe('should return early without storing when', () => {
			it('credential is not resolvable', async () => {
				const metadata = createMockCredentialMetadata({ isResolvable: false });

				await service.storeIfNeeded(metadata, dynamicData, credentialContext);

				expect(mockResolverRepository.findOneBy).not.toHaveBeenCalled();
			});

			it('credential has no resolver ID and no workflow fallback', async () => {
				const metadata = createMockCredentialMetadata({ resolverId: undefined });

				await expect(
					service.storeIfNeeded(metadata, dynamicData, credentialContext),
				).rejects.toThrow(CredentialStorageError);
				await expect(
					service.storeIfNeeded(metadata, dynamicData, credentialContext),
				).rejects.toThrow('Failed to store dynamic credentials data');
			});
		});

		describe('should throw CredentialStorageError when', () => {
			it('resolver entity is not found', async () => {
				const metadata = createMockCredentialMetadata();
				mockResolverRepository.findOneBy.mockResolvedValue(null);

				await expect(
					service.storeIfNeeded(metadata, dynamicData, credentialContext),
				).rejects.toThrow(CredentialStorageError);
				await expect(
					service.storeIfNeeded(metadata, dynamicData, credentialContext),
				).rejects.toThrow('Failed to store dynamic credentials data');
			});

			it('resolver instance is not found in registry', async () => {
				const metadata = createMockCredentialMetadata();
				const resolverEntity = createMockResolverEntity();

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByName.mockReturnValue(undefined);

				await expect(
					service.storeIfNeeded(metadata, dynamicData, credentialContext),
				).rejects.toThrow(CredentialStorageError);
			});

			it('resolver.setSecret fails', async () => {
				const metadata = createMockCredentialMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver();

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByName.mockReturnValue(mockResolver);
				mockCipher.decrypt.mockReturnValue(JSON.stringify({ prefix: 'test' }));
				mockResolver.setSecret.mockRejectedValue(new Error('Storage failed'));

				await expect(
					service.storeIfNeeded(metadata, dynamicData, credentialContext),
				).rejects.toThrow(CredentialStorageError);
				await expect(
					service.storeIfNeeded(metadata, dynamicData, credentialContext),
				).rejects.toThrow('Failed to store dynamic credentials data');
			});
		});

		describe('should successfully store when', () => {
			it('all conditions are met', async () => {
				const metadata = createMockCredentialMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver();

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByName.mockReturnValue(mockResolver);
				mockCipher.decrypt.mockReturnValue(JSON.stringify({ prefix: 'test' }));

				await service.storeIfNeeded(metadata, dynamicData, credentialContext, staticData);

				expect(mockResolver.setSecret).toHaveBeenCalledWith(
					'cred-123',
					credentialContext,
					expect.objectContaining({
						accessToken: 'new-token',
						refreshToken: 'new-refresh',
					}),
					expect.objectContaining({
						configuration: { prefix: 'test' },
						resolverName: 'test-resolver',
						resolverId: 'resolver-456',
					}),
				);

				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Successfully stored dynamic credentials',
					expect.objectContaining({
						credentialId: 'cred-123',
						resolverId: 'resolver-456',
						identity: 'user-123',
					}),
				);
			});

			it('shared fields are removed from stored data', async () => {
				const metadata = createMockCredentialMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver();

				mockLoadNodesAndCredentials.getCredential.mockReturnValue({
					type: {
						displayName: 'OAuth2 API',
						name: 'oAuth2Api',
						properties: [
							{
								default: '',
								displayName: 'Client ID',
								name: 'clientId',
								type: 'string',
							},
							{
								default: '',
								displayName: 'Client Secret',
								name: 'clientSecret',
								type: 'string',
							},
							{
								default: '',
								displayName: 'Scopes',
								name: 'scopes',
								type: 'string',
							},
							{
								default: '',
								displayName: 'AccessToken',
								name: 'accessToken',
								type: 'string',
								resolvableField: true,
							},
						],
					},
					sourcePath: '',
				});

				const dataWithSharedFields: ICredentialDataDecryptedObject = {
					clientId: 'should-be-removed',
					clientSecret: 'should-be-removed',
					scopes: 'should-be-removed',
					accessToken: 'keep-this',
					refreshToken: 'keep-this',
				};

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByName.mockReturnValue(mockResolver);
				mockCipher.decrypt.mockReturnValue(JSON.stringify({}));

				await service.storeIfNeeded(metadata, dataWithSharedFields, credentialContext);

				const storedData = mockResolver.setSecret.mock.calls[0][2];
				expect(storedData).not.toHaveProperty('clientId');
				expect(storedData).not.toHaveProperty('clientSecret');
				expect(storedData).not.toHaveProperty('scopes');
				expect(storedData).toHaveProperty('accessToken', 'keep-this');
				expect(storedData).toHaveProperty('refreshToken', 'keep-this');
			});

			it('uses workflow resolver when credential has no resolver', async () => {
				const metadata = createMockCredentialMetadata({ resolverId: undefined });
				const workflowSettings: IWorkflowSettings = {
					credentialResolverId: 'workflow-resolver-789',
				};
				const resolverEntity = createMockResolverEntity({ id: 'workflow-resolver-789' });
				const mockResolver = createMockResolver();

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByName.mockReturnValue(mockResolver);
				mockCipher.decrypt.mockReturnValue(JSON.stringify({}));

				await service.storeIfNeeded(
					metadata,
					dynamicData,
					credentialContext,
					undefined,
					workflowSettings,
				);

				expect(mockResolverRepository.findOneBy).toHaveBeenCalledWith({
					id: 'workflow-resolver-789',
				});
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Successfully stored dynamic credentials',
					expect.objectContaining({
						resolverSource: 'workflow',
					}),
				);
			});

			it('prefers credential resolver over workflow settings', async () => {
				const metadata = createMockCredentialMetadata({ resolverId: 'cred-resolver-456' });
				const workflowSettings: IWorkflowSettings = {
					credentialResolverId: 'workflow-resolver-789',
				};
				const resolverEntity = createMockResolverEntity({ id: 'cred-resolver-456' });
				const mockResolver = createMockResolver();

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByName.mockReturnValue(mockResolver);
				mockCipher.decrypt.mockReturnValue(JSON.stringify({}));

				await service.storeIfNeeded(
					metadata,
					dynamicData,
					credentialContext,
					undefined,
					workflowSettings,
				);

				expect(mockResolverRepository.findOneBy).toHaveBeenCalledWith({
					id: 'cred-resolver-456',
				});
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Successfully stored dynamic credentials',
					expect.objectContaining({
						resolverSource: 'credential',
					}),
				);
			});
		});
	});
});

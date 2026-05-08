import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { CredentialResolverDataNotFoundError, type ICredentialResolver } from '@n8n/decorators';
import type { Response } from 'express';
import type { Cipher } from 'n8n-core';
import type {
	ICredentialContext,
	ICredentialDataDecryptedObject,
	IExecutionContext,
} from 'n8n-workflow';

import type {
	CredentialResolutionResult,
	CredentialResolveMetadata,
} from '@/credentials/credential-resolution-provider.interface';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { StaticAuthService } from '@/services/static-auth-service';

import type { DynamicCredentialResolver } from '../../database/entities/credential-resolver';
import type { DynamicCredentialResolverRepository } from '../../database/repositories/credential-resolver.repository';
import type { DynamicCredentialsConfig } from '../../dynamic-credentials.config';
import { CredentialResolutionError } from '../../errors/credential-resolution.error';
import { CredentialResolverNotConfiguredError } from '../../errors/credential-resolver-not-configured.error';
import { CredentialResolverNotFoundError } from '../../errors/credential-resolver-not-found.error';
import { MissingExecutionContextError } from '../../errors/missing-execution-context.error';
import { IdentifierValidationError } from '../../credential-resolvers/identifiers/identifier-interface';
import type { DynamicCredentialResolverRegistry } from '../credential-resolver-registry.service';
import { DynamicCredentialService } from '../dynamic-credential.service';
import type { ResolverConfigExpressionService } from '../resolver-config-expression.service';

describe('DynamicCredentialService', () => {
	let service: DynamicCredentialService;
	let mockResolverRegistry: jest.Mocked<DynamicCredentialResolverRegistry>;
	let mockResolverRepository: jest.Mocked<DynamicCredentialResolverRepository>;
	let mockLoadNodesAndCredentials: jest.Mocked<LoadNodesAndCredentials>;
	let mockCipher: jest.Mocked<Cipher>;
	let mockLogger: jest.Mocked<Logger>;
	let mockExpressionService: jest.Mocked<ResolverConfigExpressionService>;
	let mockDynamicCredentialConfig: jest.Mocked<DynamicCredentialsConfig>;

	beforeEach(() => {
		mockDynamicCredentialConfig = {
			endpointAuthToken: 'test-token',
		} as unknown as jest.Mocked<DynamicCredentialsConfig>;
	});

	const createMockCredentialsMetadata = (overrides: Partial<CredentialResolveMetadata> = {}) =>
		({
			id: 'cred-123',
			name: 'Test Credential',
			isResolvable: true,
			resolverId: 'resolver-456',
			...overrides,
		}) as CredentialResolveMetadata;

	const createMockResolverEntity = (overrides: Partial<DynamicCredentialResolver> = {}) =>
		({
			id: 'resolver-456',
			name: 'test-resolver',
			type: 'test-resolver-1.0',
			config: 'encrypted-resolver-config', // Simulates encrypted config
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		}) as DynamicCredentialResolver;

	const createMockResolver = (
		shouldSucceed = true,
		shouldThrowDataNotFound = false,
		customData?: ICredentialDataDecryptedObject,
	): jest.Mocked<ICredentialResolver> => ({
		metadata: {
			name: 'test-resolver-1.0',
			description: 'Test resolver',
		},
		getSecret: jest.fn().mockImplementation(async () => {
			if (shouldThrowDataNotFound) {
				throw new CredentialResolverDataNotFoundError();
			}
			if (!shouldSucceed) {
				throw new Error('Resolution failed');
			}
			return customData ?? { token: 'dynamic-token', apiKey: 'dynamic-key' };
		}),
		setSecret: jest.fn(),
		validateOptions: jest.fn(),
	});

	const createMockExecutionContext = (credentials?: string): IExecutionContext => ({
		version: 1,
		establishedAt: Date.now(),
		source: 'manual' as const,
		credentials,
	});

	const createMockCredentialContext = (): ICredentialContext => ({
		version: 1,
		identity: 'user-123',
		metadata: {},
	});

	const createMockAdditionalData = (
		executionId: string = 'exec-123',
		secrets: Record<string, string> = {},
		executionContext?: IExecutionContext,
	) => ({
		executionId,
		restartExecutionId: undefined,
		restApiUrl: '',
		instanceBaseUrl: '',
		formWaitingBaseUrl: '',
		webhookBaseUrl: '',
		webhookWaitingBaseUrl: '',
		webhookTestBaseUrl: '',
		currentNodeParameters: undefined,
		executionTimeoutTimestamp: undefined,
		userId: 'user-123',
		variables: {
			...secrets,
		},
		executionContext,
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
			getResolverByTypename: jest.fn(),
			getAllResolvers: jest.fn(),
			init: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRegistry>;

		mockResolverRepository = {
			findOneBy: jest.fn(),
			save: jest.fn(),
			find: jest.fn(),
			findOne: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRepository>;

		mockCipher = {
			encryptV2: jest.fn(),
			decryptV2: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;

		mockLoadNodesAndCredentials = {
			getCredential: jest.fn(),
			loadCredentials: jest.fn(),
			loadAllCredentials: jest.fn(),
		} as unknown as jest.Mocked<LoadNodesAndCredentials>;

		mockLoadNodesAndCredentials.getCredential.mockReturnValue({
			sourcePath: 'credentials/Test Credential',
			type: { name: 'testCredentialType', displayName: 'Test Credential Type', properties: [] },
		});

		mockExpressionService = {
			resolve: jest.fn(async (config) => {
				// Simple mock that resolves expressions using global data only (vars, secrets)
				// Not using runtime data like $execution.id or $execution.mode
				const resolveValue = (value: unknown): unknown => {
					if (typeof value !== 'string') return value;

					// Resolve $vars.* expressions (global variables)
					const varsMatch = value.match(/^=\{\{\$vars\.(\w+)\}\}$/);
					if (varsMatch) {
						const varName = varsMatch[1];
						// Get vars from additionalData in the test context
						return (global as any).testVars?.[varName] ?? value;
					}

					// Resolve $secrets expressions (external secrets)
					const secretsMatch = value.match(/^=\{\{\$secrets\.(\w+)\.(\w+)\}\}$/);
					if (secretsMatch) {
						const [, provider, secretName] = secretsMatch;
						// Get secrets from test context
						return (global as any).testSecrets?.[`${provider}.${secretName}`] ?? value;
					}

					// Runtime expressions like $execution.id are NOT resolved
					return value;
				};

				// Deep resolve all values in config
				const resolveConfig = (obj: Record<string, unknown>): Record<string, unknown> => {
					const resolved: Record<string, unknown> = {};
					for (const [key, value] of Object.entries(obj)) {
						if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
							resolved[key] = resolveConfig(value as Record<string, unknown>);
						} else {
							resolved[key] = resolveValue(value);
						}
					}
					return resolved;
				};

				return await Promise.resolve(resolveConfig(config));
			}),
		} as unknown as jest.Mocked<ResolverConfigExpressionService>;

		service = new DynamicCredentialService(
			mockDynamicCredentialConfig,
			mockResolverRegistry,
			mockResolverRepository,
			mockLoadNodesAndCredentials,
			mockCipher,
			mockLogger,
			mockExpressionService,
		);
	});

	describe('resolveIfNeeded', () => {
		const staticData: ICredentialDataDecryptedObject = {
			token: 'static-token',
			apiKey: 'static-key',
		};

		const expectStaticResult = (result: CredentialResolutionResult) => {
			expect(result.data).toBe(staticData);
			expect(result.isDynamic).toBe(false);
		};

		describe('should return static credentials when', () => {
			it('credential is not resolvable', async () => {
				const credentialsEntity = createMockCredentialsMetadata({
					isResolvable: false,
				});

				const result = await service.resolveIfNeeded(credentialsEntity, staticData, undefined);

				expectStaticResult(result);
				expect(mockResolverRepository.findOneBy).not.toHaveBeenCalled();
			});
		});

		describe('should throw error when', () => {
			it('resolver entity is not found', async () => {
				const credentialsEntity = createMockCredentialsMetadata();

				mockResolverRepository.findOneBy.mockResolvedValue(null);

				await expect(
					service.resolveIfNeeded(credentialsEntity, staticData, undefined),
				).rejects.toThrow(CredentialResolverNotFoundError);

				await expect(
					service.resolveIfNeeded(credentialsEntity, staticData, undefined),
				).rejects.toThrow('Resolver "resolver-456" not found for credential "Test Credential"');
			});

			it('no resolver on credential or workflow settings', async () => {
				const credentialsEntity = createMockCredentialsMetadata({
					resolverId: undefined,
				});
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const additionalData = {
					...createMockAdditionalData('exec-123', {}, executionContext),
					workflowSettings: {}, // No credentialResolverId
				};

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						undefined,
					),
				).rejects.toThrow(CredentialResolverNotConfiguredError);
			});

			it('credential has no resolver ID', async () => {
				const credentialsEntity = createMockCredentialsMetadata({
					isResolvable: true,
					resolverId: undefined,
				});

				await expect(
					service.resolveIfNeeded(credentialsEntity, staticData, undefined),
				).rejects.toThrow(CredentialResolverNotConfiguredError);
			});

			it('resolver instance is not found in registry', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(undefined);

				await expect(
					service.resolveIfNeeded(credentialsEntity, staticData, undefined),
				).rejects.toThrow(CredentialResolverNotFoundError);
			});

			it('execution context is missing', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver();

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);

				await expect(
					service.resolveIfNeeded(credentialsEntity, staticData, undefined),
				).rejects.toThrow(MissingExecutionContextError);

				await expect(
					service.resolveIfNeeded(credentialsEntity, staticData, undefined),
				).rejects.toThrow(
					'Cannot resolve dynamic credentials without execution context for "Test Credential"',
				);
			});

			it('resolver getSecret fails', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver(false); // Will fail
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext)) // First invocation: decrypt execution context
					.mockResolvedValueOnce(JSON.stringify({ prefix: 'test' })) // First invocation: decrypt resolver config
					.mockResolvedValueOnce(JSON.stringify(credentialContext)) // Second invocation: decrypt execution context
					.mockResolvedValueOnce(JSON.stringify({ prefix: 'test' })); // Second invocation: decrypt resolver config

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						undefined,
					),
				).rejects.toThrow(CredentialResolutionError);

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						undefined,
					),
					// Internal error message must NOT be exposed to the user
				).rejects.toThrow('Failed to resolve dynamic credentials for "Test Credential"');

				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Dynamic credential resolution failed',
					expect.objectContaining({
						credentialId: 'cred-123',
						error: 'Resolution failed',
					}),
				);
			});

			it('credential context decryption fails', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2.mockImplementation(async () => {
					throw new Error('Decryption failed');
				});

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						undefined,
					),
				).rejects.toThrow(CredentialResolutionError);

				expect(mockLogger.error).toHaveBeenCalledWith(
					'Failed to decrypt credential context from execution context',
					expect.any(Object),
				);
			});

			it('resolver throws CredentialResolverDataNotFoundError', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver(false, true); // Throws CredentialResolverDataNotFoundError
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext))
					.mockResolvedValueOnce(JSON.stringify({ prefix: 'test' }));

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						undefined,
					),
				).rejects.toThrow(
					'Failed to resolve dynamic credentials for "Test Credential": No data found available for the requested credential and context combination.',
				);
			});

			it('resolver throws IdentifierValidationError', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);
				const mockResolver: jest.Mocked<ICredentialResolver> = {
					metadata: { name: 'test-resolver-1.0', description: 'Test resolver' },
					getSecret: jest
						.fn()
						.mockRejectedValue(new IdentifierValidationError('Token is not active')),
					setSecret: jest.fn(),
					validateOptions: jest.fn(),
				};

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext))
					.mockResolvedValueOnce(JSON.stringify({ prefix: 'test' }));

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						undefined,
					),
				).rejects.toThrow(
					'Failed to resolve dynamic credentials for "Test Credential": Token is not active',
				);
			});
		});

		describe('should successfully resolve dynamic credentials when', () => {
			it('all conditions are met and merges static with dynamic data', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				// Static data includes OAuth client config and old token
				const staticOAuthData: ICredentialDataDecryptedObject = {
					clientId: 'static-client-id',
					clientSecret: 'static-client-secret',
					token: 'static-token', // Will be overridden
					apiKey: 'static-key', // Will be overridden
				};

				// Dynamic data includes new tokens (overrides token) and new fields
				const dynamicData: ICredentialDataDecryptedObject = {
					token: 'dynamic-token',
					apiKey: 'dynamic-key',
					refreshToken: 'dynamic-refresh-token',
				};

				const mockResolver = createMockResolver(true, false, dynamicData);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext)) // First call: decrypt execution context
					.mockResolvedValueOnce(JSON.stringify({ prefix: 'test' })); // Second call: decrypt resolver config

				const result = await service.resolveIfNeeded(
					credentialsEntity,
					staticOAuthData,
					additionalData.executionContext,
					undefined,
				);

				// Verify merge: static fields preserved, dynamic fields added/overridden
				expect(result.isDynamic).toBe(true);
				expect(result.data).toEqual({
					clientId: 'static-client-id', // From static (preserved)
					clientSecret: 'static-client-secret', // From static (preserved)
					token: 'dynamic-token', // From dynamic (overridden)
					apiKey: 'dynamic-key', // From dynamic (overridden)
					refreshToken: 'dynamic-refresh-token', // From dynamic (new field)
				});
				expect(mockResolver.getSecret).toHaveBeenCalledWith('cred-123', credentialContext, {
					resolverId: resolverEntity.id,
					resolverName: resolverEntity.type,
					configuration: {
						prefix: 'test',
					},
				});
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Successfully resolved dynamic credentials',
					expect.objectContaining({
						credentialId: 'cred-123',
						resolverId: 'resolver-456',
						identity: 'user-123',
					}),
				);
			});

			it('resolver config is parsed correctly', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const customConfig = {
					prefix: 'custom',
					timeout: 5000,
					retries: 3,
				};
				const resolverEntity = createMockResolverEntity({
					config: 'encrypted-custom-resolver-config', // Simulates encrypted config
				});
				const mockResolver = createMockResolver();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext)) // First call: decrypt execution context
					.mockResolvedValueOnce(JSON.stringify(customConfig)); // Second call: decrypt resolver config

				await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					undefined,
				);

				expect(mockResolver.getSecret).toHaveBeenCalledWith('cred-123', credentialContext, {
					resolverId: resolverEntity.id,
					resolverName: resolverEntity.type,
					configuration: customConfig,
				});
			});

			it('credential context with metadata is properly decrypted', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver();
				const credentialContext: ICredentialContext = {
					version: 1,
					identity: 'user-456',
					metadata: {
						team: 'engineering',
						environment: 'production',
					},
				};
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext)) // First call: decrypt execution context
					.mockResolvedValueOnce(JSON.stringify({ prefix: 'test' })); // Second call: decrypt resolver config

				await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					undefined,
				);

				expect(mockResolver.getSecret).toHaveBeenCalledWith(
					'cred-123',
					credentialContext,
					expect.any(Object),
				);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Successfully resolved dynamic credentials',
					expect.objectContaining({
						identity: 'user-456',
					}),
				);
			});
		});

		describe('should handle edge cases', () => {
			it('execution context without credentials field throws', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver();
				const executionContext = createMockExecutionContext(undefined);
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						undefined,
					),
				).rejects.toThrow(CredentialResolutionError);

				expect(mockCipher.decryptV2).not.toHaveBeenCalled();
			});

			it('invalid JSON in encrypted credentials throws', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const mockResolver = createMockResolver();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2.mockResolvedValue('not-valid-json');

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						undefined,
					),
				).rejects.toThrow(CredentialResolutionError);
			});

			it('empty resolver config', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity({
					config: 'encrypted-empty-config', // Simulates encrypted empty config
				});
				const mockResolver = createMockResolver();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext)) // First call: decrypt execution context
					.mockResolvedValueOnce('{}'); // Second call: decrypt resolver config (empty object)

				await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					undefined,
				);

				expect(mockResolver.getSecret).toHaveBeenCalledWith('cred-123', credentialContext, {
					resolverId: resolverEntity.id,
					resolverName: resolverEntity.type,
					configuration: {},
				});
			});
		});

		describe('workflow settings fallback', () => {
			it('should use workflow settings resolver when credential has no resolver', async () => {
				const credentialsEntity = createMockCredentialsMetadata({
					resolverId: undefined, // No resolver on credential
				});
				const resolverEntity = createMockResolverEntity({
					id: 'workflow-resolver-789',
				});
				const mockResolver = createMockResolver();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = {
					...createMockAdditionalData('exec-123', {}, executionContext),
					workflowSettings: {
						credentialResolverId: 'workflow-resolver-789',
					},
				};

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext)) // First call: decrypt execution context
					.mockResolvedValueOnce(JSON.stringify({ prefix: 'test' })); // Second call: decrypt resolver config

				const result = await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					additionalData.workflowSettings,
				);

				expect(mockResolverRepository.findOneBy).toHaveBeenCalledWith({
					id: 'workflow-resolver-789',
				});
				expect(result.isDynamic).toBe(true);
				expect(result.data).toEqual({ token: 'dynamic-token', apiKey: 'dynamic-key' });
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Successfully resolved dynamic credentials',
					expect.objectContaining({
						resolverId: 'workflow-resolver-789',
						resolverSource: 'workflow',
					}),
				);
			});

			it('should prefer credential resolver over workflow settings resolver', async () => {
				const credentialsEntity = createMockCredentialsMetadata({
					resolverId: 'credential-resolver-456',
				});
				const resolverEntity = createMockResolverEntity({
					id: 'credential-resolver-456',
				});
				const mockResolver = createMockResolver();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = {
					...createMockAdditionalData('exec-123', {}, executionContext),
					workflowSettings: {
						credentialResolverId: 'workflow-resolver-789',
					},
				};

				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext)) // First call: decrypt execution context
					.mockResolvedValueOnce(JSON.stringify({ prefix: 'test' })); // Second call: decrypt resolver config

				const result = await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					additionalData.workflowSettings,
				);

				expect(mockResolverRepository.findOneBy).toHaveBeenCalledWith({
					id: 'credential-resolver-456',
				});
				expect(result.isDynamic).toBe(true);
				expect(result.data).toEqual({ token: 'dynamic-token', apiKey: 'dynamic-key' });
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Successfully resolved dynamic credentials',
					expect.objectContaining({
						resolverId: 'credential-resolver-456',
						resolverSource: 'credential',
					}),
				);
			});

			it('should throw when workflow resolver not found', async () => {
				const credentialsEntity = createMockCredentialsMetadata({
					resolverId: undefined,
				});
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const additionalData = {
					...createMockAdditionalData('exec-123', {}, executionContext),
					workflowSettings: {
						credentialResolverId: 'workflow-resolver-789',
					},
				};

				mockResolverRepository.findOneBy.mockResolvedValue(null);

				await expect(
					service.resolveIfNeeded(
						credentialsEntity,
						staticData,
						additionalData.executionContext,
						additionalData.workflowSettings,
					),
				).rejects.toThrow(CredentialResolutionError);

				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Resolver not found for dynamic credential',
					expect.objectContaining({
						resolverId: 'workflow-resolver-789',
						resolverSource: 'workflow',
					}),
				);
			});
		});

		describe('expression resolution in resolver config', () => {
			it('should resolve $vars expressions in resolver config', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData(
					'exec-123',
					{
						apiKey: 'secret-api-key-123',
					},
					executionContext,
				);

				// Set up test vars for the mock
				(global as any).testVars = { apiKey: 'secret-api-key-123' };

				// Resolver config with $vars expression
				const resolverConfigWithVars = {
					apiKey: '={{$vars.apiKey}}',
					prefix: 'cred',
				};

				const mockResolver = createMockResolver();
				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext))
					.mockResolvedValueOnce(JSON.stringify(resolverConfigWithVars));

				await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					undefined,
				);

				// Verify the resolver was called with resolved config
				expect(mockResolver.getSecret).toHaveBeenCalledWith('cred-123', credentialContext, {
					resolverId: resolverEntity.id,
					resolverName: resolverEntity.type,
					configuration: {
						apiKey: 'secret-api-key-123', // $vars expression resolved
						prefix: 'cred',
					},
				});

				// Cleanup
				delete (global as any).testVars;
			});

			it('should resolve $secrets expressions', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				// Set up test secrets for the mock
				(global as any).testSecrets = {
					'infisical.apiToken': 'secret-token-from-infisical',
				};

				// Resolver config with $secrets expression
				const resolverConfig = {
					apiToken: '={{$secrets.infisical.apiToken}}',
					prefix: 'cred',
				};

				const mockResolver = createMockResolver();
				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext))
					.mockResolvedValueOnce(JSON.stringify(resolverConfig));

				await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					undefined,
				);

				// Verify the resolver was called with resolved config
				const callArgs = mockResolver.getSecret.mock.calls[0][2];
				expect(callArgs.configuration.apiToken).toBe('secret-token-from-infisical');
				expect(callArgs.configuration.prefix).toBe('cred');

				// Cleanup
				delete (global as any).testSecrets;
			});

			it('should resolve only global expressions (not runtime) in resolver config', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData(
					'exec-789',
					{
						envVar: 'env-value',
					},
					executionContext,
				);

				// Set up test vars for the mock
				(global as any).testVars = { envVar: 'env-value' };

				// Resolver config with multiple expressions (mix of global and runtime)
				const resolverConfigWithExpressions = {
					prefix: '={{$execution.id}}', // Runtime expression - NOT resolved
					envValue: '={{$vars.envVar}}', // Global expression - resolved
					mode: '={{$execution.mode}}', // Runtime expression - NOT resolved
					staticValue: 'no-expression',
				};

				const mockResolver = createMockResolver();
				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext))
					.mockResolvedValueOnce(JSON.stringify(resolverConfigWithExpressions));

				await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					undefined,
				);

				// Verify only global expressions were resolved, runtime expressions remain as-is
				expect(mockResolver.getSecret).toHaveBeenCalledWith('cred-123', credentialContext, {
					resolverId: resolverEntity.id,
					resolverName: resolverEntity.type,
					configuration: {
						prefix: '={{$execution.id}}', // NOT resolved (runtime data)
						envValue: 'env-value', // Resolved (global data)
						mode: '={{$execution.mode}}', // NOT resolved (runtime data)
						staticValue: 'no-expression',
					},
				});

				// Cleanup
				delete (global as any).testVars;
			});

			it('should skip expression resolution when additionalData is missing', async () => {
				const credentialsEntity = createMockCredentialsMetadata();
				const resolverEntity = createMockResolverEntity();
				const executionContext = createMockExecutionContext('encrypted-credentials');
				const credentialContext = createMockCredentialContext();
				const additionalData = createMockAdditionalData('exec-123', {}, executionContext);

				// Resolver config with expression
				const resolverConfigWithExpression = {
					prefix: 'cred',
					executionId: '={{$execution.id}}',
				};

				const mockResolver = createMockResolver();
				mockResolverRepository.findOneBy.mockResolvedValue(resolverEntity);
				mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
				mockCipher.decryptV2
					.mockResolvedValueOnce(JSON.stringify(credentialContext))
					.mockResolvedValueOnce(JSON.stringify(resolverConfigWithExpression));

				// Call without mode (no expression resolution)
				await service.resolveIfNeeded(
					credentialsEntity,
					staticData,
					additionalData.executionContext,
					undefined,
				);

				// Verify config passed as-is (expression not resolved)
				expect(mockResolver.getSecret).toHaveBeenCalledWith('cred-123', credentialContext, {
					resolverId: resolverEntity.id,
					resolverName: resolverEntity.type,
					configuration: {
						prefix: 'cred',
						executionId: '={{$execution.id}}', // Expression NOT resolved
					},
				});
			});
		});

		describe('getDynamicCredentialsEndpointsMiddleware', () => {
			it('should return a bad request middleware when no token is set', () => {
				mockDynamicCredentialConfig.endpointAuthToken = ' ';
				service = new DynamicCredentialService(
					mockDynamicCredentialConfig,
					mockResolverRegistry,
					mockResolverRepository,
					mockLoadNodesAndCredentials,
					mockCipher,
					mockLogger,
					mockExpressionService,
				);
				const middleware = service.getDynamicCredentialsEndpointsMiddleware();
				const mockReq = {
					cookies: {},
				} as AuthenticatedRequest;
				const mockRes = {
					status: jest.fn().mockReturnThis(),
					json: jest.fn(),
				} as unknown as Response;
				const mockNext = jest.fn();

				middleware(mockReq, mockRes, mockNext);

				expect(mockRes.status).toHaveBeenCalledWith(500);
				expect(mockRes.json).toHaveBeenCalledWith({
					message: 'Dynamic credentials configuration is invalid. Check server logs for details.',
				});
				expect(mockNext).not.toHaveBeenCalled();
			});

			it('should call the static auth middleware with the correct token', () => {
				const getStaticAuthMiddlewareSpy = jest.spyOn(StaticAuthService, 'getStaticAuthMiddleware');
				mockDynamicCredentialConfig.endpointAuthToken = 'test-token';
				service = new DynamicCredentialService(
					mockDynamicCredentialConfig,
					mockResolverRegistry,
					mockResolverRepository,
					mockLoadNodesAndCredentials,
					mockCipher,
					mockLogger,
					mockExpressionService,
				);
				service.getDynamicCredentialsEndpointsMiddleware();
				expect(getStaticAuthMiddlewareSpy).toHaveBeenCalledWith('test-token', 'x-authorization');
				getStaticAuthMiddlewareSpy.mockRestore();
			});

			describe('cookie authentication bypass', () => {
				it('should bypass static auth check when req.user is present', () => {
					mockDynamicCredentialConfig.endpointAuthToken = 'test-token';
					service = new DynamicCredentialService(
						mockDynamicCredentialConfig,
						mockResolverRegistry,
						mockResolverRepository,
						mockLoadNodesAndCredentials,
						mockCipher,
						mockLogger,
						mockExpressionService,
					);

					const middleware = service.getDynamicCredentialsEndpointsMiddleware();

					const mockReq = {
						user: { id: 'user-123', email: 'test@example.com' }, // Authenticated user
						cookies: {},
						headers: {}, // No X-Authorization header
					} as AuthenticatedRequest;

					const mockRes = {
						status: jest.fn().mockReturnThis(),
						json: jest.fn(),
					} as unknown as Response;

					const mockNext = jest.fn();

					middleware(mockReq, mockRes, mockNext);

					// Should call next() without checking static auth
					expect(mockNext).toHaveBeenCalled();
					expect(mockRes.status).not.toHaveBeenCalled();
					expect(mockRes.json).not.toHaveBeenCalled();
				});

				it('should bypass 500 error when no token configured but req.user is present', () => {
					mockDynamicCredentialConfig.endpointAuthToken = ''; // No token configured
					service = new DynamicCredentialService(
						mockDynamicCredentialConfig,
						mockResolverRegistry,
						mockResolverRepository,
						mockLoadNodesAndCredentials,
						mockCipher,
						mockLogger,
						mockExpressionService,
					);

					const middleware = service.getDynamicCredentialsEndpointsMiddleware();

					const mockReq = {
						user: { id: 'user-123', email: 'test@example.com' }, // Authenticated user
						cookies: {},
					} as AuthenticatedRequest;

					const mockRes = {
						status: jest.fn().mockReturnThis(),
						json: jest.fn(),
					} as unknown as Response;

					const mockNext = jest.fn();

					middleware(mockReq, mockRes, mockNext);

					// Should call next() instead of returning 500 error
					expect(mockNext).toHaveBeenCalled();
					expect(mockLogger.error).not.toHaveBeenCalled();
					expect(mockRes.status).not.toHaveBeenCalled();
				});
			});
		});
	});
});

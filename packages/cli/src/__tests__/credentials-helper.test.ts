import type { LicenseState } from '@n8n/backend-common';
import {
	CredentialsEntity,
	type SecretsProviderConnectionRepository,
	type CredentialsRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { EntityNotFoundError } from '@n8n/typeorm';
import {
	type InstanceSettings,
	Cipher,
	CipherAes256GCM,
	CipherAes256CBC,
	EncryptionKeyProxy,
} from 'n8n-core';
import { SalesforceJwtApi } from 'n8n-nodes-base/credentials/SalesforceJwtApi.credentials';
import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeProperties,
	INodeTypes,
	INodeCredentialsDetails,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { deepCopy, Workflow } from 'n8n-workflow';
import { generateKeyPairSync } from 'node:crypto';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('@n8n/utils/format-pem-block', () => ({ formatPemBlock: (key: string) => key }));

// SalesforceJwtApi.preAuthentication exchanges its signed JWT for a token through the
// shared outbound HTTP client (`getTokenRequestClient`), not `this.helpers.httpRequest`.
// Mock that client so the token POST is observable and never hits the network.
const mockTokenRequest = vi.fn();
vi.mock('n8n-nodes-base/credentials/common/token-request', () => ({
	getTokenRequestClient: () => ({ request: mockTokenRequest }),
	TOKEN_REQUEST_TIMEOUT: 30_000,
}));

import { CredentialTypes } from '@/credential-types';
import { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import { CredentialsHelper } from '@/credentials-helper';
import type { CredentialsOverwrites } from '@/credentials-overwrites';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import type { AiGatewayService } from '@/services/ai-gateway.service';

describe('CredentialsHelper', () => {
	const nodeTypes = mock<INodeTypes>();
	const mockNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const credentialsRepository = mock<CredentialsRepository>();
	const secretsProviderRepository = mock<SecretsProviderConnectionRepository>();
	const licenseState = mock<LicenseState>();
	const externalSecretsConfig = mock<ExternalSecretsConfig>();
	const mockLogger = mock<any>();
	// Use a real instance of DynamicCredentialsProxy so setResolverProvider works
	const dynamicCredentialProxy = new DynamicCredentialsProxy(mockLogger);

	// Setup cipher for testing
	const cipher = new Cipher(
		mock<InstanceSettings>({ encryptionKey: 'test_key_for_testing' }),
		new CipherAes256GCM(),
		new CipherAes256CBC(),
		new EncryptionKeyProxy(),
	);
	Container.set(Cipher, cipher);

	const credentialsHelper = new CredentialsHelper(
		new CredentialTypes(mockNodesAndCredentials),
		mock(),
		credentialsRepository,
		dynamicCredentialProxy,
		secretsProviderRepository,
		licenseState,
		externalSecretsConfig,
		mock<AiGatewayService>(),
	);

	describe('getCredentials', () => {
		test('turns `EntityNotFoundError` into `CredentialNotFoundError`s', async () => {
			credentialsRepository.findOneByOrFail.mockRejectedValueOnce(
				new EntityNotFoundError(CredentialsEntity, 'foo'),
			);

			await expect(
				credentialsHelper.getCredentials({ id: '1', name: 'foo' }, 'bar'),
			).rejects.toThrow(CredentialNotFoundError);
		});

		test('passes other error through', async () => {
			const errorMessage = 'Connection terminated due to connection timeout';
			credentialsRepository.findOneByOrFail.mockRejectedValueOnce(new Error(errorMessage));

			await expect(
				credentialsHelper.getCredentials({ id: '1', name: 'foo' }, 'bar'),
			).rejects.toThrow(errorMessage);
		});
	});

	describe('applyDefaultsAndOverwrites', () => {
		test('omits marked credential fields that cannot resolve without execution context', async () => {
			const credentialType: ICredentialType = {
				name: 'openAiApi',
				displayName: 'OpenAI',
				properties: [
					{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Base URL',
						name: 'url',
						type: 'string',
						default: 'https://api.openai.com/v1',
					},
					{
						displayName: 'Add Custom Header',
						name: 'header',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Header Name',
						name: 'headerName',
						type: 'string',
						default: '',
						typeOptions: {
							ignoreCredentialExpressionResolveError: true,
						},
					},
					{
						displayName: 'Header Value',
						name: 'headerValue',
						type: 'string',
						default: '',
						typeOptions: {
							ignoreCredentialExpressionResolveError: true,
						},
					},
				],
			};
			mockNodesAndCredentials.getCredential.calledWith(credentialType.name).mockReturnValue({
				type: credentialType,
				sourcePath: '',
			});
			const credentialsOverwrites = mock<CredentialsOverwrites>();
			credentialsOverwrites.applyOverwrite.mockImplementation((_type, data) => data);
			const helper = new CredentialsHelper(
				new CredentialTypes(mockNodesAndCredentials),
				credentialsOverwrites,
				credentialsRepository,
				dynamicCredentialProxy,
				secretsProviderRepository,
				licenseState,
				externalSecretsConfig,
				mock<AiGatewayService>(),
			);

			const result = await helper.applyDefaultsAndOverwrites(
				mock<IWorkflowExecuteAdditionalData>({ variables: {} }),
				{
					apiKey: 'test-api-key',
					url: 'https://custom.example/v1',
					header: true,
					headerName: 'X-Workflow-Id',
					headerValue: '={{$workflow.id}}',
				},
				credentialType.name,
				'internal',
			);

			expect(result).toMatchObject({
				apiKey: 'test-api-key',
				url: 'https://custom.example/v1',
				header: true,
				headerName: 'X-Workflow-Id',
			});
			expect(result).not.toHaveProperty('headerValue');
		});

		test('throws when an unmarked credential field cannot resolve without execution context', async () => {
			const credentialType: ICredentialType = {
				name: 'openAiApi',
				displayName: 'OpenAI',
				properties: [
					{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string',
						required: true,
						default: '',
					},
				],
			};
			mockNodesAndCredentials.getCredential.calledWith(credentialType.name).mockReturnValue({
				type: credentialType,
				sourcePath: '',
			});
			const credentialsOverwrites = mock<CredentialsOverwrites>();
			credentialsOverwrites.applyOverwrite.mockImplementation((_type, data) => data);
			const helper = new CredentialsHelper(
				new CredentialTypes(mockNodesAndCredentials),
				credentialsOverwrites,
				credentialsRepository,
				dynamicCredentialProxy,
				secretsProviderRepository,
				licenseState,
				externalSecretsConfig,
				mock<AiGatewayService>(),
			);

			await expect(
				helper.applyDefaultsAndOverwrites(
					mock<IWorkflowExecuteAdditionalData>({ variables: {} }),
					{
						apiKey: '={{$workflow.id}}',
					},
					credentialType.name,
					'internal',
				),
			).rejects.toThrow('save workflow to view');
		});
	});

	describe('authenticate', () => {
		const tests: Array<{
			description: string;
			input: {
				credentials: ICredentialDataDecryptedObject;
				credentialType: ICredentialType;
			};
			output: IHttpRequestOptions;
		}> = [
			{
				description: 'basicAuth, default property names',
				input: {
					credentials: {
						user: 'user1',
						password: 'password1',
					},
					credentialType: new (class TestApi implements ICredentialType {
						name = 'testApi';

						displayName = 'Test API';

						properties: INodeProperties[] = [
							{
								displayName: 'User',
								name: 'user',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Password',
								name: 'password',
								type: 'string',
								default: '',
							},
						];

						authenticate: IAuthenticateGeneric = {
							type: 'generic',
							properties: {
								auth: {
									username: '={{$credentials.user}}',
									password: '={{$credentials.password}}',
								},
							},
						};
					})(),
				},
				output: {
					url: '',
					headers: {},
					auth: { username: 'user1', password: 'password1' },
					qs: {},
				},
			},
			{
				description: 'headerAuth',
				input: {
					credentials: {
						accessToken: 'test',
					},
					credentialType: new (class TestApi implements ICredentialType {
						name = 'testApi';

						displayName = 'Test API';

						properties: INodeProperties[] = [
							{
								displayName: 'Access Token',
								name: 'accessToken',
								type: 'string',
								default: '',
							},
						];

						authenticate: IAuthenticateGeneric = {
							type: 'generic',
							properties: {
								headers: {
									Authorization: '=Bearer {{$credentials.accessToken}}',
								},
							},
						};
					})(),
				},
				output: { url: '', headers: { Authorization: 'Bearer test' }, qs: {} },
			},
			{
				description: 'headerAuth, key and value expressions',
				input: {
					credentials: {
						accessToken: 'test',
					},
					credentialType: new (class TestApi implements ICredentialType {
						name = 'testApi';

						displayName = 'Test API';

						properties: INodeProperties[] = [
							{
								displayName: 'Access Token',
								name: 'accessToken',
								type: 'string',
								default: '',
							},
						];

						authenticate: IAuthenticateGeneric = {
							type: 'generic',
							properties: {
								headers: {
									'={{$credentials.accessToken}}': '=Bearer {{$credentials.accessToken}}',
								},
							},
						};
					})(),
				},
				output: { url: '', headers: { test: 'Bearer test' }, qs: {} },
			},
			{
				description: 'queryAuth',
				input: {
					credentials: {
						accessToken: 'test',
					},
					credentialType: new (class TestApi implements ICredentialType {
						name = 'testApi';

						displayName = 'Test API';

						properties: INodeProperties[] = [
							{
								displayName: 'Access Token',
								name: 'accessToken',
								type: 'string',
								default: '',
							},
						];

						authenticate = {
							type: 'generic',
							properties: {
								qs: {
									accessToken: '={{$credentials.accessToken}}',
								},
							},
						} as IAuthenticateGeneric;
					})(),
				},
				output: { url: '', headers: {}, qs: { accessToken: 'test' } },
			},
			{
				description: 'custom authentication',
				input: {
					credentials: {
						accessToken: 'test',
						user: 'testUser',
					},
					credentialType: new (class TestApi implements ICredentialType {
						name = 'testApi';

						displayName = 'Test API';

						properties: INodeProperties[] = [
							{
								displayName: 'My Token',
								name: 'myToken',
								type: 'string',
								default: '',
							},
						];

						async authenticate(
							credentials: ICredentialDataDecryptedObject,
							requestOptions: IHttpRequestOptions,
						): Promise<IHttpRequestOptions> {
							requestOptions.headers!.Authorization = `Bearer ${credentials.accessToken}`;
							requestOptions.qs!.user = credentials.user;
							return requestOptions;
						}
					})(),
				},
				output: {
					url: '',
					headers: { Authorization: 'Bearer test' },
					qs: { user: 'testUser' },
				},
			},
		];

		const node: INode = {
			id: 'uuid-1',
			parameters: {},
			name: 'test',
			type: 'test.set',
			typeVersion: 1,
			position: [0, 0],
		};

		const incomingRequestOptions = {
			url: '',
			headers: {},
			qs: {},
		};

		const workflow = new Workflow({
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes,
		});

		for (const testData of tests) {
			test(testData.description, async () => {
				const { credentialType } = testData.input;

				mockNodesAndCredentials.getCredential.calledWith(credentialType.name).mockReturnValue({
					type: credentialType,
					sourcePath: '',
				});

				const result = await credentialsHelper.authenticate(
					testData.input.credentials,
					credentialType.name,
					deepCopy(incomingRequestOptions),
					workflow,
					node,
				);

				expect(result).toEqual(testData.output);
			});
		}
	});

	describe('updateCredentialsOauthTokenData', () => {
		test('only updates oauthTokenData field while preserving other credential fields', async () => {
			const nodeCredentials: INodeCredentialsDetails = {
				id: 'cred-123',
				name: 'Test OAuth2 Credential',
			};

			const existingCredentialData = {
				clientId: 'existing-client-id',
				clientSecret: 'existing-client-secret',
				scope: 'read write',
				customField: 'custom-value',
				oauthTokenData: {
					access_token: 'old-access-token',
					refresh_token: 'old-refresh-token',
					expires_in: 3600,
				},
			};

			const newOauthTokenData = {
				oauthTokenData: {
					access_token: 'new-access-token',
					refresh_token: 'new-refresh-token',
					expires_in: 7200,
					token_type: 'Bearer',
				},
			};

			const mockCredentialEntity = {
				id: 'cred-123',
				name: 'Test OAuth2 Credential',
				type: 'oAuth2Api',
				data: cipher.encrypt(existingCredentialData),
			};

			credentialsRepository.findOneByOrFail.mockResolvedValue(
				mockCredentialEntity as CredentialsEntity,
			);

			const beforeUpdateTime = new Date();
			await credentialsHelper.updateCredentialsOauthTokenData(
				nodeCredentials,
				'oAuth2Api',
				newOauthTokenData,
				{} as IWorkflowExecuteAdditionalData,
			);

			expect(credentialsRepository.update).toHaveBeenCalledWith(
				{ id: 'cred-123', type: 'oAuth2Api' },
				expect.objectContaining({
					id: 'cred-123',
					name: 'Test OAuth2 Credential',
					type: 'oAuth2Api',
					data: expect.any(String),
					updatedAt: expect.any(Date),
				}),
			);

			const updateCall = credentialsRepository.update.mock.calls[0];
			const updatedCredentialData = updateCall[1];
			const updatedAt = updatedCredentialData.updatedAt as Date;

			expect(updatedAt).toBeInstanceOf(Date);
			expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdateTime.getTime());

			const decryptedUpdatedData = cipher.decrypt(updatedCredentialData.data as string);
			const parsedUpdatedData = JSON.parse(decryptedUpdatedData);

			expect(parsedUpdatedData).toEqual({
				clientId: 'existing-client-id',
				clientSecret: 'existing-client-secret',
				scope: 'read write',
				customField: 'custom-value',
				oauthTokenData: {
					access_token: 'new-access-token',
					refresh_token: 'new-refresh-token',
					expires_in: 7200,
					token_type: 'Bearer',
				},
			});

			expect(parsedUpdatedData.clientId).toBe('existing-client-id');
			expect(parsedUpdatedData.clientSecret).toBe('existing-client-secret');
			expect(parsedUpdatedData.scope).toBe('read write');
			expect(parsedUpdatedData.customField).toBe('custom-value');
			expect(parsedUpdatedData.oauthTokenData.access_token).toBe('new-access-token');
			expect(parsedUpdatedData.oauthTokenData.refresh_token).toBe('new-refresh-token');
			expect(parsedUpdatedData.oauthTokenData.expires_in).toBe(7200);
			expect(parsedUpdatedData.oauthTokenData.token_type).toBe('Bearer');
		});

		describe('dynamic credential resolution', () => {
			const nodeCredentials: INodeCredentialsDetails = {
				id: 'cred-789',
				name: 'Test OAuth2 Credential',
			};

			const existingCredentialData = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				oauthTokenData: {
					access_token: 'old-token',
					refresh_token: 'old-refresh',
				},
			};

			const newOauthTokenData = {
				oauthTokenData: {
					access_token: 'new-token',
					refresh_token: 'new-refresh',
					expires_in: 3600,
				},
			};

			let storeOAuthTokenDataSpy: MockInstance;

			beforeEach(() => {
				vi.clearAllMocks();
				// Spy on the dynamicCredentialProxy's storeOAuthTokenDataIfNeeded method
				storeOAuthTokenDataSpy = vi
					.spyOn(dynamicCredentialProxy, 'storeOAuthTokenDataIfNeeded')
					.mockResolvedValue(undefined);
			});

			afterEach(() => {
				storeOAuthTokenDataSpy.mockRestore();
			});

			test('should use dynamic proxy when credentials are resolvable with credentials context', async () => {
				// Setup: Resolvable credential with resolver
				const mockCredentialEntity = {
					id: 'cred-789',
					name: 'Test OAuth2 Credential',
					type: 'oAuth2Api',
					data: cipher.encrypt(existingCredentialData),
					isResolvable: true,
					resolverId: 'resolver-123',
				} as CredentialsEntity;

				credentialsRepository.findOneByOrFail.mockResolvedValue(mockCredentialEntity);

				const additionalDataWithCredentials = {
					executionContext: {
						version: 1,
						establishedAt: Date.now(),
						source: 'manual' as const,
						credentials: 'encrypted-credential-context', // credentials context present
					},
					workflowSettings: {
						credentialResolverId: 'workflow-resolver-123',
					},
				} as IWorkflowExecuteAdditionalData;

				// Act
				await credentialsHelper.updateCredentialsOauthTokenData(
					nodeCredentials,
					'oAuth2Api',
					newOauthTokenData,
					additionalDataWithCredentials,
				);

				// Assert: Should use dynamic proxy, NOT direct database update
				expect(storeOAuthTokenDataSpy).toHaveBeenCalledWith(
					{
						id: 'cred-789',
						name: 'Test OAuth2 Credential',
						type: 'oAuth2Api',
						isResolvable: true,
						resolverId: 'resolver-123',
					},
					newOauthTokenData.oauthTokenData,
					additionalDataWithCredentials.executionContext,
					existingCredentialData,
					additionalDataWithCredentials.workflowSettings,
				);
				expect(credentialsRepository.update).not.toHaveBeenCalled();
			});

			test('should fall back to the system resolver from the proxy when no override is set', async () => {
				const mockCredentialEntity = {
					id: 'cred-789',
					name: 'Test OAuth2 Credential',
					type: 'oAuth2Api',
					data: cipher.encrypt(existingCredentialData),
					isResolvable: true,
					resolverId: null,
				} as unknown as CredentialsEntity;

				credentialsRepository.findOneByOrFail.mockResolvedValue(mockCredentialEntity);

				const resolverProvider = {
					resolveIfNeeded: vi.fn(),
					getSystemResolverId: vi.fn().mockReturnValue('system-resolver'),
				};
				dynamicCredentialProxy.setResolverProvider(resolverProvider);

				const additionalDataWithCredentials = {
					executionContext: {
						version: 1,
						establishedAt: Date.now(),
						source: 'manual' as const,
						credentials: 'encrypted-credential-context',
					},
					workflowSettings: {},
				} as IWorkflowExecuteAdditionalData;

				try {
					await credentialsHelper.updateCredentialsOauthTokenData(
						nodeCredentials,
						'oAuth2Api',
						newOauthTokenData,
						additionalDataWithCredentials,
					);

					expect(storeOAuthTokenDataSpy).toHaveBeenCalledWith(
						expect.objectContaining({
							id: 'cred-789',
							isResolvable: true,
							resolverId: 'system-resolver',
						}),
						newOauthTokenData.oauthTokenData,
						additionalDataWithCredentials.executionContext,
						existingCredentialData,
						additionalDataWithCredentials.workflowSettings,
					);
					expect(credentialsRepository.update).not.toHaveBeenCalled();
				} finally {
					dynamicCredentialProxy.setResolverProvider(undefined as any);
				}
			});

			test('should skip dynamic proxy when credentials context is missing', async () => {
				// Setup: Resolvable credential with resolver, but NO credentials context
				const mockCredentialEntity = {
					id: 'cred-789',
					name: 'Test OAuth2 Credential',
					type: 'oAuth2Api',
					data: cipher.encrypt(existingCredentialData),
					isResolvable: true,
					resolverId: 'resolver-123',
				} as CredentialsEntity;

				credentialsRepository.findOneByOrFail.mockResolvedValue(mockCredentialEntity);

				const additionalDataWithoutCredentials = {
					executionContext: {
						version: 1,
						establishedAt: Date.now(),
						source: 'manual' as const,
						// credentials is undefined - static credential execution
					},
					workflowSettings: {
						credentialResolverId: 'workflow-resolver-123',
					},
				} as any;

				// Act
				await credentialsHelper.updateCredentialsOauthTokenData(
					nodeCredentials,
					'oAuth2Api',
					newOauthTokenData,
					additionalDataWithoutCredentials,
				);

				// Assert: Should skip dynamic proxy and use direct database update
				expect(storeOAuthTokenDataSpy).not.toHaveBeenCalled();
				expect(credentialsRepository.update).toHaveBeenCalledWith(
					{ id: 'cred-789', type: 'oAuth2Api' },
					expect.objectContaining({
						id: 'cred-789',
						data: expect.any(String),
						updatedAt: expect.any(Date),
					}),
				);

				// Verify OAuth token was updated in database
				const updateCall = credentialsRepository.update.mock.calls[0];
				const updatedData = cipher.decrypt(updateCall[1].data as string);
				const parsedData = JSON.parse(updatedData);
				expect(parsedData.oauthTokenData.access_token).toBe('new-token');
			});

			test('should skip dynamic proxy when executionContext is entirely missing', async () => {
				// Setup: Resolvable credential with resolver, but NO executionContext
				const mockCredentialEntity = {
					id: 'cred-789',
					name: 'Test OAuth2 Credential',
					type: 'oAuth2Api',
					data: cipher.encrypt(existingCredentialData),
					isResolvable: true,
					resolverId: 'resolver-123',
				} as CredentialsEntity;

				credentialsRepository.findOneByOrFail.mockResolvedValue(mockCredentialEntity);

				const additionalDataWithoutContext = {
					executionContext: undefined, // No execution context at all
					workflowSettings: {
						credentialResolverId: 'workflow-resolver-123',
					},
				} as any;

				// Act
				await credentialsHelper.updateCredentialsOauthTokenData(
					nodeCredentials,
					'oAuth2Api',
					newOauthTokenData,
					additionalDataWithoutContext,
				);

				// Assert: Should skip dynamic proxy and use direct database update
				expect(storeOAuthTokenDataSpy).not.toHaveBeenCalled();
				expect(credentialsRepository.update).toHaveBeenCalledWith(
					{ id: 'cred-789', type: 'oAuth2Api' },
					expect.objectContaining({
						id: 'cred-789',
						data: expect.any(String),
						updatedAt: expect.any(Date),
					}),
				);

				// Verify OAuth token was updated in database
				const updateCall = credentialsRepository.update.mock.calls[0];
				const updatedData = cipher.decrypt(updateCall[1].data as string);
				const parsedData = JSON.parse(updatedData);
				expect(parsedData.oauthTokenData.access_token).toBe('new-token');
			});
		});
	});

	describe('getDecrypted - AI Gateway managed credentials', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should pass workflowId and projectId for owner resolution when userId is absent', async () => {
			const aiGatewayService = mock<AiGatewayService>();
			const helperWithGateway = new CredentialsHelper(
				new CredentialTypes(mockNodesAndCredentials),
				mock(),
				credentialsRepository,
				dynamicCredentialProxy,
				secretsProviderRepository,
				licenseState,
				externalSecretsConfig,
				aiGatewayService,
			);

			const syntheticCred = { apiKey: 'mock-jwt', host: 'http://gateway/v1/gateway/google' };
			aiGatewayService.getSyntheticCredential.mockResolvedValue(syntheticCred);

			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: undefined,
				workflowId: 'workflow-123',
				projectId: 'project-456',
				executionId: undefined,
			});
			const nodeCredentials: INodeCredentialsDetails = {
				id: null,
				name: '',
				__aiGatewayManaged: true,
			};

			const result = await helperWithGateway.getDecrypted(
				additionalData,
				nodeCredentials,
				'googlePalmApi',
				'manual',
			);

			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledWith({
				credentialType: 'googlePalmApi',
				userId: undefined,
				workflowId: 'workflow-123',
				projectId: 'project-456',
				executionId: undefined,
			});
			expect(result).toEqual(syntheticCred);
		});

		it('should call getSyntheticCredential and return its result when __aiGatewayManaged is true', async () => {
			const aiGatewayService = mock<AiGatewayService>();
			const helperWithGateway = new CredentialsHelper(
				new CredentialTypes(mockNodesAndCredentials),
				mock(),
				credentialsRepository,
				dynamicCredentialProxy,
				secretsProviderRepository,
				licenseState,
				externalSecretsConfig,
				aiGatewayService,
			);

			const syntheticCred = { apiKey: 'mock-jwt', host: 'http://gateway/v1/gateway/google' };
			aiGatewayService.getSyntheticCredential.mockResolvedValue(syntheticCred);

			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: 'user-123',
				workflowId: undefined,
				projectId: undefined,
				executionId: undefined,
			});
			const nodeCredentials: INodeCredentialsDetails = {
				id: null,
				name: '',
				__aiGatewayManaged: true,
			};

			const result = await helperWithGateway.getDecrypted(
				additionalData,
				nodeCredentials,
				'googlePalmApi',
				'manual',
			);

			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledWith({
				credentialType: 'googlePalmApi',
				userId: 'user-123',
				workflowId: undefined,
				projectId: undefined,
				executionId: undefined,
			});
			expect(result).toEqual(syntheticCred);
			// Should NOT attempt to look up a DB credential
			expect(credentialsRepository.findOneByOrFail).not.toHaveBeenCalled();
		});

		it('should forward executionId from additionalData to getSyntheticCredential', async () => {
			const aiGatewayService = mock<AiGatewayService>();
			const helperWithGateway = new CredentialsHelper(
				new CredentialTypes(mockNodesAndCredentials),
				mock(),
				credentialsRepository,
				dynamicCredentialProxy,
				secretsProviderRepository,
				licenseState,
				externalSecretsConfig,
				aiGatewayService,
			);

			const syntheticCred = {
				apiKey: 'mock-jwt',
				host: 'http://gateway/v1/gateway/exec/29021/R9JFXwkUCL1jZBuw/google',
			};
			aiGatewayService.getSyntheticCredential.mockResolvedValue(syntheticCred);

			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: 'user-123',
				workflowId: 'R9JFXwkUCL1jZBuw',
				projectId: undefined,
				executionId: '29021',
			});
			const nodeCredentials: INodeCredentialsDetails = {
				id: null,
				name: '',
				__aiGatewayManaged: true,
			};

			const result = await helperWithGateway.getDecrypted(
				additionalData,
				nodeCredentials,
				'googlePalmApi',
				'manual',
			);

			expect(aiGatewayService.getSyntheticCredential).toHaveBeenCalledWith({
				credentialType: 'googlePalmApi',
				userId: 'user-123',
				workflowId: 'R9JFXwkUCL1jZBuw',
				projectId: undefined,
				executionId: '29021',
			});
			expect(result).toEqual(syntheticCred);
		});
	});

	describe('getDecrypted - externalSecrets license check', () => {
		const mockAdditionalDataForLicense = mock<IWorkflowExecuteAdditionalData>();

		const nodeCredentials: INodeCredentialsDetails = {
			id: 'cred-license-test',
			name: 'License Test Credential',
		};

		const mockCredentialEntityForLicense = {
			id: 'cred-license-test',
			name: 'License Test Credential',
			type: 'testApi',
			data: cipher.encrypt({ apiKey: 'test' }),
			isResolvable: false,
		} as CredentialsEntity;

		beforeEach(() => {
			vi.clearAllMocks();
			credentialsRepository.findOneByOrFail.mockResolvedValue(mockCredentialEntityForLicense);
			secretsProviderRepository.findAllAccessibleProviderKeysByCredentialId.mockResolvedValue([]);
			mockAdditionalDataForLicense.externalSecretProviderKeysAccessibleByCredential = undefined;
			externalSecretsConfig.externalSecretsForProjects = false;
		});

		test('should set externalSecretProviderKeysAccessibleByCredential on additionalData when externalSecrets is licensed', async () => {
			licenseState.isExternalSecretsLicensed.mockReturnValue(true);
			externalSecretsConfig.externalSecretsForProjects = true;
			secretsProviderRepository.findAllAccessibleProviderKeysByCredentialId.mockResolvedValue([
				'secret_key_1',
				'secret_key_2',
			]);

			await credentialsHelper.getDecrypted(
				mockAdditionalDataForLicense,
				nodeCredentials,
				'testApi',
				'manual',
			);

			expect(
				secretsProviderRepository.findAllAccessibleProviderKeysByCredentialId,
			).toHaveBeenCalledWith('cred-license-test');
			expect(mockAdditionalDataForLicense.externalSecretProviderKeysAccessibleByCredential).toEqual(
				new Set(['secret_key_1', 'secret_key_2']),
			);
		});

		test('should not query secretsProviderRepository or set externalSecretProviderKeysAccessibleByCredential when externalSecrets is not licensed', async () => {
			licenseState.isExternalSecretsLicensed.mockReturnValue(false);
			externalSecretsConfig.externalSecretsForProjects = false;

			await credentialsHelper.getDecrypted(
				mockAdditionalDataForLicense,
				nodeCredentials,
				'testApi',
				'manual',
			);

			expect(
				secretsProviderRepository.findAllAccessibleProviderKeysByCredentialId,
			).not.toHaveBeenCalled();
			expect(
				mockAdditionalDataForLicense.externalSecretProviderKeysAccessibleByCredential,
			).toBeUndefined();
		});
	});

	describe('getDecrypted - credential resolution integration', () => {
		const mockCredentialResolutionProvider = {
			resolveIfNeeded: vi.fn(),
			getSystemResolverId: vi.fn(),
		};

		const mockAdditionalData = {
			executionContext: {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual' as const,
				credentials: 'encrypted-credential-context',
			},
			workflowSettings: {
				executionTimeout: 300,
				credentialResolverId: 'workflow-resolver-123',
			},
		} as any;

		const nodeCredentials: INodeCredentialsDetails = {
			id: 'cred-456',
			name: 'Test Credentials',
		};

		const credentialType = 'testApi';

		const mockCredentialEntity = {
			id: 'cred-456',
			name: 'Test Credentials',
			type: credentialType,
			data: cipher.encrypt({ apiKey: 'static-key' }),
			isResolvable: false,
		} as CredentialsEntity;

		beforeEach(() => {
			vi.clearAllMocks();
			credentialsRepository.findOneByOrFail.mockResolvedValue(mockCredentialEntity);
			// Clear the provider between tests to ensure clean state
			dynamicCredentialProxy.setResolverProvider(undefined as any);
		});

		test('should call resolveIfNeeded when credentialResolutionProvider is set', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);

			const resolvedData = { apiKey: 'dynamic-key' };
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: resolvedData,
				isDynamic: true,
			});
			credentialsRepository.findOneByOrFail.mockResolvedValue(mockCredentialEntity);

			const result = await credentialsHelper.getDecrypted(
				mockAdditionalData,
				nodeCredentials,
				credentialType,
				'trigger',
				undefined, // executeData
				true, // raw = true to get the resolved data directly
			);

			expect(mockCredentialResolutionProvider.resolveIfNeeded).toHaveBeenCalledWith(
				{
					id: mockCredentialEntity.id,
					name: mockCredentialEntity.name,
					isResolvable: false,
					type: 'testApi',
					resolverId: undefined,
				},
				{ apiKey: 'static-key' },
				mockAdditionalData.executionContext,
				mockAdditionalData.workflowSettings,
			);
			expect(result).toEqual(resolvedData);
		});

		test('should pass executionContext from additionalData to resolver', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: { apiKey: 'resolved' },
				isDynamic: false,
			});

			await credentialsHelper.getDecrypted(
				mockAdditionalData,
				nodeCredentials,
				credentialType,
				'trigger',
				undefined,
				true,
			);

			const call = mockCredentialResolutionProvider.resolveIfNeeded.mock.calls[0];
			expect(call[2]).toBe(mockAdditionalData.executionContext);
		});

		test('should pass workflowSettings from additionalData to resolver', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: { apiKey: 'resolved' },
				isDynamic: false,
			});

			await credentialsHelper.getDecrypted(
				mockAdditionalData,
				nodeCredentials,
				credentialType,
				'trigger',
				undefined,
				true,
			);

			const call = mockCredentialResolutionProvider.resolveIfNeeded.mock.calls[0];
			expect(call[3]).toBe(mockAdditionalData.workflowSettings);
		});

		test('should skip resolution when credentialResolutionProvider is not set', async () => {
			// Create a new proxy instance without provider
			const proxyWithoutProvider = new DynamicCredentialsProxy(mockLogger);
			const helperWithoutProvider = new CredentialsHelper(
				new CredentialTypes(mockNodesAndCredentials),
				mock(),
				credentialsRepository,
				proxyWithoutProvider,
				secretsProviderRepository,
				licenseState,
				externalSecretsConfig,
				mock<AiGatewayService>(),
			);

			const result = await helperWithoutProvider.getDecrypted(
				mockAdditionalData,
				nodeCredentials,
				credentialType,
				'manual',
				undefined,
				true,
			);

			// Should return static decrypted data
			expect(result).toEqual({ apiKey: 'static-key' });
		});

		test('should use resolved data instead of static data when resolution succeeds', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);

			const dynamicData = { apiKey: 'dynamic-key', extraField: 'extra-value' };
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: dynamicData,
				isDynamic: true,
			});

			const result = await credentialsHelper.getDecrypted(
				mockAdditionalData,
				nodeCredentials,
				credentialType,
				'trigger',
				undefined,
				true,
			);

			expect(result).toEqual(dynamicData);
			expect(result).not.toEqual({ apiKey: 'static-key' });
		});

		test('should skip resolution when executionContext is missing (manual mode)', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: { apiKey: 'resolved' },
				isDynamic: false,
			});

			const additionalDataWithoutContext = {
				...mockAdditionalData,
				executionContext: undefined,
			};

			const result = await credentialsHelper.getDecrypted(
				additionalDataWithoutContext,
				nodeCredentials,
				credentialType,
				'manual',
				undefined,
				true,
			);

			expect(mockCredentialResolutionProvider.resolveIfNeeded).not.toHaveBeenCalled();
			expect(result).toEqual({ apiKey: 'static-key' });
		});

		test('should resolve in manual mode when credentials context is present (test webhook with identity extractor)', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);
			const dynamicData = { apiKey: 'dynamic-key' };
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: dynamicData,
				isDynamic: true,
			});

			// mockAdditionalData has credentials context set — simulates a test webhook run
			const result = await credentialsHelper.getDecrypted(
				mockAdditionalData,
				nodeCredentials,
				credentialType,
				'manual',
				undefined,
				true,
			);

			expect(mockCredentialResolutionProvider.resolveIfNeeded).toHaveBeenCalled();
			expect(result).toEqual(dynamicData);
		});

		test('should skip resolution when credentials context is missing (manual mode)', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: { apiKey: 'resolved' },
				isDynamic: false,
			});

			const additionalDataWithoutCredentials = {
				...mockAdditionalData,
				executionContext: {
					version: 1,
					establishedAt: Date.now(),
					source: 'manual' as const,
					// credentials is undefined
				},
			};

			const result = await credentialsHelper.getDecrypted(
				additionalDataWithoutCredentials,
				nodeCredentials,
				credentialType,
				'manual',
				undefined,
				true,
			);

			// Resolution should not happen when credentials context is missing in manual mode
			expect(mockCredentialResolutionProvider.resolveIfNeeded).not.toHaveBeenCalled();
			// Should return static decrypted data
			expect(result).toEqual({ apiKey: 'static-key' });
		});

		test('should skip resolution in a subworkflow when rootExecutionMode is manual', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: { apiKey: 'dynamic-key' },
				isDynamic: true,
			});

			// Simulates a subworkflow: local mode is 'integrated' but root was 'manual'
			const subworkflowAdditionalData = {
				...mockAdditionalData,
				executionContext: undefined,
				rootExecutionMode: 'manual' as const,
			};

			const result = await credentialsHelper.getDecrypted(
				subworkflowAdditionalData,
				nodeCredentials,
				credentialType,
				'integrated',
				undefined,
				true,
			);

			expect(mockCredentialResolutionProvider.resolveIfNeeded).not.toHaveBeenCalled();
			expect(result).toEqual({ apiKey: 'static-key' });
		});

		test('should throw when dynamic credential cannot be resolved in non-manual mode (no execution context)', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);

			const { CredentialResolutionError } = await import(
				'@/modules/dynamic-credentials.ee/errors/credential-resolution.error'
			);

			const resolvableCredentialEntity = {
				...mockCredentialEntity,
				isResolvable: true,
				resolverId: 'resolver-123',
			} as CredentialsEntity;

			credentialsRepository.findOneByOrFail.mockResolvedValue(resolvableCredentialEntity);
			mockCredentialResolutionProvider.resolveIfNeeded.mockRejectedValue(
				new CredentialResolutionError(
					'Cannot resolve dynamic credentials without execution context for "Test Credentials"',
				),
			);

			await expect(
				credentialsHelper.getDecrypted(
					{ ...mockAdditionalData, executionContext: undefined },
					nodeCredentials,
					credentialType,
					'webhook',
					undefined,
					true,
				),
			).rejects.toThrow(CredentialResolutionError);

			expect(mockCredentialResolutionProvider.resolveIfNeeded).toHaveBeenCalledTimes(1);
		});

		test('should throw when dynamic credential cannot be resolved in non-manual mode (no credentials in context)', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);

			const { CredentialResolutionError } = await import(
				'@/modules/dynamic-credentials.ee/errors/credential-resolution.error'
			);

			const resolvableCredentialEntity = {
				...mockCredentialEntity,
				isResolvable: true,
				resolverId: 'resolver-123',
			} as CredentialsEntity;

			credentialsRepository.findOneByOrFail.mockResolvedValue(resolvableCredentialEntity);
			mockCredentialResolutionProvider.resolveIfNeeded.mockRejectedValue(
				new CredentialResolutionError(
					'Cannot resolve dynamic credentials without execution context for "Test Credentials"',
				),
			);

			const additionalDataWithEmptyContext = {
				...mockAdditionalData,
				executionContext: {
					version: 1 as const,
					establishedAt: Date.now(),
					source: 'webhook' as const,
					// credentials is undefined
				},
			};

			await expect(
				credentialsHelper.getDecrypted(
					additionalDataWithEmptyContext,
					nodeCredentials,
					credentialType,
					'webhook',
					undefined,
					true,
				),
			).rejects.toThrow(CredentialResolutionError);

			// Verify static credentials were NOT used as a fallback
			expect(mockCredentialResolutionProvider.resolveIfNeeded).toHaveBeenCalledTimes(1);
		});

		test('should handle missing workflowSettings gracefully', async () => {
			dynamicCredentialProxy.setResolverProvider(mockCredentialResolutionProvider);
			mockCredentialResolutionProvider.resolveIfNeeded.mockResolvedValue({
				data: { apiKey: 'resolved' },
				isDynamic: false,
			});

			const additionalDataWithoutSettings = {
				...mockAdditionalData,
				workflowSettings: undefined,
			};

			await credentialsHelper.getDecrypted(
				additionalDataWithoutSettings,
				nodeCredentials,
				credentialType,
				'trigger',
				undefined,
				true,
			);

			const call = mockCredentialResolutionProvider.resolveIfNeeded.mock.calls[0];
			expect(call[2]).toBe(additionalDataWithoutSettings.executionContext);
			expect(call[3]).toBeUndefined(); // workflowSettings
		});
	});

	describe('isCredentialUsableByNode', () => {
		const buildHelper = (credentialTypes: CredentialTypes) =>
			new CredentialsHelper(
				credentialTypes,
				mock<CredentialsOverwrites>(),
				mock<CredentialsRepository>(),
				mock<DynamicCredentialsProxy>(),
				mock<SecretsProviderConnectionRepository>(),
				mock<LicenseState>(),
				mock<ExternalSecretsConfig>(),
				mock<AiGatewayService>(),
			);

		// The loader sets the class's `supportedNodes` to short names (e.g. "restrictedConsumer");
		// the FQ list (matching `nodeType`) comes from `credentialTypes.getSupportedNodes`.
		// Mocks split the two so the FQ-vs-short bug stays caught.
		const mockType = (overrides: Partial<ICredentialType>): ICredentialType =>
			({ name: 'restrictedApi', ...overrides }) as ICredentialType;

		const buildCredentialTypes = (typeDef: ICredentialType, supportedNodes: string[] = []) => {
			const credentialTypes = mock<CredentialTypes>();
			credentialTypes.getByName.mockReturnValue(typeDef);
			credentialTypes.getSupportedNodes.mockReturnValue(supportedNodes);
			return credentialTypes;
		};

		it('returns true when the credential type does not opt into restriction', () => {
			// no restrictToSupportedNodes — FQ list shouldn't even be consulted
			const credentialTypes = buildCredentialTypes(
				mockType({ supportedNodes: ['restrictedConsumer'] }),
				['n8n-nodes-base.restrictedConsumer'],
			);

			expect(
				buildHelper(credentialTypes).isCredentialUsableByNode(
					'restrictedApi',
					'n8n-nodes-base.httpRequest',
				),
			).toBe(true);
		});

		it('returns true when restricted and the node is in supportedNodes', () => {
			const credentialTypes = buildCredentialTypes(
				mockType({
					restrictToSupportedNodes: true,
					supportedNodes: ['restrictedConsumer'],
				}),
				['n8n-nodes-base.restrictedConsumer'],
			);

			expect(
				buildHelper(credentialTypes).isCredentialUsableByNode(
					'restrictedApi',
					'n8n-nodes-base.restrictedConsumer',
				),
			).toBe(true);
		});

		it('returns false when restricted and the node is NOT in supportedNodes', () => {
			const credentialTypes = buildCredentialTypes(
				mockType({
					restrictToSupportedNodes: true,
					supportedNodes: ['restrictedConsumer'],
				}),
				['n8n-nodes-base.restrictedConsumer'],
			);

			expect(
				buildHelper(credentialTypes).isCredentialUsableByNode(
					'restrictedApi',
					'n8n-nodes-base.httpRequest',
				),
			).toBe(false);
		});

		it('returns false when restricted and the FQ supportedNodes list is empty (fail-safe)', () => {
			const credentialTypes = buildCredentialTypes(
				mockType({ restrictToSupportedNodes: true }), // no supportedNodes
				[],
			);

			expect(
				buildHelper(credentialTypes).isCredentialUsableByNode(
					'restrictedApi',
					'n8n-nodes-base.restrictedConsumer',
				),
			).toBe(false);
		});

		it('returns true when the credential type is unknown (caller surfaces the real error)', () => {
			const credentialTypes = mock<CredentialTypes>();
			credentialTypes.getByName.mockImplementation(() => {
				throw new Error('Unknown credential type');
			});

			expect(
				buildHelper(credentialTypes).isCredentialUsableByNode('missing', 'n8n-nodes-base.anything'),
			).toBe(true);
		});
	});

	describe('credential isolation per workflow (GHC-7550)', () => {
		const credentialType = 'communityApi';

		const credentialDataA = { apiKey: 'key_account_A', accountId: 'pn_A' };
		const credentialDataB = { apiKey: 'key_account_B', accountId: 'pn_B' };

		const credEntityA = {
			id: 'cred-aaa',
			name: 'Account A Credential',
			type: credentialType,
			data: cipher.encrypt(credentialDataA),
			isResolvable: false,
			resolverId: null,
		} as CredentialsEntity;

		const credEntityB = {
			id: 'cred-bbb',
			name: 'Account B Credential',
			type: credentialType,
			data: cipher.encrypt(credentialDataB),
			isResolvable: false,
			resolverId: null,
		} as CredentialsEntity;

		const additionalData = {
			executionContext: undefined,
			workflowSettings: undefined,
			rootExecutionMode: 'manual',
		} as any;

		beforeEach(() => {
			vi.clearAllMocks();
			dynamicCredentialProxy.setResolverProvider(undefined as any);

			credentialsRepository.findOneByOrFail.mockImplementation(async (query: any) => {
				if (query.id === 'cred-aaa' && query.type === credentialType) return credEntityA;
				if (query.id === 'cred-bbb' && query.type === credentialType) return credEntityB;
				throw new EntityNotFoundError(CredentialsEntity, query);
			});
		});

		test('should return correct data for credential A when queried with ID A', async () => {
			const result = await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-aaa', name: 'Account A Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);

			expect(result).toEqual(credentialDataA);
			expect(result.apiKey).toBe('key_account_A');
			expect(result.accountId).toBe('pn_A');
		});

		test('should return correct data for credential B when queried with ID B', async () => {
			const result = await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-bbb', name: 'Account B Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);

			expect(result).toEqual(credentialDataB);
			expect(result.apiKey).toBe('key_account_B');
			expect(result.accountId).toBe('pn_B');
		});

		test('should isolate credentials when resolved sequentially (A then B then A)', async () => {
			const resultA1 = await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-aaa', name: 'Account A Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);

			const resultB = await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-bbb', name: 'Account B Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);

			const resultA2 = await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-aaa', name: 'Account A Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);

			expect(resultA1.apiKey).toBe('key_account_A');
			expect(resultB.apiKey).toBe('key_account_B');
			expect(resultA2.apiKey).toBe('key_account_A');
			expect(resultA1).toEqual(resultA2);
			expect(resultA1).not.toEqual(resultB);
		});

		test('should isolate credentials in production mode (non-manual)', async () => {
			const prodAdditionalData = {
				executionContext: undefined,
				workflowSettings: undefined,
				rootExecutionMode: undefined,
			} as any;

			const resultA = await credentialsHelper.getDecrypted(
				prodAdditionalData,
				{ id: 'cred-aaa', name: 'Account A Credential' },
				credentialType,
				'trigger',
				undefined,
				true,
			);

			const resultB = await credentialsHelper.getDecrypted(
				prodAdditionalData,
				{ id: 'cred-bbb', name: 'Account B Credential' },
				credentialType,
				'trigger',
				undefined,
				true,
			);

			expect(resultA.apiKey).toBe('key_account_A');
			expect(resultB.apiKey).toBe('key_account_B');
		});

		test('should isolate credentials when resolved concurrently', async () => {
			const [resultA, resultB] = await Promise.all([
				credentialsHelper.getDecrypted(
					additionalData,
					{ id: 'cred-aaa', name: 'Account A Credential' },
					credentialType,
					'manual',
					undefined,
					true,
				),
				credentialsHelper.getDecrypted(
					additionalData,
					{ id: 'cred-bbb', name: 'Account B Credential' },
					credentialType,
					'manual',
					undefined,
					true,
				),
			]);

			expect(resultA.apiKey).toBe('key_account_A');
			expect(resultB.apiKey).toBe('key_account_B');
		});

		test('should use credential ID for lookup, not credential name', async () => {
			await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-aaa', name: 'Account A Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);

			expect(credentialsRepository.findOneByOrFail).toHaveBeenCalledWith({
				id: 'cred-aaa',
				type: credentialType,
			});
		});

		test('credential B save should not affect subsequent resolution of credential A', async () => {
			const resultA_before = await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-aaa', name: 'Account A Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);

			// Simulate saving credential B with updated data (re-encrypt with new values)
			const updatedDataB = { apiKey: 'key_account_B_UPDATED', accountId: 'pn_B_UPDATED' };
			credEntityB.data = cipher.encrypt(updatedDataB);

			const resultA_after = await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-aaa', name: 'Account A Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);

			expect(resultA_before.apiKey).toBe('key_account_A');
			expect(resultA_after.apiKey).toBe('key_account_A');
			expect(resultA_before).toEqual(resultA_after);

			// Verify B returns updated data
			const resultB = await credentialsHelper.getDecrypted(
				additionalData,
				{ id: 'cred-bbb', name: 'Account B Credential' },
				credentialType,
				'manual',
				undefined,
				true,
			);
			expect(resultB.apiKey).toBe('key_account_B_UPDATED');
		});
	});

	describe('preAuthentication token caching', () => {
		// Proves the framework performs the JWT login only when the cached token is
		// missing or expired, so chained Salesforce actions reuse one session instead
		// of authenticating on every request. The login is the credential's
		// `preAuthentication` hook, which we observe through a counting token request.
		const { privateKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			publicKeyEncoding: { type: 'spki', format: 'pem' },
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
		});

		const salesforceJwt = new SalesforceJwtApi();

		const node: INode = {
			id: 'uuid-sf',
			name: 'Salesforce',
			type: 'n8n-nodes-base.salesforce',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { salesforceJwtApi: { id: 'sf-cred', name: 'Salesforce JWT' } },
		};

		const helpers = mock<IHttpRequestHelper>();
		let updateSpy: MockInstance;
		let credentials: ICredentialDataDecryptedObject;

		beforeEach(() => {
			vi.clearAllMocks();
			mockNodesAndCredentials.getCredential
				.calledWith('salesforceJwtApi')
				.mockReturnValue({ type: salesforceJwt, sourcePath: '' });

			let logins = 0;
			// eslint-disable-next-line @typescript-eslint/require-await
			mockTokenRequest.mockImplementation(async () => ({
				access_token: `TOKEN_${++logins}`,
				instance_url: 'https://acme.my.salesforce.com',
			}));

			// Stub persistence so the test does not touch the DB. The returned token is
			// what the request helper merges back into the in-memory credentials for the
			// next request (see httpRequestWithAuthentication).
			updateSpy = vi.spyOn(credentialsHelper, 'updateCredentials').mockResolvedValue();

			credentials = {
				accessToken: '',
				instanceUrl: '',
				clientId: 'connected-app-client-id',
				username: 'user@example.com',
				privateKey,
				environment: 'production',
			};
		});

		afterEach(() => updateSpy.mockRestore());

		test('logs in once and reuses the cached token across requests', async () => {
			// Request 1: no cached token → exactly one login.
			const first = await credentialsHelper.preAuthentication(
				helpers,
				credentials,
				'salesforceJwtApi',
				node,
				false,
			);

			expect(mockTokenRequest).toHaveBeenCalledTimes(1);
			expect(mockTokenRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://login.salesforce.com/services/oauth2/token',
				}),
			);
			expect(first).toMatchObject({
				accessToken: 'TOKEN_1',
				instanceUrl: 'https://acme.my.salesforce.com',
			});
			// The token would be persisted so the next request reads it back.
			expect(updateSpy).toHaveBeenCalledTimes(1);

			// preAuthentication merges the token into the in-memory credentials, exactly
			// as the request helper does before the next request.
			Object.assign(credentials, first);

			// Requests 2 and 3 already have a token → no further logins.
			const second = await credentialsHelper.preAuthentication(
				helpers,
				credentials,
				'salesforceJwtApi',
				node,
				false,
			);
			const third = await credentialsHelper.preAuthentication(
				helpers,
				credentials,
				'salesforceJwtApi',
				node,
				false,
			);

			expect(second).toBeUndefined();
			expect(third).toBeUndefined();
			// Still only the single login from request 1 across all three requests.
			expect(mockTokenRequest).toHaveBeenCalledTimes(1);
		});

		test('re-authenticates when the cached token is reported expired (e.g. after a 401)', async () => {
			await credentialsHelper.preAuthentication(
				helpers,
				credentials,
				'salesforceJwtApi',
				node,
				false,
			);
			expect(mockTokenRequest).toHaveBeenCalledTimes(1);
			expect(credentials.accessToken).toBe('TOKEN_1');

			// credentialsExpired = true mirrors the request helper's retry after a 401.
			const refreshed = await credentialsHelper.preAuthentication(
				helpers,
				credentials,
				'salesforceJwtApi',
				node,
				true,
			);

			expect(mockTokenRequest).toHaveBeenCalledTimes(2);
			expect(refreshed).toMatchObject({ accessToken: 'TOKEN_2' });
		});
	});
});

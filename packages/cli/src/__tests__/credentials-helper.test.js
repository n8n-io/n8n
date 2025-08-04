'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const credential_types_1 = require('@/credential-types');
const credentials_helper_1 = require('@/credentials-helper');
const credential_not_found_error_1 = require('@/errors/credential-not-found.error');
describe('CredentialsHelper', () => {
	const nodeTypes = (0, jest_mock_extended_1.mock)();
	const mockNodesAndCredentials = (0, jest_mock_extended_1.mock)();
	const credentialsRepository = (0, jest_mock_extended_1.mock)();
	const cipher = new n8n_core_1.Cipher(
		(0, jest_mock_extended_1.mock)({ encryptionKey: 'test_key_for_testing' }),
	);
	di_1.Container.set(n8n_core_1.Cipher, cipher);
	const credentialsHelper = new credentials_helper_1.CredentialsHelper(
		new credential_types_1.CredentialTypes(mockNodesAndCredentials),
		(0, jest_mock_extended_1.mock)(),
		credentialsRepository,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	describe('getCredentials', () => {
		test('turns `EntityNotFoundError` into `CredentialNotFoundError`s', async () => {
			credentialsRepository.findOneByOrFail.mockRejectedValueOnce(
				new typeorm_1.EntityNotFoundError(db_1.CredentialsEntity, 'foo'),
			);
			await expect(
				credentialsHelper.getCredentials({ id: '1', name: 'foo' }, 'bar'),
			).rejects.toThrow(credential_not_found_error_1.CredentialNotFoundError);
		});
		test('passes other error through', async () => {
			const errorMessage = 'Connection terminated due to connection timeout';
			credentialsRepository.findOneByOrFail.mockRejectedValueOnce(new Error(errorMessage));
			await expect(
				credentialsHelper.getCredentials({ id: '1', name: 'foo' }, 'bar'),
			).rejects.toThrow(errorMessage);
		});
	});
	describe('authenticate', () => {
		const tests = [
			{
				description: 'basicAuth, default property names',
				input: {
					credentials: {
						user: 'user1',
						password: 'password1',
					},
					credentialType: new (class TestApi {
						constructor() {
							this.name = 'testApi';
							this.displayName = 'Test API';
							this.properties = [
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
							this.authenticate = {
								type: 'generic',
								properties: {
									auth: {
										username: '={{$credentials.user}}',
										password: '={{$credentials.password}}',
									},
								},
							};
						}
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
					credentialType: new (class TestApi {
						constructor() {
							this.name = 'testApi';
							this.displayName = 'Test API';
							this.properties = [
								{
									displayName: 'Access Token',
									name: 'accessToken',
									type: 'string',
									default: '',
								},
							];
							this.authenticate = {
								type: 'generic',
								properties: {
									headers: {
										Authorization: '=Bearer {{$credentials.accessToken}}',
									},
								},
							};
						}
					})(),
				},
				output: {
					url: '',
					headers: {
						Authorization: 'Bearer test',
					},
					qs: {},
				},
			},
			{
				description: 'headerAuth, key and value expressions',
				input: {
					credentials: {
						accessToken: 'test',
					},
					credentialType: new (class TestApi {
						constructor() {
							this.name = 'testApi';
							this.displayName = 'Test API';
							this.properties = [
								{
									displayName: 'Access Token',
									name: 'accessToken',
									type: 'string',
									default: '',
								},
							];
							this.authenticate = {
								type: 'generic',
								properties: {
									headers: {
										'={{$credentials.accessToken}}': '=Bearer {{$credentials.accessToken}}',
									},
								},
							};
						}
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
					credentialType: new (class TestApi {
						constructor() {
							this.name = 'testApi';
							this.displayName = 'Test API';
							this.properties = [
								{
									displayName: 'Access Token',
									name: 'accessToken',
									type: 'string',
									default: '',
								},
							];
							this.authenticate = {
								type: 'generic',
								properties: {
									qs: {
										accessToken: '={{$credentials.accessToken}}',
									},
								},
							};
						}
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
					credentialType: new (class TestApi {
						constructor() {
							this.name = 'testApi';
							this.displayName = 'Test API';
							this.properties = [
								{
									displayName: 'My Token',
									name: 'myToken',
									type: 'string',
									default: '',
								},
							];
						}
						async authenticate(credentials, requestOptions) {
							requestOptions.headers.Authorization = `Bearer ${credentials.accessToken}`;
							requestOptions.qs.user = credentials.user;
							return requestOptions;
						}
					})(),
				},
				output: {
					url: '',
					headers: {
						Authorization: 'Bearer test',
					},
					qs: { user: 'testUser' },
				},
			},
		];
		const node = {
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
		const workflow = new n8n_workflow_1.Workflow({
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
					(0, n8n_workflow_1.deepCopy)(incomingRequestOptions),
					workflow,
					node,
				);
				expect(result).toEqual(testData.output);
			});
		}
	});
	describe('updateCredentialsOauthTokenData', () => {
		test('only updates oauthTokenData field while preserving other credential fields', async () => {
			const nodeCredentials = {
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
			credentialsRepository.findOneByOrFail.mockResolvedValue(mockCredentialEntity);
			const beforeUpdateTime = new Date();
			await credentialsHelper.updateCredentialsOauthTokenData(
				nodeCredentials,
				'oAuth2Api',
				newOauthTokenData,
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
			const updatedAt = updatedCredentialData.updatedAt;
			expect(updatedAt).toBeInstanceOf(Date);
			expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdateTime.getTime());
			const decryptedUpdatedData = cipher.decrypt(updatedCredentialData.data);
			const parsedUpdatedData = (0, n8n_workflow_1.jsonParse)(decryptedUpdatedData);
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
	});
});
//# sourceMappingURL=credentials-helper.test.js.map

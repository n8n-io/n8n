import { CredentialsEntity, type CredentialsRepository } from '@n8n/db';
import { EntityNotFoundError } from '@n8n/typeorm';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INode,
	INodeProperties,
	INodeTypes,
	INodeCredentialsDetails,
} from 'n8n-workflow';
import { deepCopy, Workflow } from 'n8n-workflow';
import { type InstanceSettings, Cipher } from 'n8n-core';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

describe('CredentialsHelper', () => {
	const nodeTypes = mock<INodeTypes>();
	const mockNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const credentialsRepository = mock<CredentialsRepository>();

	// Setup cipher for testing
	const cipher = new Cipher(mock<InstanceSettings>({ encryptionKey: 'test_key_for_testing' }));
	Container.set(Cipher, cipher);

	const credentialsHelper = new CredentialsHelper(
		new CredentialTypes(mockNodesAndCredentials),
		mock(),
		credentialsRepository,
		mock(),
		mock(),
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
	});
});

import { mock } from 'jest-mock-extended';
import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INode,
	INodeProperties,
	INodeTypes,
} from 'n8n-workflow';
import { deepCopy, Workflow } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

describe('CredentialsHelper', () => {
	const nodeTypes = mock<INodeTypes>();
	const mockNodesAndCredentials = mock<LoadNodesAndCredentials>();

	const credentialsHelper = new CredentialsHelper(
		new CredentialTypes(mockNodesAndCredentials),
		mock(),
		mock(),
		mock(),
		mock(),
	);

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
});

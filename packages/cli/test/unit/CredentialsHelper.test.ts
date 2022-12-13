import {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INode,
	INodeProperties,
	INodesAndCredentials,
	Workflow,
} from 'n8n-workflow';
import { CredentialsHelper } from '@/CredentialsHelper';
import { CredentialTypes } from '@/CredentialTypes';
import * as Helpers from './Helpers';

const TEST_ENCRYPTION_KEY = 'test';
const mockNodesAndCredentials: INodesAndCredentials = {
	loaded: { nodes: {}, credentials: {} },
	known: { nodes: {}, credentials: {} },
};

describe('CredentialsHelper', () => {
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
							requestOptions.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;
							requestOptions.qs!['user'] = credentials.user;
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

		const nodeTypes = Helpers.NodeTypes();

		const workflow = new Workflow({
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes,
		});

		const timezone = 'America/New_York';

		for (const testData of tests) {
			test(testData.description, async () => {
				mockNodesAndCredentials.loaded.credentials = {
					[testData.input.credentialType.name]: {
						type: testData.input.credentialType,
						sourcePath: '',
					},
				};

				const credentialTypes = CredentialTypes(mockNodesAndCredentials);

				const credentialsHelper = new CredentialsHelper(
					TEST_ENCRYPTION_KEY,
					credentialTypes,
					nodeTypes,
				);

				const result = await credentialsHelper.authenticate(
					testData.input.credentials,
					testData.input.credentialType.name,
					JSON.parse(JSON.stringify(incomingRequestOptions)),
					workflow,
					node,
					timezone,
				);

				expect(result).toEqual(testData.output);
			});
		}
	});
});

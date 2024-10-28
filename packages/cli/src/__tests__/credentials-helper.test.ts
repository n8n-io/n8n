import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INode,
	INodeProperties,
} from 'n8n-workflow';
import { NodeConnectionType, deepCopy } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';
import Container from 'typedi';

import { CredentialsHelper } from '@/credentials-helper';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { mockInstance } from '@test/mocking';

describe('CredentialsHelper', () => {
	mockInstance(CredentialsRepository);
	mockInstance(SharedCredentialsRepository);
	const mockNodesAndCredentials = mockInstance(LoadNodesAndCredentials, {
		loadedNodes: {
			'test.set': {
				sourcePath: '',
				type: {
					description: {
						displayName: 'Set',
						name: 'set',
						group: ['input'],
						version: 1,
						description: 'Sets a value',
						defaults: {
							name: 'Set',
							color: '#0000FF',
						},
						inputs: [NodeConnectionType.Main],
						outputs: [NodeConnectionType.Main],
						properties: [
							{
								displayName: 'Value1',
								name: 'value1',
								type: 'string',
								default: 'default-value1',
							},
							{
								displayName: 'Value2',
								name: 'value2',
								type: 'string',
								default: 'default-value2',
							},
						],
					},
				},
			},
		},
	});

	const nodeTypes = mockInstance(NodeTypes);

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
				//@ts-expect-error `loadedCredentials` is a getter and we are replacing it here with a property
				mockNodesAndCredentials.loadedCredentials = {
					[testData.input.credentialType.name]: {
						type: testData.input.credentialType,
						sourcePath: '',
					},
				};

				const credentialsHelper = Container.get(CredentialsHelper);

				const result = await credentialsHelper.authenticate(
					testData.input.credentials,
					testData.input.credentialType.name,
					deepCopy(incomingRequestOptions),
					workflow,
					node,
				);

				expect(result).toEqual(testData.output);
			});
		}
	});
});

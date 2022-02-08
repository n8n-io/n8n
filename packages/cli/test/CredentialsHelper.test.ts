import { CredentialsHelper, CredentialTypes } from '../src';
import * as Helpers from './Helpers';
import {
	IAuthenticateBasicAuth,
	IAuthenticateBearer,
	IAuthenticateHeaderAuth,
	IAuthenticateQueryAuth,
	ICredentialDataDecryptedObject,
	ICredentialType,
	ICredentialTypeData,
	IHttpRequestOptions,
	INode,
	INodeProperties,
	Workflow,
} from 'n8n-workflow';

const TEST_ENCRYPTION_KEY = 'test';

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
				description: 'built-in basicAuth, default property names',
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

						authenticate = {
							type: 'basicAuth',
							properties: {},
						} as IAuthenticateBasicAuth;
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
				description: 'built-in basicAuth, custom property names',
				input: {
					credentials: {
						customUser: 'user2',
						customPassword: 'password2',
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

						authenticate = {
							type: 'basicAuth',
							properties: {
								userPropertyName: 'customUser',
								passwordPropertyName: 'customPassword',
							},
						} as IAuthenticateBasicAuth;
					})(),
				},
				output: {
					url: '',
					headers: {},
					auth: { username: 'user2', password: 'password2' },
					qs: {},
				},
			},
			{
				description: 'built-in headerAuth',
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
							type: 'headerAuth',
							properties: {
								name: 'Authorization',
								value: '=Bearer {{$credentials.accessToken}}',
							},
						} as IAuthenticateHeaderAuth;
					})(),
				},
				output: { url: '', headers: { Authorization: 'Bearer test' }, qs: {} },
			},
			{
				description: 'built-in bearer, default property name',
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
							type: 'bearer',
							properties: {},
						} as IAuthenticateBearer;
					})(),
				},
				output: { url: '', headers: { Authorization: 'Bearer test' }, qs: {} },
			},
			{
				description: 'built-in bearer, custom property name',
				input: {
					credentials: {
						myToken: 'test',
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

						authenticate = {
							type: 'bearer',
							properties: {
								tokenPropertyName: 'myToken',
							},
						} as IAuthenticateBearer;
					})(),
				},
				output: { url: '', headers: { Authorization: 'Bearer test' }, qs: {} },
			},
			{
				description: 'built-in queryAuth',
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
							type: 'queryAuth',
							properties: {
								key: 'accessToken',
								value: '={{$credentials.accessToken}}',
							},
						} as IAuthenticateQueryAuth;
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

		for (const testData of tests) {
			test(testData.description, async () => {
				const credentialTypes: ICredentialTypeData = {
					[testData.input.credentialType.name]: {
						type: testData.input.credentialType,
						sourcePath: '',
					},
				};

				await CredentialTypes().init(credentialTypes);

				const credentialsHelper = new CredentialsHelper(TEST_ENCRYPTION_KEY);

				const result = await credentialsHelper.authenticate(
					testData.input.credentials,
					testData.input.credentialType.name,
					JSON.parse(JSON.stringify(incomingRequestOptions)),
					workflow,
					node,
				);

				expect(result).toEqual(testData.output);
			});
		}
	});
});

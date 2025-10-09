import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { SharedCredentials } from '@n8n/db';
import type {
	INode,
	INodeCredentials,
	INodeParameters,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import { buildWebhookPath, getWebhookDetails } from '../tools/webhook-utils';

import { CredentialsService } from '@/credentials/credentials.service';

const mockCredentialsService = (
	impl: (id: string) => ICredentialDataDecryptedObject | Promise<ICredentialDataDecryptedObject>,
): CredentialsService =>
	mockInstance(CredentialsService, {
		async getOne(_user: User, id: string, _includeDecryptedData: boolean) {
			const data = await impl(id);
			return {
				name: 'MockCredentialsService',
				type: 'mock',
				shared: [] as SharedCredentials[],
				isManaged: false,
				id,
				// Methods present on entities via WithTimestampsAndStringId mixin
				generateId() {},
				createdAt: new Date(),
				updatedAt: new Date(),
				setUpdateDate() {},
				data,
			};
		},
	});

const createWebhookNode = (
	overrides: Partial<INode> & { parameters?: INodeParameters; credentials?: INodeCredentials } = {},
): INode => {
	const base: INode = {
		id: '1',
		name: 'Webhook',
		type: WEBHOOK_NODE_TYPE,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	return { ...base, ...overrides };
};

const createUser = (overrides: Partial<User> = {}): User => {
	const u = new User();
	u.id = 'user-id';
	Object.assign(u, overrides);
	return u;
};

describe('buildWebhookPath', () => {
	it('joins clean segment and path', () => {
		expect(buildWebhookPath('webhook', 'hook')).toBe('/webhook/hook');
	});

	it('strips leading and trailing slashes from segment', () => {
		expect(buildWebhookPath('/custom/hooks/', 'test')).toBe('/custom/hooks/test');
	});

	it('handles empty segment', () => {
		expect(buildWebhookPath('', 'path')).toBe('/path');
	});

	it('retains trailing slash when node path is empty', () => {
		expect(buildWebhookPath('webhook', '')).toBe('/webhook/');
	});
});

describe('getWebhookDetails', () => {
	const NO_WEBHOOKS_MESSAGE =
		'This workflow does not have a trigger node that can be executed via MCP.';
	const user = createUser();
	const baseUrl = 'https://example.com';
	const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

	it('handles no webhook nodes', async () => {
		const res = await getWebhookDetails(
			user,
			[],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(res).toEqual(NO_WEBHOOKS_MESSAGE);
	});

	it('describes a basic webhook without auth', async () => {
		const node = createWebhookNode({
			name: 'My Webhook',
			parameters: { path: 'hook', httpMethod: 'POST' },
		});
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(res).toContain('Node name: My Webhook');
		expect(res).toContain('Base URL: https://example.com');
		expect(res).toContain('Production path: /webhook/hook');
		expect(res).toContain('Test path: /webhook-test/hook');
		expect(res).toContain('HTTP Method: POST');
		expect(res).toContain('respond immediately');
		expect(res).toContain('No credentials required');
	});

	it('uses test url when workflow is inactive', async () => {
		const node = createWebhookNode({ parameters: { path: 'test' } });
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(res).toContain('Production path: /webhook/test');
		expect(res).toContain('Test path: /webhook-test/test');
	});

	it('describes basicAuth requirement', async () => {
		const node = createWebhookNode({ parameters: { authentication: 'basicAuth', path: 'a' } });
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(res).toContain('basic authentication');
	});

	it('describes headerAuth with header name', async () => {
		const node = createWebhookNode({
			parameters: { authentication: 'headerAuth', path: 'a' },
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'HeaderAuth' } },
		});
		const credsService = mockCredentialsService((id) => {
			expect(id).toBe('cred-1');
			return { name: 'X-API-Key', value: 'secret' };
		});
		const res = await getWebhookDetails(user, [node], baseUrl, credsService, endpoints);
		expect(res).toContain('requires a header with name "X-API-Key"');
	});

	it('describes jwtAuth with shared secret', async () => {
		const node = createWebhookNode({
			parameters: { authentication: 'jwtAuth', path: 'a' },
			credentials: { jwtAuth: { id: 'cred-2', name: 'JwtAuth' } },
		});
		const credsService = mockCredentialsService((id) => {
			expect(id).toBe('cred-2');
			return { secret: 'super-secret', keyType: 'passphrase' };
		});
		const res = await getWebhookDetails(user, [node], baseUrl, credsService, endpoints);
		expect(res).toContain('requires a JWT secret');
	});

	it('describes jwtAuth with PEM keys', async () => {
		const node = createWebhookNode({
			parameters: { authentication: 'jwtAuth', path: 'a' },
			credentials: { jwtAuth: { id: 'cred-3', name: 'JwtAuth' } },
		});
		const credsService = mockCredentialsService((id) => {
			expect(id).toBe('cred-3');
			return { keyType: 'pemKey', privateKey: 'priv', publicKey: 'pub' };
		});
		const res = await getWebhookDetails(user, [node], baseUrl, credsService, endpoints);
		expect(res).toContain('requires JWT private and public keys');
	});

	it('describes responseNode response mode', async () => {
		const node = createWebhookNode({ parameters: { responseMode: 'responseNode' } });
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(res).toContain('respond using "Respond to Webhook" node');
	});

	it('describes lastNode response mode variants', async () => {
		const nodeAll = createWebhookNode({
			parameters: { responseMode: 'lastNode', responseData: 'allEntries' },
		});
		const resAll = await getWebhookDetails(
			user,
			[nodeAll],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(resAll).toContain('Returns all the entries of the last node');

		const nodeBin = createWebhookNode({
			parameters: { responseMode: 'lastNode', responseData: 'firstEntryBinary' },
		});
		const resBin = await getWebhookDetails(
			user,
			[nodeBin],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(resBin).toContain('Returns the binary data of the first entry of the last node');

		const nodeNo = createWebhookNode({
			parameters: { responseMode: 'lastNode', responseData: 'noData' },
		});
		const resNo = await getWebhookDetails(
			user,
			[nodeNo],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(resNo).toContain('Returns without a body');

		const nodeDefault = createWebhookNode({ parameters: { responseMode: 'lastNode' } });
		const resDefault = await getWebhookDetails(
			user,
			[nodeDefault],
			baseUrl,
			mockCredentialsService(() => ({})),
			endpoints,
		);
		expect(resDefault).toContain('Returns the JSON data of the first entry of the last node');
	});
});

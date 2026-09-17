import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { SharedCredentials } from '@n8n/db';
import type {
	INode,
	INodeCredentials,
	INodeParameters,
	INodeType,
	INodeTypes,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialsService } from '@/credentials/credentials.service';

import { getTriggerDetails, getWebhookDetails } from '../tools/webhook-utils';

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
				isGlobal: false,
				isResolvable: false,
				usageScope: 'project',
				resolverId: null,
				resolvableAllowFallback: false,
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

// Mirrors the Webhook node type, whose webhook description sets a static `isFullPath: true`
const nodeTypes = mock<INodeTypes>();
nodeTypes.getByNameAndVersion.mockReturnValue(
	mock<INodeType>({
		description: {
			webhooks: [
				{
					name: 'default',
					httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
					isFullPath: true,
					responseMode: '={{$parameter["responseMode"]}}',
					path: '={{$parameter["path"]}}',
				},
			],
		},
	}),
);

describe('getWebhookDetails', () => {
	const user = createUser();
	const baseUrl = 'https://example.com';
	const workflowId = 'wf-1';
	const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

	it('returns the URL without the webhookId segment for a standard webhook node', async () => {
		// Real webhook nodes always carry a webhookId; the URL must not include it (MCP-49)
		const node = createWebhookNode({
			webhookId: '3dd18038-ce87-4004-a6e8-5d4a3216066d',
			parameters: { path: 'codex-basic-webhook-test', httpMethod: 'POST' },
		});
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			nodeTypes,
			endpoints,
			workflowId,
		);
		expect(res).toContain('Production URL: https://example.com/webhook/codex-basic-webhook-test');
		expect(res).toContain('Test URL: https://example.com/webhook-test/codex-basic-webhook-test');
		expect(res).not.toContain('3dd18038-ce87-4004-a6e8-5d4a3216066d');
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
			nodeTypes,
			endpoints,
			workflowId,
		);
		expect(res).toContain('Node name: My Webhook');
		expect(res).toContain('Production URL: https://example.com/webhook/wf-1/my%20webhook/hook');
		expect(res).toContain('Test URL: https://example.com/webhook-test/wf-1/my%20webhook/hook');
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
			nodeTypes,
			endpoints,
			workflowId,
		);
		expect(res).toContain('Production URL: https://example.com/webhook/wf-1/webhook/test');
		expect(res).toContain('Test URL: https://example.com/webhook-test/wf-1/webhook/test');
	});

	it('uses a separate test base URL when provided', async () => {
		const node = createWebhookNode({ parameters: { path: 'hook' } });
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			nodeTypes,
			endpoints,
			workflowId,
			'https://editor.example.com',
		);
		expect(res).toContain('Production URL: https://example.com/webhook/wf-1/webhook/hook');
		expect(res).toContain('Test URL: https://editor.example.com/webhook-test/wf-1/webhook/hook');
	});

	it('describes basicAuth requirement', async () => {
		const node = createWebhookNode({ parameters: { authentication: 'basicAuth', path: 'a' } });
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			nodeTypes,
			endpoints,
			workflowId,
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
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			credsService,
			nodeTypes,
			endpoints,
			workflowId,
		);
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
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			credsService,
			nodeTypes,
			endpoints,
			workflowId,
		);
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
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			credsService,
			nodeTypes,
			endpoints,
			workflowId,
		);
		expect(res).toContain('requires JWT private and public keys');
	});

	it('degrades gracefully when a draft webhook node was persisted without a parameters key', async () => {
		// Regression (ADO-5355): drafts can hold skeleton nodes with no `parameters`
		// key at all; reading them must not crash get_workflow_details.
		const node = createWebhookNode({ webhookId: '3dd18038-ce87-4004-a6e8-5d4a3216066d' });
		delete (node as Partial<INode>).parameters;

		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			nodeTypes,
			endpoints,
			workflowId,
		);

		expect(res).toContain('Node name: Webhook');
		// Without a path parameter the URL falls back to the node's webhookId
		expect(res).toContain(
			'Production URL: https://example.com/webhook/3dd18038-ce87-4004-a6e8-5d4a3216066d',
		);
		expect(res).toContain(
			'Test URL: https://example.com/webhook-test/3dd18038-ce87-4004-a6e8-5d4a3216066d',
		);
		expect(res).toContain('HTTP Method: GET');
		expect(res).toContain('respond immediately');
		expect(res).toContain('No credentials required');
	});

	it('describes responseNode response mode', async () => {
		const node = createWebhookNode({ parameters: { responseMode: 'responseNode' } });
		const res = await getWebhookDetails(
			user,
			[node],
			baseUrl,
			mockCredentialsService(() => ({})),
			nodeTypes,
			endpoints,
			workflowId,
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
			nodeTypes,
			endpoints,
			workflowId,
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
			nodeTypes,
			endpoints,
			workflowId,
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
			nodeTypes,
			endpoints,
			workflowId,
		);
		expect(resNo).toContain('Returns without a body');

		const nodeDefault = createWebhookNode({ parameters: { responseMode: 'lastNode' } });
		const resDefault = await getWebhookDetails(
			user,
			[nodeDefault],
			baseUrl,
			mockCredentialsService(() => ({})),
			nodeTypes,
			endpoints,
			workflowId,
		);
		expect(resDefault).toContain('Returns the JSON data of the first entry of the last node');
	});
});

describe('getTriggerDetails', () => {
	const user = createUser();
	const baseUrl = 'https://example.com';
	const workflowId = 'wf-1';
	const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };
	const credentialsService = mockCredentialsService(() => ({}));

	const createTriggerNode = (overrides: Partial<INode> = {}): INode => ({
		id: '1',
		name: 'Gmail Trigger',
		type: 'n8n-nodes-base.gmailTrigger',
		typeVersion: 1.4,
		position: [0, 0],
		parameters: {},
		...overrides,
	});

	it('reports manual-only when the workflow has no triggers at all', async () => {
		const res = await getTriggerDetails(
			user,
			[],
			[],
			baseUrl,
			credentialsService,
			nodeTypes,
			endpoints,
			workflowId,
		);
		expect(res).toBe(
			'This workflow has no production triggers (Schedule, Webhook, Form, or Chat). It can only be executed in manual mode.',
		);
	});

	it('clarifies when the workflow has triggers that MCP cannot execute directly', async () => {
		const res = await getTriggerDetails(
			user,
			[],
			[createTriggerNode()],
			baseUrl,
			credentialsService,
			nodeTypes,
			endpoints,
			workflowId,
		);
		expect(res).toContain('not supported for direct execution through MCP: Gmail Trigger');
		expect(res).toContain('cannot be executed through MCP');
		expect(res).not.toContain('no production triggers');
		expect(res).not.toContain('manual mode');
	});

	it('does not crash when trigger nodes were persisted without a parameters key', async () => {
		// Regression (ADO-5355): same skeleton-node shape as the webhook case, for
		// the form trigger branch that reads parameters.formFields.
		const webhook = createWebhookNode();
		delete (webhook as Partial<INode>).parameters;
		const form = createTriggerNode({ name: 'Form Trigger', type: FORM_TRIGGER_NODE_TYPE });
		delete (form as Partial<INode>).parameters;

		const res = await getTriggerDetails(
			user,
			[webhook, form],
			[],
			baseUrl,
			credentialsService,
			nodeTypes,
			endpoints,
			workflowId,
		);

		expect(res).toContain('Node name: Webhook');
		expect(res).toContain('Node name: Form Trigger');
		expect(res).toContain('Form fields: "N/A"');
	});

	it('documents triggerNodeName and the execute_workflow payload for each trigger type', async () => {
		const webhook = createWebhookNode({ name: 'Webhook' });
		const chat = createTriggerNode({
			name: 'Chat Trigger',
			type: CHAT_TRIGGER_NODE_TYPE,
		});
		const form = createTriggerNode({
			name: 'Form Trigger',
			type: FORM_TRIGGER_NODE_TYPE,
			parameters: { formFields: { values: [{ fieldLabel: 'email' }] } },
		});
		const schedule = createTriggerNode({
			name: 'Schedule Trigger',
			type: SCHEDULE_TRIGGER_NODE_TYPE,
		});

		const res = await getTriggerDetails(
			user,
			[webhook, chat, form, schedule],
			[],
			baseUrl,
			credentialsService,
			nodeTypes,
			endpoints,
			workflowId,
		);

		expect(res).toContain(
			'{ triggerNodeName: "<node name>", inputs: { webhookData: { headers?, query?, body? } } }',
		);
		expect(res).toContain('{ triggerNodeName: "<node name>", inputs: { chatInput: "<message>" } }');
		expect(res).toContain(
			'{ triggerNodeName: "<node name>", inputs: { formData: { FIELD_NAME: VALUE } } }',
		);
		expect(res).not.toContain('formData: Array<');
		expect(res).toContain('{ triggerNodeName: "<node name>" }');
		expect(res).toContain('do not take inputs');
	});
});

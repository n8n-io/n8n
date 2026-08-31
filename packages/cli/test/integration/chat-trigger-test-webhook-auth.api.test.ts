/**
 * Authentication on Chat Trigger test webhooks (`/webhook-test/...`).
 *
 * A Chat Trigger's configured authentication applies to its test webhook the same way
 * it does in production. The one exemption is the editor's canvas chat: its registration
 * is rewritten to the session-scoped `{workflowId}/{chatSessionId}` route and flagged as
 * such by the backend, and only that flagged registration runs without webhook
 * credentials. A rejected request responds before any execution starts and leaves the
 * one-shot registration in place for a later authorized request.
 */

import {
	createWorkflow,
	mockInstance,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DirectoryLoader } from 'n8n-core';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type { INode, INodeType } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { agent as testAgent } from 'supertest';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CacheService } from '@/services/cache/cache.service';
import { Telemetry } from '@/telemetry';
import { TestWebhooks } from '@/webhooks/test-webhooks';
import { WebhookServer } from '@/webhooks/webhook-server';

import { saveCredential } from './shared/db/credentials';
import { createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import { initCredentialsTypes, setupTestServer } from './shared/utils';

mockInstance(Telemetry);

const testServer = setupTestServer({ endpointGroups: ['workflows'] });

const TRIGGER_NAME = 'When chat message received';
const BASIC_AUTH_USER = 'chat-user';
const BASIC_AUTH_PASSWORD = 'chat-password';

/**
 * The real Chat Trigger, out of the langchain package's dist. Required by absolute path
 * rather than imported (the package exports only its index), and registered under its own
 * package loader because node types resolve by the package prefix in their name. It has to
 * be the real node: its `webhook()` method is what applies the configured authentication.
 */
function registerChatTrigger() {
	const distPath = path.resolve(
		__dirname,
		'../../../@n8n/nodes-langchain/dist/nodes/trigger/ChatTrigger/ChatTrigger.node.js',
	);
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { ChatTrigger } = require(distPath) as { ChatTrigger: new () => INodeType };
	const loaded = { type: new ChatTrigger(), sourcePath: '' };
	const [packageName, nodeName] = CHAT_TRIGGER_NODE_TYPE.split('.');

	Container.get(LoadNodesAndCredentials).loaders[packageName] = {
		getNode: (nodeType: string) => {
			if (nodeType !== nodeName) throw new UnrecognizedNodeTypeError(packageName, nodeType);
			return loaded;
		},
		known: { nodes: {}, credentials: {} },
	} as unknown as DirectoryLoader;
}

let builder: User;
let webhookAgent: SuperAgentTest;
let webhookTestEndpoint: string;

const chatTriggerNode = (
	parameters: Record<string, unknown>,
	credential?: { id: string; name: string },
): INode => ({
	id: randomUUID(),
	name: TRIGGER_NAME,
	type: CHAT_TRIGGER_NODE_TYPE,
	typeVersion: 1.3,
	position: [0, 0],
	webhookId: randomUUID(),
	parameters: { public: true, mode: 'hostedChat', options: {}, ...parameters },
	...(credential ? { credentials: { httpBasicAuth: credential } } : {}),
});

const createChatWorkflow = async (trigger: INode) =>
	await createWorkflow({ active: false, nodes: [trigger], connections: {} }, builder);

const createBasicAuthCredential = async () =>
	await saveCredential(
		{
			...randomCredentialPayload({ type: 'httpBasicAuth' }),
			data: { user: BASIC_AUTH_USER, password: BASIC_AUTH_PASSWORD },
		},
		{ user: builder, role: 'credential:owner' },
	);

/** The editor registering the test webhook for this workflow's chat trigger. */
const startListening = async (workflowId: string, chatSessionId?: string) =>
	await testServer
		.authAgentFor(builder)
		.post(`/workflows/${workflowId}/run`)
		.send({
			triggerToStartFrom: { name: TRIGGER_NAME },
			...(chatSessionId ? { chatSessionId } : {}),
		});

const chatMessage = (sessionId = 'test-session') => ({
	action: 'sendMessage',
	chatInput: 'hello',
	sessionId,
});

const lastExecutionFor = async (workflowId: string) =>
	await Container.get(ExecutionRepository).findOne({
		where: { workflowId },
		order: { createdAt: 'DESC' },
	});

beforeAll(async () => {
	registerChatTrigger();
	await initCredentialsTypes();

	webhookTestEndpoint = Container.get(GlobalConfig).endpoints.webhookTest;

	await Container.get(CacheService).init();

	// `/webhook-test/*` is mounted only when a server opts into test webhooks, which the
	// production webhook process does not — the editor's own server does.
	class EditorFacingWebhookServer extends WebhookServer {
		constructor() {
			super();
			this.testWebhooksEnabled = true;
		}
	}

	const server = new EditorFacingWebhookServer();
	await server.start();
	webhookAgent = testAgent(server.app) as unknown as SuperAgentTest;
});

beforeEach(async () => {
	await testDb.truncate([
		'ExecutionEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'SharedCredentials',
		'CredentialsEntity',
	]);
	await Container.get(CacheService).reset();

	builder = await createOwner();
});

describe('chat trigger test webhooks', () => {
	test('enforces Basic Auth without clearing the pending test webhook', async () => {
		await webhookAgent
			.post(`/${webhookTestEndpoint}/${randomUUID()}/chat`)
			.send(chatMessage())
			.expect(404);

		const credential = await createBasicAuthCredential();
		const trigger = chatTriggerNode(
			{ authentication: 'basicAuth' },
			{ id: credential.id, name: credential.name },
		);
		const workflow = await createChatWorkflow(trigger);

		const listening = await startListening(workflow.id);
		expect(listening.body.data).toEqual({ waitingForWebhook: true });

		const url = `/${webhookTestEndpoint}/${trigger.webhookId}/chat`;

		await webhookAgent.post(url).send(chatMessage()).expect(401);
		await webhookAgent
			.post(url)
			.auth(BASIC_AUTH_USER, 'not-the-password')
			.send(chatMessage())
			.expect(403);

		// Rejected requests neither ran the workflow nor consumed the registration,
		// so the same registration still answers an authorized request.
		const authorized = await webhookAgent
			.post(url)
			.auth(BASIC_AUTH_USER, BASIC_AUTH_PASSWORD)
			.send(chatMessage());
		expect(authorized.statusCode).toBe(200);

		const execution = await lastExecutionFor(workflow.id);
		expect(execution?.mode).toBe('manual');
		expect(execution?.status).toBe('success');

		// The successful request consumed the one-shot registration.
		await webhookAgent
			.post(url)
			.auth(BASIC_AUTH_USER, BASIC_AUTH_PASSWORD)
			.send(chatMessage())
			.expect(404);
	});

	test('requires an n8n session for user-authenticated test webhooks', async () => {
		const trigger = chatTriggerNode({ authentication: 'n8nUserAuth' });
		const workflow = await createChatWorkflow(trigger);

		const listening = await startListening(workflow.id);
		expect(listening.body.data).toEqual({ waitingForWebhook: true });

		await webhookAgent
			.post(`/${webhookTestEndpoint}/${trigger.webhookId}/chat`)
			.send(chatMessage())
			.expect(401);

		const executionCount = await Container.get(ExecutionRepository).count({
			where: { workflowId: workflow.id },
		});
		expect(executionCount).toBe(0);

		// Disarm the pending registration's timeout so the suite exits cleanly.
		await Container.get(TestWebhooks).cancelWebhook(workflow.id);
	});

	test('allows the editor chat session route without webhook credentials', async () => {
		const credential = await createBasicAuthCredential();
		const trigger = chatTriggerNode(
			{ authentication: 'basicAuth' },
			{ id: credential.id, name: credential.name },
		);
		const workflow = await createChatWorkflow(trigger);
		const chatSessionId = randomUUID().replace(/-/g, '');

		const listening = await startListening(workflow.id, chatSessionId);
		expect(listening.body.data).toEqual({ waitingForWebhook: true });

		const response = await webhookAgent
			.post(`/${webhookTestEndpoint}/${workflow.id}/${chatSessionId}`)
			.send(chatMessage(chatSessionId));

		expect(response.statusCode).toBe(200);

		const execution = await lastExecutionFor(workflow.id);
		expect(execution?.mode).toBe('manual');
		expect(execution?.status).toBe('success');
	});
});

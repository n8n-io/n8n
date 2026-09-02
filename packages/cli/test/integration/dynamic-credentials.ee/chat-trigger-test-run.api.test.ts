/**
 * End-user credentials in an editor test run of a Chat Trigger.
 *
 * A test run is `executionMode: 'manual'`, and `CredentialsHelper.getDecrypted` skips
 * dynamic resolution for manual runs unless the execution carries a credential context.
 * Every other manual run gets one from the builder's auth cookie, but a run that waits
 * for a webhook returns `{ waitingForWebhook: true }` before that point — so the
 * identity is minted at registration and travels on the registration instead.
 *
 * The whole seam is exercised: the editor's authenticated `POST /rest/workflows/:id/run`
 * registers the webhook, then a real `WebhookServer` fires it and the workflow runs. The
 * assertion is a `nock` interceptor that only answers a request bearing the builder's own
 * per-user token — a match is proof the run resolved against their connection rather than
 * against the static credential data, which holds no token at all.
 */

import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DirectoryLoader } from 'n8n-core';
import { Cipher, UnrecognizedNodeTypeError } from 'n8n-core';
import type { INode, INodeType, NodeLoadingDetails } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { agent as testAgent } from 'supertest';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { SYSTEM_RESOLVER_ID } from '@/modules/dynamic-credentials.ee/constants';
import { DynamicCredentialUserEntryStorage } from '@/modules/dynamic-credentials.ee/credential-resolvers/storage/dynamic-credential-user-entry-storage';
import { N8nResolverSeeder } from '@/modules/dynamic-credentials.ee/services/n8n-resolver-seeder.service';
import { CacheService } from '@/services/cache/cache.service';
import { Telemetry } from '@/telemetry';
import { WebhookServer } from '@/webhooks/webhook-server';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { initNodeTypes, setupTestServer } from '../shared/utils';
import { loadNodesFromDist } from '../shared/utils/node-types-data';

mockInstance(Telemetry);

process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';
process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2 = 'true';

const testServer = setupTestServer({
	endpointGroups: ['workflows', 'credentials'],
	enabledFeatures: ['feat:sharing', 'feat:dynamicCredentials'],
	modules: ['dynamic-credentials'],
});

const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';
const CREDENTIAL_TYPE = 'googleSheetsOAuth2Api';
const VENDOR_HOST = 'https://api.example.test';
const VENDOR_PATH = '/ping';
const PER_USER_ACCESS_TOKEN = 'builders-own-access-token';

/** Resolves the requested credential types (and everything they extend) out of `nodes-base/dist`. */
function registerCredentialTypesFromDist(credentialTypeNames: string[]) {
	const baseDir = path.resolve(__dirname, '../../../../nodes-base');
	const known = JSON.parse(
		readFileSync(path.join(baseDir, 'dist/known/credentials.json'), 'utf-8'),
	) as Record<string, NodeLoadingDetails & { extends?: string[]; supportedNodes?: string[] }>;

	const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
	const pending = [...credentialTypeNames];

	while (pending.length > 0) {
		const name = pending.shift()!;
		if (name in loadNodesAndCredentials.loadedCredentials) continue;

		const loadInfo = known[name];
		if (!loadInfo) throw new Error(`Unknown credential type in dist: ${name}`);

		const CredentialClass = require(path.join(baseDir, loadInfo.sourcePath))[loadInfo.className];
		loadNodesAndCredentials.loadedCredentials[name] = {
			type: new CredentialClass(),
			sourcePath: '',
		};
		loadNodesAndCredentials.knownCredentials[name] = {
			className: loadInfo.className,
			sourcePath: loadInfo.sourcePath,
			extends: loadInfo.extends,
			supportedNodes: loadInfo.supportedNodes,
		};

		pending.push(...(loadInfo.extends ?? []));
	}
}

/**
 * The real Chat Trigger, out of the langchain package's dist. Required by absolute path
 * rather than imported (the package exports only its index), and registered under its own
 * package loader because node types resolve by the package prefix in their name. It has to
 * be the real node: `executeWebhook` keys its chat-specific seeding on this exact type.
 */
function registerChatTrigger() {
	const distPath = path.resolve(
		__dirname,
		'../../../../@n8n/nodes-langchain/dist/nodes/trigger/ChatTrigger/ChatTrigger.node.js',
	);
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { ChatTrigger } = require(distPath);
	const loaded = { type: new ChatTrigger() as INodeType, sourcePath: '' };
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
let teamProject: Project;
let webhookAgent: SuperAgentTest;
let webhookTestEndpoint: string;

const chatTriggerNode = (parameters: Record<string, unknown>): INode => ({
	id: randomUUID(),
	name: 'When chat message received',
	type: CHAT_TRIGGER_NODE_TYPE,
	typeVersion: 1.3,
	position: [0, 0],
	webhookId: randomUUID(),
	parameters: { public: true, mode: 'webhook', options: {}, ...parameters },
});

/**
 * `availableInChat` is what `classifyTriggerIdentity` reads to call a chat trigger
 * identity-bearing, and so what publish-time validation requires before an end-user
 * credential is allowed on one.
 */
const IDENTITY_BEARING = { availableInChat: true };

const httpRequestNode = (credential: { id: string; name: string }): INode => ({
	id: randomUUID(),
	name: 'Call the vendor',
	type: HTTP_REQUEST,
	typeVersion: 4.2,
	position: [200, 0],
	parameters: {
		method: 'GET',
		url: `${VENDOR_HOST}${VENDOR_PATH}`,
		authentication: 'predefinedCredentialType',
		nodeCredentialType: CREDENTIAL_TYPE,
		options: {},
	},
	credentials: { [CREDENTIAL_TYPE]: { id: credential.id, name: credential.name } },
});

const createChatWorkflow = async (
	credential: { id: string; name: string },
	parameters: Record<string, unknown> = IDENTITY_BEARING,
) => {
	const trigger = chatTriggerNode(parameters);

	return await createWorkflow(
		{
			active: false,
			nodes: [trigger, httpRequestNode(credential)],
			connections: {
				[trigger.name]: { main: [[{ node: 'Call the vendor', type: 'main', index: 0 }]] },
			},
		},
		teamProject,
	);
};

/**
 * An end-user OAuth2 credential: the shared client fields are static, the token is not —
 * it lives per user under the resolver, so the static data holds none.
 */
const createEndUserCredential = async () =>
	await saveCredential(
		{
			...randomCredentialPayload({ isResolvable: true, type: CREDENTIAL_TYPE }),
			data: {
				grantType: 'authorizationCode',
				clientId: 'shared-client-id',
				clientSecret: 'shared-client-secret',
				authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				accessTokenUrl: 'https://oauth2.googleapis.com/token',
				scope: 'https://www.googleapis.com/auth/drive',
				authentication: 'body',
			},
		},
		{ project: teamProject, role: 'credential:owner' },
	);

/** What the connect flow stores: per-user data, encrypted, keyed by n8n user id. */
const connect = async (credentialId: string, user: User, accessToken = PER_USER_ACCESS_TOKEN) => {
	const encrypted = await Container.get(Cipher).encryptV2({
		oauthTokenData: { access_token: accessToken, token_type: 'Bearer' },
	});
	await Container.get(DynamicCredentialUserEntryStorage).setCredentialData(
		credentialId,
		user.id,
		SYSTEM_RESOLVER_ID,
		encrypted,
		{},
	);
};

/** The vendor call, answered only for a request bearing the given token. */
const mockVendorCall = (accessToken = PER_USER_ACCESS_TOKEN) =>
	nock(VENDOR_HOST)
		.get(VENDOR_PATH)
		.matchHeader('authorization', `Bearer ${accessToken}`)
		.reply(200, { ok: true });

/** The editor pressing "Open chat": registers the test webhook for this session. */
const startListening = async (workflow: WorkflowEntity, chatSessionId: string) =>
	await testServer
		.authAgentFor(builder)
		.post(`/workflows/${workflow.id}/run`)
		.send({ triggerToStartFrom: { name: 'When chat message received' }, chatSessionId });

/** The chat panel sending a message to the test webhook it just registered. */
const sendChatMessage = async (workflow: WorkflowEntity, chatSessionId: string) =>
	await webhookAgent
		.post(`/${webhookTestEndpoint}/${workflow.id}/${chatSessionId}`)
		.send({ action: 'sendMessage', chatInput: 'hello', sessionId: chatSessionId });

const lastExecutionFor = async (workflowId: string) =>
	await Container.get(ExecutionRepository).findOne({
		where: { workflowId },
		order: { createdAt: 'DESC' },
		relations: ['executionData'],
	});

beforeAll(async () => {
	await initNodeTypes(loadNodesFromDist([HTTP_REQUEST]));
	registerChatTrigger();
	registerCredentialTypesFromDist([CREDENTIAL_TYPE]);

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
		'DynamicCredentialUserEntry',
		'SharedCredentials',
		'CredentialsEntity',
		'DynamicCredentialResolver',
	]);
	await Container.get(CacheService).reset();
	nock.cleanAll();

	// Seeding (not a hand-written row) matters: the resolver's config has to be
	// encrypted for it to be readable at resolve time.
	await Container.get(N8nResolverSeeder).seed();

	builder = await createOwner();
	// End-user credentials live in team projects only.
	teamProject = await createTeamProject(undefined, builder);
	await linkUserToProject(builder, teamProject, 'project:admin');
});

describe('chat trigger test run with end-user credentials', () => {
	let workflow: WorkflowEntity;
	let credentialId: string;
	let chatSessionId: string;

	beforeEach(async () => {
		const credential = await createEndUserCredential();
		credentialId = credential.id;
		workflow = await createChatWorkflow(credential);
		chatSessionId = randomUUID().replace(/-/g, '');
	});

	test("runs against the builder's own connection", async () => {
		await connect(credentialId, builder);
		const vendorScope = mockVendorCall();

		const listening = await startListening(workflow, chatSessionId);
		expect(listening.body.data).toEqual({ waitingForWebhook: true });

		const response = await sendChatMessage(workflow, chatSessionId);

		expect(response.statusCode).toBe(200);
		// The interceptor only matches the builder's own token, so a match proves the run
		// resolved against their connection rather than the tokenless static data.
		expect(vendorScope.isDone()).toBe(true);
	});

	test('tells a builder who has not connected, instead of failing to sign', async () => {
		const vendorScope = mockVendorCall();

		await startListening(workflow, chatSessionId);
		await sendChatMessage(workflow, chatSessionId);

		const execution = await lastExecutionFor(workflow.id);
		const runError = JSON.stringify(execution?.executionData?.data ?? '');

		expect(runError).toContain('is not connected for you');
		expect(runError).not.toContain('Unable to sign without access token');
		expect(vendorScope.isDone()).toBe(false);
	});

	test('carries no identity for a chat trigger that establishes none', async () => {
		// Without `availableInChat` this configuration cannot be published with an end-user
		// credential at all, so a test run must not quietly grant it an identity — it keeps
		// today's fall back to the static credential data, which holds no token, so the
		// builder's connection is never reached.
		await connect(credentialId, builder);
		const vendorScope = mockVendorCall();
		const noIdentityWorkflow = await createChatWorkflow(
			{ id: credentialId, name: 'end-user credential' },
			{ authentication: 'n8nUserAuth' },
		);

		await startListening(noIdentityWorkflow, chatSessionId);
		await sendChatMessage(noIdentityWorkflow, chatSessionId);

		expect(vendorScope.isDone()).toBe(false);
	});
});

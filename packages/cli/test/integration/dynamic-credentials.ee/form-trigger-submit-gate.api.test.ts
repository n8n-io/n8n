import {
	createWorkflowWithHistory,
	getPersonalProject,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { FormTrigger } from 'n8n-nodes-base/nodes/Form/FormTrigger.node';
import type { CredentialConnectionsRequiredResponse, INode } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { agent as testAgent } from 'supertest';

import { SYSTEM_RESOLVER_ID } from '@/modules/dynamic-credentials.ee/constants';
import { DynamicCredentialUserEntryStorage } from '@/modules/dynamic-credentials.ee/credential-resolvers/storage/dynamic-credential-user-entry-storage';
import { N8nResolverSeeder } from '@/modules/dynamic-credentials.ee/services/n8n-resolver-seeder.service';
import { OAuthClientRepository } from '@/modules/oauth-server/database/repositories/oauth-client.repository';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';
import { WebhookServer } from '@/webhooks/webhook-server';

import { createCredentials } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { initNodeTypes, setupTestServer } from '../shared/utils';

setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:dynamicCredentials'],
	modules: ['dynamic-credentials', 'oauth-server'],
});

let owner: User;
let submitter: User;
let agent: SuperAgentTest;
let formEndpoint: string;

const resourceUrlFor = (webhookPath: string) =>
	`${Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '')}/${formEndpoint}/${webhookPath}`;

const formTriggerNode = (webhookPath: string): INode => ({
	id: randomUUID(),
	name: 'On form submission',
	type: FORM_TRIGGER_NODE_TYPE,
	typeVersion: 2.6,
	position: [0, 0],
	// v2.6 drops the `path` parameter, so the webhook path travels as `$webhookId`.
	webhookId: webhookPath,
	parameters: {
		authentication: 'n8nUserAuth',
		formTitle: 'Test Form',
		formDescription: '',
		responseMode: 'onReceived',
		formFields: { values: [{ fieldLabel: 'Name', fieldType: 'text' }] },
		options: {},
	},
});

/**
 * Published, webhook-registered form workflow whose trigger node carries an
 * end-user (resolvable) credential. Writes the rows directly — the point of the
 * test is the runtime gate, not publish-time validation.
 */
const setupPublishedForm = async () => {
	const webhookPath = randomUUID();
	const node = formTriggerNode(webhookPath);

	const credential = await createCredentials(
		{ name: 'Submitter Gmail', type: 'gmailOAuth2', data: '', isResolvable: true },
		await getPersonalProject(owner),
	);

	node.credentials = { gmailOAuth2: { id: credential.id, name: credential.name } };

	const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
	await setActiveVersion(workflow.id, workflow.versionId);
	await Container.get(WebhookRepository).insert({
		workflowId: workflow.id,
		webhookPath,
		method: 'POST',
		node: node.name,
	});

	return { workflow, webhookPath, credential };
};

/** Mints a real audience-scoped access token for the form resource. */
const mintAccessToken = async (userId: string, resourceUrl: string) => {
	const tokenService = Container.get(OAuthTokenService);
	// A registered client is needed only to satisfy the token rows' FK.
	const clientId = `client-${randomUUID()}`;
	await Container.get(OAuthClientRepository).save({
		id: clientId,
		name: 'Form submit gate tests',
		redirectUris: ['https://example.com/callback'],
		grantTypes: ['authorization_code'],
		tokenEndpointAuthMethod: 'none',
	});
	const pair = tokenService.generateTokenPair(userId, clientId, resourceUrl, []);
	await tokenService.saveTokenPair(pair.accessToken, pair.refreshToken, clientId, userId, []);
	return pair.accessToken;
};

/** What the connect flow persists once the submitter has connected the credential. */
const connectCredential = async (credentialId: string, userId: string) => {
	const encrypted = await Container.get(Cipher).encryptV2({ accessToken: 'submitter-secret' });
	await Container.get(DynamicCredentialUserEntryStorage).setCredentialData(
		credentialId,
		userId,
		SYSTEM_RESOLVER_ID,
		encrypted,
		{},
	);
};

const submitForm = async (webhookPath: string, token: string) =>
	await agent
		.post(`/${formEndpoint}/${webhookPath}`)
		.set('x-auth-token', token)
		.set('content-type', 'multipart/form-data')
		.field('field-0', 'John');

const executionCountFor = async (workflowId: string) =>
	await Container.get(ExecutionRepository).count({ where: { workflowId } });

beforeAll(async () => {
	process.env.N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2 = 'true';
	formEndpoint = Container.get(GlobalConfig).endpoints.form;

	// The webhook path is served by a real `WebhookServer` running the real Form
	// Trigger, so that is the only node type the (single-node) workflow needs.
	await initNodeTypes({
		[FORM_TRIGGER_NODE_TYPE]: { type: new FormTrigger(), sourcePath: '' },
	});

	owner = await createOwner();
	submitter = await createOwner();

	await Container.get(CacheService).init(); // WebhookService caches static webhook lookups

	const server = new WebhookServer();
	await server.start();
	agent = testAgent(server.app) as unknown as SuperAgentTest;
});

afterAll(() => {
	delete process.env.N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2;
});

beforeEach(async () => {
	await testDb.truncate([
		'ExecutionEntity',
		'AccessToken',
		'RefreshToken',
		'AuthorizationCode',
		'OAuthClient',
		'WebhookEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
		'DynamicCredentialUserEntry',
		'SharedCredentials',
		'CredentialsEntity',
		'DynamicCredentialResolver',
	]);
	await Container.get(CacheService).reset();

	// Re-seed the system resolver, which backs any resolvable credential without
	// an explicit `resolverId`. Seeding (not a hand-written row) matters: the
	// resolver's config has to be encrypted for it to be readable at resolve time.
	await Container.get(N8nResolverSeeder).seed();
});

describe('form trigger submit-time credential gate', () => {
	let workflow: WorkflowEntity;
	let webhookPath: string;
	let credentialId: string;
	let token: string;

	beforeEach(async () => {
		const fixture = await setupPublishedForm();
		workflow = fixture.workflow;
		webhookPath = fixture.webhookPath;
		credentialId = fixture.credential.id;
		token = await mintAccessToken(submitter.id, resourceUrlFor(webhookPath));
	});

	test('rejects the submission and creates no execution when the credential is not connected', async () => {
		const response = await submitForm(webhookPath, token);

		expect(response.statusCode).toBe(428);
		expect(response.body).toEqual({
			status: 'credential_connections_required',
			readyToExecute: false,
			credentials: [
				{
					credentialId,
					credentialName: 'Submitter Gmail',
					credentialType: 'gmailOAuth2',
					credentialStatus: 'missing',
				},
			],
		});
		await expect(executionCountFor(workflow.id)).resolves.toBe(0);
	});

	test('accepts the submission and creates one execution once the credential is connected', async () => {
		await connectCredential(credentialId, submitter.id);

		const response = await submitForm(webhookPath, token);

		expect(response.statusCode).toBe(200);
		await expect(executionCountFor(workflow.id)).resolves.toBe(1);
	});

	test('rejects a submission made after the connection is revoked', async () => {
		await connectCredential(credentialId, submitter.id);
		expect((await submitForm(webhookPath, token)).statusCode).toBe(200);

		await Container.get(DynamicCredentialUserEntryStorage).deleteCredentialData(
			credentialId,
			submitter.id,
			SYSTEM_RESOLVER_ID,
			{},
		);

		const response = await submitForm(webhookPath, token);

		expect(response.statusCode).toBe(428);
		expect((response.body as CredentialConnectionsRequiredResponse).status).toBe(
			'credential_connections_required',
		);
		await expect(executionCountFor(workflow.id)).resolves.toBe(1); // only the pre-revoke run
	});
});

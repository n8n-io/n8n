import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWebhookData, IWorkflowBase } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let formEndpoint: string;
let formTestEndpoint: string;
let registrations: TestWebhookRegistrationsService;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const testWebhookBaseUrl = () =>
	Container.get(UrlService).getTestWebhookBaseUrl().replace(/\/$/, '');
const testResourceUrlFor = (webhookPath: string) =>
	`${testWebhookBaseUrl()}/${formTestEndpoint}/${webhookPath}`;
const prmPathFor = (webhookPath: string) =>
	`/.well-known/oauth-protected-resource/${formTestEndpoint}/${webhookPath}`;

const formTriggerNode = ({
	name = 'On form submission',
	authentication = 'n8nOAuth2',
	disabled = false,
}: { name?: string; authentication?: string; disabled?: boolean } = {}): INode => ({
	id: randomUUID(),
	name,
	type: FORM_TRIGGER_NODE_TYPE,
	typeVersion: 2,
	position: [0, 0],
	disabled,
	parameters: { path: 'unused', authentication },
});

/** Mirrors what `TestWebhooks.needsWebhook` registers when the user tests a form trigger. */
const registerTestWebhook = async (
	webhookPath: string,
	node: INode,
	{
		workflowId = randomUUID(),
		workflowName = 'My test workflow',
	}: { workflowId?: string; workflowName?: string } = {},
) => {
	await registrations.register({
		version: 1,
		workflowEntity: {
			id: workflowId,
			name: workflowName,
			active: false,
			nodes: [node],
			connections: {},
		} as IWorkflowBase,
		webhook: {
			httpMethod: 'POST',
			path: webhookPath,
			node: node.name,
			workflowId,
		} as IWebhookData,
	});
	return { workflowId, workflowName };
};

const resolveResource = async (webhookPath: string) =>
	await Container.get(ProtectedResourceRegistry).getByResourcePath(
		`/${formTestEndpoint}/${webhookPath}`,
	);

beforeAll(async () => {
	owner = await createOwner();
	const { endpoints } = Container.get(GlobalConfig);
	formEndpoint = endpoints.form;
	formTestEndpoint = endpoints.formTest;
	registrations = Container.get(TestWebhookRegistrationsService);
});

afterEach(async () => {
	await Container.get(CacheService).reset(); // test webhook registrations live in the cache
	await testDb.truncate([
		'AccessToken',
		'RefreshToken',
		'AuthorizationCode',
		'OAuthClient',
		'WebhookEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
	]);
});

describe('protected resource metadata for test form triggers', () => {
	test('should serve the metadata document while a test registration exists', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, formTriggerNode());

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			resource: testResourceUrlFor(webhookPath),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
		});
	});

	test('should resolve as a first-party resource whose only redirect URI is the trigger URL', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, formTriggerNode());

		const resource = await resolveResource(webhookPath);

		expect(resource?.isFirstParty).toBe(true);
		await expect(resource?.getAllowedRedirectUris?.()).resolves.toEqual([
			testResourceUrlFor(webhookPath),
		]);
	});

	test('should resolve from the registration alone, without the workflow in the DB', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, formTriggerNode(), { workflowName: 'Unsaved workflow' });

		const resource = await resolveResource(webhookPath);

		expect(resource?.displayName).toBe('Unsaved workflow');
	});

	test('should not resolve an unknown test path', async () => {
		const response = await testServer.restlessAgent.get(prmPathFor(randomUUID()));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the registration node name does not match', async () => {
		const webhookPath = randomUUID();
		await registrations.register({
			version: 1,
			workflowEntity: {
				id: randomUUID(),
				name: 'My test workflow',
				active: false,
				nodes: [formTriggerNode()],
				connections: {},
			} as IWorkflowBase,
			webhook: {
				httpMethod: 'POST',
				path: webhookPath,
				node: 'Ghost node',
				workflowId: randomUUID(),
			} as IWebhookData,
		});

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test.each([
		['authentication is none', formTriggerNode({ authentication: 'none' })],
		['authentication is basicAuth', formTriggerNode({ authentication: 'basicAuth' })],
		['the node is disabled', formTriggerNode({ disabled: true })],
	])('should not resolve when %s', async (_, node) => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, node);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should stop resolving as soon as the registration is removed', async () => {
		const webhookPath = randomUUID();
		await registerTestWebhook(webhookPath, formTriggerNode());

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(200);

		await registrations.deregister(registrations.toKey({ httpMethod: 'POST', path: webhookPath }));

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(404);
	});
});

describe('test vs production form resources', () => {
	test('should serve the same trigger path as two distinct resources', async () => {
		const webhookPath = randomUUID();
		const node = formTriggerNode();

		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await Container.get(WebhookRepository).insert({
			workflowId: workflow.id,
			webhookPath,
			method: 'POST',
			node: node.name,
		});
		await registerTestWebhook(webhookPath, node, { workflowId: workflow.id });

		const production = await testServer.restlessAgent.get(
			`/.well-known/oauth-protected-resource/${formEndpoint}/${webhookPath}`,
		);
		const test = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(production.statusCode).toBe(200);
		expect(test.statusCode).toBe(200);
		expect(production.body.resource).not.toBe(test.body.resource);
	});

	test('should reject a test-resource token at the production resource and vice versa', async () => {
		const webhookPath = randomUUID();
		const node = formTriggerNode();

		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await Container.get(WebhookRepository).insert({
			workflowId: workflow.id,
			webhookPath,
			method: 'POST',
			node: node.name,
		});
		await registerTestWebhook(webhookPath, node, { workflowId: workflow.id });

		const tokenService = Container.get(OAuthTokenService);
		const productionResourceUrl = `${webhookBaseUrl()}/${formEndpoint}/${webhookPath}`;
		const testResourceUrl = testResourceUrlFor(webhookPath);

		// A registered client is needed only to satisfy the token rows' FK.
		const clientId = `client-${randomUUID()}`;
		await Container.get(OAuthClientRepository).save({
			id: clientId,
			name: 'Form resolver tests',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		const mint = async (resourceUrl: string) => {
			const pair = tokenService.generateTokenPair(owner.id, clientId, resourceUrl, []);
			await tokenService.saveTokenPair(pair.accessToken, pair.refreshToken, clientId, owner.id, []);
			return pair.accessToken;
		};

		const testToken = await mint(testResourceUrl);
		const productionToken = await mint(productionResourceUrl);

		await expect(tokenService.verifyAccessToken(testToken, testResourceUrl)).resolves.toMatchObject(
			{ clientId },
		);
		await expect(
			tokenService.verifyAccessToken(productionToken, productionResourceUrl),
		).resolves.toMatchObject({ clientId });

		await expect(
			tokenService.verifyAccessToken(testToken, productionResourceUrl),
		).rejects.toThrow();
		await expect(
			tokenService.verifyAccessToken(productionToken, testResourceUrl),
		).rejects.toThrow();
	});
});

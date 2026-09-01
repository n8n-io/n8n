import {
	createWorkflowWithHistory,
	setActiveVersion,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let member: User;
let formEndpoint: string;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const resourceUrlFor = (webhookPath: string) =>
	`${webhookBaseUrl()}/${formEndpoint}/${webhookPath}`;
const prmPathFor = (webhookPath: string) =>
	`/.well-known/oauth-protected-resource/${formEndpoint}/${webhookPath}`;

const formTriggerNode = ({
	name = 'On form submission',
	authentication = 'n8nUserAuth',
	disabled = false,
	requireExecuteAccess,
}: {
	name?: string;
	authentication?: string;
	disabled?: boolean;
	requireExecuteAccess?: boolean;
} = {}): INode => ({
	id: randomUUID(),
	name,
	type: FORM_TRIGGER_NODE_TYPE,
	typeVersion: 2,
	position: [0, 0],
	disabled,
	parameters: {
		path: 'unused',
		authentication,
		...(requireExecuteAccess === undefined ? {} : { requireExecuteAccess }),
	},
});

/** Mirrors what `ActiveWorkflowManager.addWebhooks` persists on activation. */
const insertWebhookRow = async (workflowId: string, webhookPath: string, node: string) => {
	await Container.get(WebhookRepository).insert({ workflowId, webhookPath, method: 'POST', node });
};

/** Active workflow whose published version contains the given trigger node. */
const createPublishedFormWorkflow = async (webhookPath: string, node: INode, ownedBy = owner) => {
	const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, ownedBy);
	await setActiveVersion(workflow.id, workflow.versionId);
	await insertWebhookRow(workflow.id, webhookPath, node.name);
	return workflow;
};

/** Overwrite the draft nodes without touching the published (active) version. */
const updateDraftNodes = async (workflowId: string, nodes: INode[]) => {
	await Container.get(WorkflowRepository).update(workflowId, { nodes, versionId: randomUUID() });
};

const resolveResource = async (webhookPath: string) =>
	await Container.get(ProtectedResourceRegistry).getByResourcePath(
		`/${formEndpoint}/${webhookPath}`,
	);

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
	formEndpoint = Container.get(GlobalConfig).endpoints.form;
});

afterEach(async () => {
	await Container.get(CacheService).reset(); // WebhookService caches static webhook lookups
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

describe('protected resource metadata for form triggers', () => {
	test('should serve the metadata document for an active n8nUserAuth form trigger', async () => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(webhookPath, formTriggerNode());

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(200);
		// exact match: `scopes_supported` must be absent (the resource advertises no scopes)
		expect(response.body).toEqual({
			resource: resourceUrlFor(webhookPath),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
		});
	});

	test('should resolve as a first-party resource whose only redirect URI is the trigger URL', async () => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(webhookPath, formTriggerNode());

		const resource = await resolveResource(webhookPath);

		expect(resource?.isFirstParty).toBe(true);
		expect(resource?.getResourceUrl()).toBe(resourceUrlFor(webhookPath));
		await expect(resource?.getAllowedRedirectUris?.()).resolves.toEqual([
			resourceUrlFor(webhookPath),
		]);
	});

	test('should expose the workflow name for the consent screen', async () => {
		const webhookPath = randomUUID();
		const workflow = await createPublishedFormWorkflow(webhookPath, formTriggerNode());

		const resource = await resolveResource(webhookPath);

		expect(resource?.displayName).toBe(workflow.name);
	});

	test('should not resolve an unknown path', async () => {
		const response = await testServer.restlessAgent.get(prmPathFor(randomUUID()));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a non-form path even if the webhook exists', async () => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(webhookPath, formTriggerNode());

		const response = await testServer.restlessAgent.get(
			`/.well-known/oauth-protected-resource/webhook/${webhookPath}`,
		);

		expect(response.statusCode).toBe(404);
	});

	test.each([
		['authentication is none', formTriggerNode({ authentication: 'none' })],
		['authentication is basicAuth', formTriggerNode({ authentication: 'basicAuth' })],
		['authentication is an expression', formTriggerNode({ authentication: '={{ $json.auth }}' })],
		['the node is disabled', formTriggerNode({ disabled: true })],
	])('should not resolve when %s', async (_, node) => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(webhookPath, node);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a workflow without a published version', async () => {
		const node = formTriggerNode();
		const webhookPath = randomUUID();
		const workflow = await createWorkflowWithHistory({ active: false, nodes: [node] }, owner);
		await insertWebhookRow(workflow.id, webhookPath, node.name);

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve when the webhook node is missing from the active version', async () => {
		const node = formTriggerNode();
		const webhookPath = randomUUID();
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await insertWebhookRow(workflow.id, webhookPath, 'Ghost node');

		const response = await testServer.restlessAgent.get(prmPathFor(webhookPath));

		expect(response.statusCode).toBe(404);
	});

	test('should not resolve a dynamic webhook path', async () => {
		const node = formTriggerNode();
		const workflow = await createWorkflowWithHistory({ active: true, nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		const webhookId = randomUUID();
		await Container.get(WebhookRepository).insert({
			workflowId: workflow.id,
			webhookPath: ':param',
			method: 'POST',
			node: node.name,
			webhookId,
			pathLength: 1,
		});

		const response = await testServer.restlessAgent.get(prmPathFor(`${webhookId}/anything`));

		expect(response.statusCode).toBe(404);
	});

	test('should follow the published version, not the draft', async () => {
		// published n8nOAuth2, draft switched to none -> resource stays
		const protectedPath = randomUUID();
		const protectedWorkflow = await createPublishedFormWorkflow(protectedPath, formTriggerNode());
		await updateDraftNodes(protectedWorkflow.id, [formTriggerNode({ authentication: 'none' })]);

		const stillProtected = await testServer.restlessAgent.get(prmPathFor(protectedPath));
		expect(stillProtected.statusCode).toBe(200);
		expect(stillProtected.body.resource).toBe(resourceUrlFor(protectedPath));

		// published none, draft switched to n8nOAuth2 -> no resource
		const unprotectedPath = randomUUID();
		const unprotectedWorkflow = await createPublishedFormWorkflow(
			unprotectedPath,
			formTriggerNode({ authentication: 'none' }),
		);
		await updateDraftNodes(unprotectedWorkflow.id, [formTriggerNode()]);

		const stillUnprotected = await testServer.restlessAgent.get(prmPathFor(unprotectedPath));
		expect(stillUnprotected.statusCode).toBe(404);
	});

	test('should stop resolving once the webhook is deregistered', async () => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(webhookPath, formTriggerNode());

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(200);

		await Container.get(WebhookRepository).delete({ webhookPath });
		await Container.get(CacheService).reset();

		expect((await testServer.restlessAgent.get(prmPathFor(webhookPath))).statusCode).toBe(404);
	});
});

describe('authorize gate (workflow:execute)', () => {
	test('authorizes the owner but denies a user without execute access', async () => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(webhookPath, formTriggerNode({ requireExecuteAccess: true }));

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(owner)).resolves.toBe(true);
		await expect(resource?.authorize(member)).resolves.toBe(false);
	});

	test('authorizes a user granted execute via a project role', async () => {
		const webhookPath = randomUUID();
		const workflow = await createPublishedFormWorkflow(
			webhookPath,
			formTriggerNode({ requireExecuteAccess: true }),
		);
		await shareWorkflowWithUsers(workflow, [member]);

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});

	test('authorizes any authenticated user when require-execute is turned off', async () => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(
			webhookPath,
			formTriggerNode({ requireExecuteAccess: false }),
		);

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});

	test('authorizes any authenticated user when the parameter is absent', async () => {
		// `requireExecuteAccess` is opt-in, so an unset parameter means any authenticated
		// user may submit — a form whose node never set it stays open.
		const node = formTriggerNode();
		expect(node.parameters.requireExecuteAccess).toBeUndefined();
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(webhookPath, node);

		const resource = await resolveResource(webhookPath);

		await expect(resource?.authorize(member)).resolves.toBe(true);
	});
});

/**
 * The same check the form's POST handler and dynamic-credential resolution go
 * through: holding a token for the form resource is not enough — the submitter
 * must still have `workflow:execute` on the workflow behind it.
 */
describe('runtime gate: verifyOAuthAccessToken enforces workflow:execute', () => {
	const mintAccessToken = async (userId: string, resourceUrl: string) => {
		const tokenService = Container.get(OAuthTokenService);
		// A registered client is needed only to satisfy the token rows' FK.
		const clientId = `client-${randomUUID()}`;
		await Container.get(OAuthClientRepository).save({
			id: clientId,
			name: 'Form resolver tests',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});
		const pair = tokenService.generateTokenPair(userId, clientId, resourceUrl, []);
		await tokenService.saveTokenPair(
			pair.accessToken,
			pair.refreshToken,
			clientId,
			userId,
			[],
			pair.audience,
		);
		return pair.accessToken;
	};

	test('refuses a submitter without execute access on the workflow', async () => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(webhookPath, formTriggerNode({ requireExecuteAccess: true }));
		const token = await mintAccessToken(member.id, resourceUrlFor(webhookPath));

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlFor(webhookPath),
		);

		expect(result.user).toBeNull();
		expect(result.context?.reason).toBe('insufficient_scope');
	});

	test('allows a submitter granted execute via a project role', async () => {
		const webhookPath = randomUUID();
		const workflow = await createPublishedFormWorkflow(
			webhookPath,
			formTriggerNode({ requireExecuteAccess: true }),
		);
		await shareWorkflowWithUsers(workflow, [member]);
		const token = await mintAccessToken(member.id, resourceUrlFor(webhookPath));

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlFor(webhookPath),
		);

		expect(result.user?.id).toBe(member.id);
	});

	test('allows the same submitter once require-execute is turned off', async () => {
		const webhookPath = randomUUID();
		await createPublishedFormWorkflow(
			webhookPath,
			formTriggerNode({ requireExecuteAccess: false }),
		);
		const token = await mintAccessToken(member.id, resourceUrlFor(webhookPath));

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlFor(webhookPath),
		);

		expect(result.user?.id).toBe(member.id);
	});
});

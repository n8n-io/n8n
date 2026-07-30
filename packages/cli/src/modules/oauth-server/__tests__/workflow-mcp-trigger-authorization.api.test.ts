import {
	createWorkflowWithHistory,
	setActiveVersion,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { createOwner, createMember, createAdmin } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';
import { JwtService } from '@/services/jwt.service';

import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import type { OAuthSessionPayload } from '../oauth-session.service';

/**
 * Authorization for OAuth-protected MCP Server Triggers. A workflow whose MCP
 * trigger uses `n8nOAuth2` is a protected resource; only users with
 * `workflow:execute` on that workflow may mint a token for it or invoke it.
 * Three actors exercise the access-control system: no access (denied), execute
 * via a project/resource role, and execute via a global role.
 */
const testServer = setupTestServer({ endpointGroups: ['mcp'], modules: ['oauth-server', 'mcp'] });

let owner: User;
let memberNoAccess: User;
let memberWithProjectAccess: User;
let adminWithGlobalAccess: User;

let tokenService: OAuthTokenService;
let jwtService: JwtService;
let oauthClientRepository: OAuthClientRepository;
let mcpEndpoint: string;

const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const productionResourceUrl = (webhookPath: string) =>
	`${webhookBaseUrl()}/${mcpEndpoint}/${webhookPath}`;

const mcpTriggerNode = (requireExecuteAccess?: boolean): INode => ({
	id: randomUUID(),
	name: 'MCP Server Trigger',
	type: MCP_TRIGGER_NODE_TYPE,
	typeVersion: 2,
	position: [0, 0],
	parameters: {
		path: 'unused',
		authentication: 'n8nOAuth2',
		// Omitted when undefined so the "absent param ⇒ secure default" path is exercised too.
		...(requireExecuteAccess === undefined ? {} : { requireExecuteAccess }),
	},
});

/**
 * Create an active, published workflow whose MCP trigger is protected with
 * n8n OAuth2, plus the production webhook row the resolver matches on. Returns
 * the canonical resource URL the OAuth server binds tokens and consent to.
 */
const createProtectedWorkflow = async (workflowName: string, requireExecuteAccess?: boolean) => {
	const node = mcpTriggerNode(requireExecuteAccess);
	const webhookPath = randomUUID();
	const workflow = await createWorkflowWithHistory(
		{ name: workflowName, active: true, nodes: [node] },
		owner,
	);
	await setActiveVersion(workflow.id, workflow.versionId);
	await Container.get(WebhookRepository).insert({
		workflowId: workflow.id,
		webhookPath,
		method: 'POST',
		node: node.name,
	});
	return { workflow, resourceUrl: productionResourceUrl(webhookPath) };
};

const registerClient = async () =>
	(
		await oauthClientRepository.save({
			id: `client-${randomUUID()}`,
			name: 'Test OAuth Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		})
	).id;

const mintAccessToken = async (userId: string, resourceUrl: string) => {
	const clientId = await registerClient();
	const pair = tokenService.generateTokenPair(userId, clientId, resourceUrl, []);
	await tokenService.saveTokenPair(pair.accessToken, pair.refreshToken, clientId, userId, []);
	return pair.accessToken;
};

const sessionTokenFor = async (resourceUrl: string) => {
	const clientId = await registerClient();
	const payload: OAuthSessionPayload = {
		clientId,
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'test-challenge-string-that-is-long-enough',
		state: 'test-state',
		resource: resourceUrl,
	};
	return jwtService.sign(payload, { expiresIn: '10m' });
};

beforeAll(async () => {
	owner = await createOwner();
	memberNoAccess = await createMember();
	memberWithProjectAccess = await createMember();
	adminWithGlobalAccess = await createAdmin();

	tokenService = Container.get(OAuthTokenService);
	jwtService = Container.get(JwtService);
	oauthClientRepository = Container.get(OAuthClientRepository);
	mcpEndpoint = Container.get(GlobalConfig).endpoints.mcp;
});

afterEach(async () => {
	await Container.get(CacheService).reset();
	await testDb.truncate([
		'AccessToken',
		'RefreshToken',
		'AuthorizationCode',
		'OAuthClient',
		'UserConsent',
		'WebhookEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
	]);
});

describe('runtime gate: verifyOAuthAccessToken enforces workflow:execute', () => {
	test('denies a user without execute access on the workflow', async () => {
		const { resourceUrl } = await createProtectedWorkflow('Owner protected workflow');
		const token = await mintAccessToken(memberNoAccess.id, resourceUrl);

		const result = await tokenService.verifyOAuthAccessToken(token, resourceUrl);

		expect(result.user).toBeNull();
		expect(result.context?.reason).toBe('insufficient_scope');
	});

	test('allows a user granted execute via a project role', async () => {
		const { workflow, resourceUrl } = await createProtectedWorkflow('Owner protected workflow');
		await shareWorkflowWithUsers(workflow, [memberWithProjectAccess]);
		const token = await mintAccessToken(memberWithProjectAccess.id, resourceUrl);

		const result = await tokenService.verifyOAuthAccessToken(token, resourceUrl);

		expect(result.user?.id).toBe(memberWithProjectAccess.id);
	});

	test('allows a user granted execute via a global role', async () => {
		const { resourceUrl } = await createProtectedWorkflow('Owner protected workflow');
		const token = await mintAccessToken(adminWithGlobalAccess.id, resourceUrl);

		const result = await tokenService.verifyOAuthAccessToken(token, resourceUrl);

		expect(result.user?.id).toBe(adminWithGlobalAccess.id);
	});

	test('allows any authenticated user when require-execute is turned off', async () => {
		// requireExecuteAccess:false is the opt-out — the same no-access member who is denied
		// by default must now be allowed, proving the resolver reads the per-trigger setting.
		const { resourceUrl } = await createProtectedWorkflow('Open MCP server', false);
		const token = await mintAccessToken(memberNoAccess.id, resourceUrl);

		const result = await tokenService.verifyOAuthAccessToken(token, resourceUrl);

		expect(result.user?.id).toBe(memberNoAccess.id);
	});
});

describe('consent gate: workflow name and authorization code require execute access', () => {
	test('does not reveal the workflow name to a user without execute access', async () => {
		const workflowName = `Owner protected workflow ${randomUUID()}`;
		const { resourceUrl } = await createProtectedWorkflow(workflowName);
		const sessionToken = await sessionTokenFor(resourceUrl);

		const response = await testServer
			.authAgentFor(memberNoAccess)
			.get('/consent/details')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`);

		expect(JSON.stringify(response.body)).not.toContain(workflowName);
	});

	test('reveals the workflow name to the owner', async () => {
		const workflowName = `Owner protected workflow ${randomUUID()}`;
		const { resourceUrl } = await createProtectedWorkflow(workflowName);
		const sessionToken = await sessionTokenFor(resourceUrl);

		const response = await testServer
			.authAgentFor(owner)
			.get('/consent/details')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`);

		expect(response.body.data.resourceName).toBe(workflowName);
	});

	test('does not mint an authorization code for a user without execute access', async () => {
		const { resourceUrl } = await createProtectedWorkflow('Owner protected workflow');
		const sessionToken = await sessionTokenFor(resourceUrl);

		const response = await testServer
			.authAgentFor(memberNoAccess)
			.post('/consent/approve')
			.set('Cookie', `n8n-oauth-session=${sessionToken}`)
			.send({ approved: true })
			.expect(403);

		expect(String(response.body.data?.redirectUrl ?? '')).not.toContain('code=');
	});
});

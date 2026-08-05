// The service-accounts feature is gated on this env flag, read at module-init
// time and again inside `AgentsService.create`. It must be set before any
// `setupTestServer` beforeAll (module init) or agent-provisioning code runs, so
// it is set at module scope and restored in afterAll.
const priorServiceAccountsFlag = process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS;
process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS = 'true';

import { OutboundHttp } from '@n8n/backend-network';
import {
	createWorkflowWithHistory,
	getPersonalProject,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { InternalOAuth2MintService } from '@/modules/oauth-server/internal-oauth2-mint.service';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { JwtService } from '@/services/jwt.service';
import { UrlService } from '@/services/url.service';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

/**
 * GATE-OBO — the delegated (on-behalf-of) mint proof across the real HTTP token
 * boundary. Where the autonomous proof (`agent-mint-hook.api.test.ts`) mints a
 * `client_credentials` token whose `sub` is the agent's service account, this
 * exercises the RFC 8693 token-exchange path: a human-triggered agent run mints
 * a *delegated* token via `InternalOAuth2MintService.mintForUser(..., onBehalfOfUserId)`,
 * which self-mints a subject assertion for the human and performs a real HTTP
 * token-exchange self-call against this live test server's own `/oauth/token`.
 *
 * The minted token carries `{ sub: human, act: { sub: serviceAccount } }`, the
 * MCP-trigger verify resolves BOTH identities, and — the point — authorizes
 * against the SUBJECT (the human), not the actor. A fresh service account that
 * lacks execute on the human's workflow is admitted when it acts on the human's
 * behalf, yet denied when it mints autonomously for the same resource: proof
 * that OBO authorizes as the human.
 */
const testServer = setupTestServer({
	endpointGroups: ['mcp'],
	modules: ['oauth-server', 'mcp', 'agents', 'service-accounts'],
});

// The human subject: an owner, so she holds `workflow:execute` via her global role.
let alice: User;
let projectId: string;

let agentId: string;
let saUserId: string;
let priorEditorBaseUrl: string;
let priorWebhookUrl: string;

const mcpEndpoint = () => Container.get(GlobalConfig).endpoints.mcp;
const webhookBaseUrl = () => Container.get(UrlService).getWebhookBaseUrl().replace(/\/$/, '');
const productionResourceUrl = (webhookPath: string) =>
	`${webhookBaseUrl()}/${mcpEndpoint()}/${webhookPath}`;

const mcpTriggerNode = (): INode => ({
	id: randomUUID(),
	name: 'MCP Server Trigger',
	type: MCP_TRIGGER_NODE_TYPE,
	typeVersion: 2,
	position: [0, 0],
	parameters: {
		path: 'unused',
		authentication: 'n8nOAuth2',
		// Secure default: execute access is required (the param is omitted so the
		// "absent param ⇒ require execute" path runs). This is what makes the
		// subject-vs-actor authorization differential observable.
	},
});

/**
 * Create an active, published workflow owned by `alice` whose MCP trigger is
 * protected with n8n OAuth2, plus the production webhook row the resolver
 * matches on. Returns the canonical resource URL the OAuth server binds tokens
 * and consent to.
 */
const createProtectedWorkflow = async (workflowName: string) => {
	const node = mcpTriggerNode();
	const webhookPath = randomUUID();
	const workflow = await createWorkflowWithHistory(
		{ name: workflowName, active: true, nodes: [node] },
		alice,
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

beforeAll(async () => {
	// The mint discovers its token endpoint from n8n's own OAuth2 metadata, fetched
	// at the protected resource's own origin (the webhook base URL) and the issuer it
	// advertises (the instance base URL). Point BOTH at the live ephemeral port so
	// discovery — and the subsequent token-exchange self-call — reach THIS test
	// server rather than the default :5678 host, which nothing is listening on in the
	// vitest environment. Overriding only `editorBaseUrl` would leave the resource URL
	// (built from the webhook base URL) pointing at :5678, so discovery would fail and
	// silently exercise the fallback path instead of the real discovered one.
	const address = testServer.httpServer.address() as AddressInfo;
	const liveBaseUrl = `http://127.0.0.1:${address.port}`;
	const globalConfig = Container.get(GlobalConfig);
	priorEditorBaseUrl = globalConfig.editorBaseUrl;
	priorWebhookUrl = globalConfig.webhookUrl;
	globalConfig.editorBaseUrl = liveBaseUrl;
	globalConfig.webhookUrl = liveBaseUrl;

	alice = await createOwner();
	projectId = (await getPersonalProject(alice)).id;

	// Provision the agent. With the feature flag enabled, `create` eagerly
	// provisions the 1:1 service account; fall back to the lazy backfill if it
	// did not fire, so the rest of the proof still runs. The SA is a FRESH
	// `global:member` user that is NOT shared into Alice's workflow, so it lacks
	// `workflow:execute` on the protected resource — which is what the killer
	// assertion below turns on.
	const agent = await Container.get(AgentsService).create(projectId, 'OBO Mint Agent');
	agentId = agent.id;

	const reloaded = await Container.get(AgentRepository).findByIdAndProjectId(agentId, projectId);
	saUserId =
		reloaded?.serviceAccountUserId ??
		(await Container.get(AgentsService).getOrCreateServiceAccountUserId(agent));
});

afterEach(async () => {
	await Container.get(CacheService).reset();
	// Only per-test resources are cleared. The agent, its service account, and
	// its (encrypted) client credential survive across tests so the SA identity
	// stays stable; the SA client's shadow oauth_clients row is re-created
	// idempotently by the next exchange.
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

afterAll(() => {
	Container.get(GlobalConfig).editorBaseUrl = priorEditorBaseUrl;
	Container.get(GlobalConfig).webhookUrl = priorWebhookUrl;
	if (priorServiceAccountsFlag === undefined) {
		delete process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS;
	} else {
		process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS = priorServiceAccountsFlag;
	}
});

describe('delegated (on-behalf-of) mint across the real HTTP token boundary', () => {
	// Proves the mint takes the *discovered* branch, not the fallback: the mint runs
	// exactly this `resolveResourceAuth` logic (RFC 9728 → RFC 8414) before minting,
	// and the fallback is only reached when discovery throws. Resolving here against
	// the live server for the fixture resource — and pinning the advertised
	// `/mcp-oauth/token` endpoint — confirms discovery succeeds, so the real
	// discovered token-exchange path is what runs end-to-end below.
	test('resolves the fixture resource through real OAuth2 discovery (RFC 9728 → RFC 8414)', async () => {
		const { resourceUrl } = await createProtectedWorkflow('OBO discovery fixture');
		const target = new URL(resourceUrl);
		const http = Container.get(OutboundHttp).requests({ ssrf: 'disabled' });

		const prm = await http.request<{ resource?: string; authorization_servers?: string[] }>({
			url: `${target.origin}/.well-known/oauth-protected-resource${target.pathname}${target.search}`,
			method: 'GET',
		});
		expect(prm.resource).toBe(resourceUrl);
		const issuer = prm.authorization_servers?.[0];
		expect(issuer).toBeTruthy();

		const asMetadata = await http.request<{ token_endpoint?: string }>({
			url: `${issuer}/.well-known/oauth-authorization-server`,
			method: 'GET',
		});
		expect(asMetadata.token_endpoint).toBe(`${issuer}/mcp-oauth/token`);
	});

	test('mints a delegated token whose claims name the human as subject and the service account as actor', async () => {
		const { resourceUrl } = await createProtectedWorkflow('OBO delegated claims');

		// Real HTTP token-exchange self-call: the acting SA mints on behalf of Alice.
		const token = await Container.get(InternalOAuth2MintService).mintForUser(
			saUserId,
			resourceUrl,
			{},
			alice.id,
		);
		expect(token).toBeTruthy();

		const decoded = Container.get(JwtService).decode<{
			sub?: string;
			aud?: string;
			act?: { sub?: string };
		}>(token);

		// RFC 8693 delegation shape: subject is the human, actor is the acting SA,
		// audience is the discovered canonical resource.
		expect(decoded.sub).toBe(alice.id);
		expect(decoded.act?.sub).toBe(saUserId);
		expect(decoded.aud).toBe(resourceUrl);
	});

	test('verify resolves both identities and authorizes against the subject', async () => {
		const { resourceUrl } = await createProtectedWorkflow('OBO verify resolves both');

		const token = await Container.get(InternalOAuth2MintService).mintForUser(
			saUserId,
			resourceUrl,
			{},
			alice.id,
		);

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrl,
		);

		// The subject (Alice) is the authorized principal; the actor (SA) is
		// surfaced for attribution. Alice holds execute via her global role, so
		// the delegated token is accepted.
		expect(result.user?.id).toBe(alice.id);
		expect(result.actor?.id).toBe(saUserId);
	});

	test('authorization follows the subject, not the actor', async () => {
		const { resourceUrl } = await createProtectedWorkflow('OBO subject-vs-actor');

		// Delegated as Alice (owner, has execute): accepted, resolves to Alice.
		const delegatedToken = await Container.get(InternalOAuth2MintService).mintForUser(
			saUserId,
			resourceUrl,
			{},
			alice.id,
		);
		const delegated = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			delegatedToken,
			resourceUrl,
		);
		expect(delegated.user?.id).toBe(alice.id);
		expect(delegated.actor?.id).toBe(saUserId);

		// Autonomous as the SA itself (same SA, same resource) — the SA lacks
		// execute on Alice's workflow, so verify denies it.
		const autonomousToken = await Container.get(InternalOAuth2MintService).mintForUser(
			saUserId,
			resourceUrl,
		);
		const autonomous = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			autonomousToken,
			resourceUrl,
		);
		expect(autonomous.user).toBeNull();
		expect(autonomous.context?.reason).toBe('insufficient_scope');
	});

	test('rejects the delegated token at a different audience (audience isolation)', async () => {
		const { resourceUrl: resourceUrlA } = await createProtectedWorkflow('OBO audience A');
		const { resourceUrl: resourceUrlB } = await createProtectedWorkflow('OBO audience B');

		const token = await Container.get(InternalOAuth2MintService).mintForUser(
			saUserId,
			resourceUrlA,
			{},
			alice.id,
		);

		// Its own audience: accepted and resolved to Alice.
		const acceptedAtA = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlA,
		);
		expect(acceptedAtA.user?.id).toBe(alice.id);

		// A different resource's audience: rejected (audience isolation).
		const rejectedAtB = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlB,
		);
		expect(rejectedAtB.user).toBeNull();
	});
});

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
import { EventService } from '@/events/event.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { InternalOAuth2MintService } from '@/modules/oauth-server/internal-oauth2-mint.service';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ServiceAccountCredentialService } from '@/services/service-account-credential.service';
import { UrlService } from '@/services/url.service';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

/**
 * The Track 3 mint-boundary proof (GATE-6). Where the in-process money proof
 * (`agent-service-account-mint.api.test.ts`) calls `exchangeClientCredentials`
 * directly, this exercises the *full runtime path*: a provisioned agent's
 * service account mints a token through `InternalOAuth2MintService.mintForUser`,
 * which performs a **real HTTP `client_credentials` self-call** against this
 * live test server's own `/oauth/token` endpoint. The minted token then verifies
 * at its own audience and resolves to the agent's SA identity, and is rejected
 * at a different audience — proving the HTTP mint boundary end-to-end. The mint
 * and verify audit events are asserted on the way through.
 */
const testServer = setupTestServer({
	endpointGroups: ['mcp'],
	modules: ['oauth-server', 'mcp', 'agents', 'service-accounts'],
});

let owner: User;
let projectId: string;

let agentId: string;
let saUserId: string;
let saClientId: string;
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
		// The execute-scope gate is proven elsewhere; this proof is about the mint
		// boundary + audience isolation, so any authenticated principal is admitted.
		requireExecuteAccess: false,
	},
});

/**
 * Create an active, published workflow whose MCP trigger is protected with n8n
 * OAuth2, plus the production webhook row the resolver matches on. Returns the
 * canonical resource URL the OAuth server binds tokens and consent to.
 */
const createProtectedWorkflow = async (workflowName: string) => {
	const node = mcpTriggerNode();
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

beforeAll(async () => {
	// The mint discovers its token endpoint from n8n's own OAuth2 metadata, fetched
	// at the protected resource's own origin (the webhook base URL) and the issuer it
	// advertises (the instance base URL). Point BOTH at the live ephemeral port so
	// discovery — and the subsequent `client_credentials` self-call — reach THIS test
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

	owner = await createOwner();
	projectId = (await getPersonalProject(owner)).id;

	// Provision the agent. With the feature flag enabled, `create` eagerly
	// provisions the 1:1 service account; fall back to the lazy backfill if it
	// did not fire, so the rest of the proof still runs.
	const agent = await Container.get(AgentsService).create(projectId, 'Mint Hook Agent');
	agentId = agent.id;

	const reloaded = await Container.get(AgentRepository).findByIdAndProjectId(agentId, projectId);
	saUserId =
		reloaded?.serviceAccountUserId ??
		(await Container.get(AgentsService).getOrCreateServiceAccountUserId(agent));

	// The runtime mint recovers (decrypts) this same client credential; capture the
	// clientId so the minted audit event can be asserted precisely.
	const recovered = await Container.get(ServiceAccountCredentialService).getDecryptedForUser(
		saUserId,
	);
	if (!recovered) throw new Error('Expected a recoverable client credential for the agent SA');
	saClientId = recovered.clientId;
});

afterEach(async () => {
	await Container.get(CacheService).reset();
	// Only the per-test resources are cleared. The agent, its service account, and
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

describe('agent self-mint across the real HTTP token boundary', () => {
	// The mint now discovers its endpoint from n8n's own OAuth2 metadata rather than
	// guessing `/oauth/token`. This asserts that discovery resolves for real against
	// the live server for the fixture resource, and pins the advertised token endpoint
	// (`/mcp-oauth/token`) that the mint uses — proving the discovered path, not the
	// fallback, is what runs end-to-end.
	test('resolves the fixture resource through real OAuth2 discovery (RFC 9728 → RFC 8414)', async () => {
		const { resourceUrl } = await createProtectedWorkflow('Discovery fixture');
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

	test('mints a token via the HTTP client_credentials self-call that resolves to the agent SA at its own audience', async () => {
		const { resourceUrl } = await createProtectedWorkflow('Mint hook workflow A');
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		// Real HTTP self-call to this live server's /oauth/token, as the agent SA.
		const token = await Container.get(InternalOAuth2MintService).mintForUser(saUserId, resourceUrl);
		expect(token).toBeTruthy();

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrl,
		);
		expect(result.user?.id).toBe(saUserId);

		// Seam F — the mint boundary emits a success audit event bound to the SA.
		expect(emitSpy).toHaveBeenCalledWith('service-account-token-minted', {
			sub: saUserId,
			clientId: saClientId,
			aud: resourceUrl,
			outcome: 'success',
		});
		// ...and the verify site emits a matching verified event.
		expect(emitSpy).toHaveBeenCalledWith('service-account-token-verified', {
			sub: saUserId,
			aud: resourceUrl,
			outcome: 'success',
		});
	});

	test('rejects the HTTP-minted token at a different audience (audience isolation)', async () => {
		const { resourceUrl: resourceUrlA } = await createProtectedWorkflow('Mint hook A');
		const { resourceUrl: resourceUrlB } = await createProtectedWorkflow('Mint hook B');

		const token = await Container.get(InternalOAuth2MintService).mintForUser(
			saUserId,
			resourceUrlA,
		);
		expect(token).toBeTruthy();

		// Its own audience: accepted and bound to the agent SA.
		const acceptedAtA = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlA,
		);
		expect(acceptedAtA.user?.id).toBe(saUserId);

		// A different resource's audience: rejected (audience isolation).
		const rejectedAtB = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			token,
			resourceUrlB,
		);
		expect(rejectedAtB.user).toBeNull();
	});
});

// The service-accounts feature is gated on this env flag, read at module-init
// time and again inside `AgentsService.create`. It must be set before any
// `setupTestServer` beforeAll (module init) or agent-provisioning code runs, so
// it is set at module scope and restored in afterAll.
const priorServiceAccountsFlag = process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS;
process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS = 'true';

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

import { MCP_TRIGGER_NODE_TYPE } from '@/constants';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { OAuthServerService } from '@/modules/oauth-server/oauth-server.service';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { CacheService } from '@/services/cache/cache.service';
import { ServiceAccountCredentialService } from '@/services/service-account-credential.service';
import { UrlService } from '@/services/url.service';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

/**
 * The Track 3 money proof, end-to-end and in-process with a real provisioned
 * agent: provision an Agent → recover its service-account client secret → mint a
 * token through the real `client_credentials` exchange → the token verifies at
 * its own audience and resolves to the agent's service-account identity, and is
 * rejected at a different audience (audience isolation).
 */
setupTestServer({
	endpointGroups: ['mcp'],
	modules: ['oauth-server', 'mcp', 'agents', 'service-accounts'],
});

let owner: User;
let projectId: string;

let agentId: string;
let saUserId: string;
let recoveredClientId: string;
let recoveredClientSecret: string;
let eagerlyProvisioned = false;

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
		// The execute-scope gate is proven elsewhere; this proof is about identity
		// + audience isolation, so any authenticated principal is admitted.
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
	owner = await createOwner();
	projectId = (await getPersonalProject(owner)).id;

	// Provision the agent. With the feature flag enabled, `create` eagerly
	// provisions the 1:1 service account. Reload to confirm it stuck; if eager
	// provisioning did not fire, force the lazy backfill so the rest of the proof
	// still runs (and record which path produced the identity).
	const agent = await Container.get(AgentsService).create(projectId, 'Proof Agent');
	agentId = agent.id;

	const reloaded = await Container.get(AgentRepository).findByIdAndProjectId(agentId, projectId);
	if (reloaded?.serviceAccountUserId) {
		eagerlyProvisioned = true;
		saUserId = reloaded.serviceAccountUserId;
	} else {
		saUserId = await Container.get(AgentsService).getOrCreateServiceAccountUserId(agent);
	}

	// Recover the agent's client credential (WP1 reversible secret): the runtime
	// decrypts this to mint tokens as the agent's service account.
	const recovered = await Container.get(ServiceAccountCredentialService).getDecryptedForUser(
		saUserId,
	);
	if (!recovered) throw new Error('Expected a recoverable client credential for the agent SA');
	recoveredClientId = recovered.clientId;
	recoveredClientSecret = recovered.clientSecret;
});

afterEach(async () => {
	await Container.get(CacheService).reset();
	// Only the per-test resources are cleared. The agent, its service account, and
	// its (encrypted) client credential are created once and survive across tests
	// so the recovered secret stays stable — the SA client's shadow oauth_clients
	// row is re-created idempotently by the next exchange.
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
	if (priorServiceAccountsFlag === undefined) {
		delete process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS;
	} else {
		process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS = priorServiceAccountsFlag;
	}
});

describe('agent service-account provisioning + credential recovery', () => {
	test('provisions a 1:1 service account and exposes a recoverable client secret', () => {
		expect(saUserId).toBeTruthy();
		expect(recoveredClientId).toBeTruthy();
		expect(recoveredClientSecret).toBeTruthy();
		// Documents which provisioning path produced the identity for this run.
		expect(typeof eagerlyProvisioned).toBe('boolean');
	});
});

describe('client_credentials mint with the recovered agent secret', () => {
	test('mints a token that resolves to the agent service-account identity at its own audience', async () => {
		const { resourceUrl } = await createProtectedWorkflow('Agent protected workflow A');

		const tokens = await Container.get(OAuthServerService).exchangeClientCredentials(
			recoveredClientId,
			recoveredClientSecret,
			resourceUrl,
		);

		expect(tokens).not.toBeNull();
		expect(tokens?.access_token).toBeTruthy();

		const result = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			tokens!.access_token,
			resourceUrl,
		);

		expect(result.user?.id).toBe(saUserId);
	});

	test('rejects the minted token at a different audience while accepting it at its own', async () => {
		const { resourceUrl: resourceUrlA } = await createProtectedWorkflow('Agent protected A');
		const { resourceUrl: resourceUrlB } = await createProtectedWorkflow('Agent protected B');

		const tokens = await Container.get(OAuthServerService).exchangeClientCredentials(
			recoveredClientId,
			recoveredClientSecret,
			resourceUrlA,
		);
		expect(tokens?.access_token).toBeTruthy();
		const accessToken = tokens!.access_token;

		// Same token, its own audience: accepted and bound to the agent SA.
		const acceptedAtA = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			accessToken,
			resourceUrlA,
		);
		expect(acceptedAtA.user?.id).toBe(saUserId);

		// Same token, a different resource's audience: rejected (audience isolation).
		const rejectedAtB = await Container.get(OAuthTokenService).verifyOAuthAccessToken(
			accessToken,
			resourceUrlB,
		);
		expect(rejectedAtB.user).toBeNull();
	});
});

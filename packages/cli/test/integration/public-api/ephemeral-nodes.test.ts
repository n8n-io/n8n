import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import handlers from '@/public-api/v1/handlers/ephemeral-nodes/ephemeral-nodes.handler';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authUnscopedAgent: SuperAgentTest;

// Fixtures cover the two cases the active tests need to distinguish:
//   - VersionedNodeType nodes (multiple entries sharing a `name`, each with a
//     scalar `version` and a shared `defaultVersion`) — modelling how
//     `directory-loader.ts` actually populates `types.nodes`. HTTP Request
//     appears 3× to exercise the collapse-to-`defaultVersion` path.
//   - A non-allowlisted node (Slack) that would otherwise pass structural
//     filters — proves `EPHEMERAL_NODE_ALLOWLIST` is the gate.
const nodeFixtures: INodeTypeDescription[] = [
	{
		name: 'n8n-nodes-base.httpRequest',
		displayName: 'HTTP Request',
		description: 'Makes an HTTP request and returns the response',
		group: ['input'],
		version: 1,
		defaultVersion: 4.2,
		codex: { categories: ['Core Nodes'] },
		credentials: [{ name: 'legacyHttpAuth' }],
	} as INodeTypeDescription,
	{
		name: 'n8n-nodes-base.httpRequest',
		displayName: 'HTTP Request',
		description: 'Makes an HTTP request and returns the response',
		group: ['input'],
		version: 4,
		defaultVersion: 4.2,
		codex: { categories: ['Core Nodes'] },
		credentials: [{ name: 'httpBasicAuth' }, { name: 'httpHeaderAuth' }],
	} as INodeTypeDescription,
	{
		name: 'n8n-nodes-base.httpRequest',
		displayName: 'HTTP Request',
		description: 'Makes an HTTP request and returns the response',
		group: ['input'],
		version: 4.2,
		defaultVersion: 4.2,
		codex: { categories: ['Core Nodes'] },
		credentials: [{ name: 'httpBasicAuth' }, { name: 'httpHeaderAuth' }, { name: 'oAuth2Api' }],
	} as INodeTypeDescription,
	{
		name: 'n8n-nodes-base.slack',
		displayName: 'Slack',
		description: 'Consume Slack API',
		group: ['output'],
		version: 2,
		codex: { categories: ['Communication'] },
		credentials: [{ name: 'slackApi' }],
	} as INodeTypeDescription,
];

let unscopedMember: User;

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();
	// A member API key that explicitly does NOT carry `ephemeralNode:read` —
	// used to assert 403 on the gated list endpoint and the discover hide.
	unscopedMember = await createMemberWithApiKey({ scopes: ['user:read'] });

	// The handler reads from `LoadNodesAndCredentials.types.nodes` via
	// `collectTypes()`. In production this is populated by `postProcessLoaders`;
	// the test harness's `initNodeTypes` only populates `loaded.nodes`, so we
	// seed `types.nodes` directly with the fixtures above.
	Container.get(LoadNodesAndCredentials).types.nodes = nodeFixtures;
});

beforeEach(() => {
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
	authUnscopedAgent = testServer.publicApiAgentFor(unscopedMember);
});

describe('GET /ephemeral-nodes', () => {
	test('returns 401 without API key', async () => {
		await testServer.publicApiAgentWithoutApiKey().get('/ephemeral-nodes').expect(401);
	});

	test('returns only the allowlisted subset of the catalogue', async () => {
		const response = await authOwnerAgent.get('/ephemeral-nodes').expect(200);

		expect(response.body.nextCursor).toBeNull();

		const names = response.body.data.map((n: { nodeType: string }) => n.nodeType);
		// Fixture seeds httpRequest + slack; only allowlisted entries surface.
		// v1 ships with `httpRequest` only.
		expect(names).toEqual(['n8n-nodes-base.httpRequest']);
	});

	test('returns the same catalogue for any authenticated member', async () => {
		const response = await authMemberAgent.get('/ephemeral-nodes').expect(200);

		const names = response.body.data.map((n: { nodeType: string }) => n.nodeType);
		expect(names).toEqual(['n8n-nodes-base.httpRequest']);
	});

	test('collapses VersionedNodeType entries to the `defaultVersion` row', async () => {
		const response = await authOwnerAgent
			.get('/ephemeral-nodes')
			.query({ nodeType: 'n8n-nodes-base.httpRequest' })
			.expect(200);

		// The fixture seeds 3 HTTP Request rows (v1, v4, v4.2); only the
		// `defaultVersion: 4.2` row should surface. `supportedCredentialTypes`
		// comes from EPHEMERAL_NODE_ALLOWLIST (curated), not from the
		// descriptor's `credentials[]`.
		expect(response.body.data).toEqual([
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4.2,
				displayName: 'HTTP Request',
				description: 'Makes an HTTP request and returns the response',
				category: 'Core Nodes',
				supportedCredentialTypes: ['httpBearerAuth'],
			},
		]);
	});

	test('filters by `nodeType` query parameter', async () => {
		const response = await authOwnerAgent
			.get('/ephemeral-nodes')
			.query({ nodeType: 'n8n-nodes-base.httpRequest' })
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].nodeType).toBe('n8n-nodes-base.httpRequest');
	});

	test('returns an empty array for a non-allowlisted `nodeType`', async () => {
		// Slack exists in the fixture and would pass structural filters, but
		// it's not in EPHEMERAL_NODE_ALLOWLIST, so the API treats it the same
		// as an unknown node.
		const response = await authOwnerAgent
			.get('/ephemeral-nodes')
			.query({ nodeType: 'n8n-nodes-base.slack' })
			.expect(200);

		expect(response.body).toEqual({ data: [], nextCursor: null });
	});

	test('returns an empty array for an unknown `nodeType`', async () => {
		const response = await authOwnerAgent
			.get('/ephemeral-nodes')
			.query({ nodeType: 'does-not-exist' })
			.expect(200);

		expect(response.body).toEqual({ data: [], nextCursor: null });
	});

	test('paginates with limit + cursor (single-entry allowlist)', async () => {
		// With only `httpRequest` allowlisted, the catalogue has one entry —
		// limit=1 returns it with no further cursor. Multi-page pagination is
		// covered by the shared paginateArray() utility's own tests.
		const response = await authOwnerAgent.get('/ephemeral-nodes').query({ limit: 1 }).expect(200);

		expect(response.body.data.map((n: { nodeType: string }) => n.nodeType)).toEqual([
			'n8n-nodes-base.httpRequest',
		]);
		expect(response.body.nextCursor).toBeNull();
	});

	test('returns 403 without ephemeralNode:read scope', async () => {
		await authUnscopedAgent.get('/ephemeral-nodes').expect(403);
	});
});

describe('GET /discover lists ephemeral-nodes', () => {
	// Discover filters endpoints by the caller's scope set (see
	// discover.service.ts — `ep.scope === null || scopeSet.has(ep.scope)`).
	test('any owner with ephemeralNode:read sees the ephemeralnode resource', async () => {
		const response = await authOwnerAgent.get('/discover').expect(200);

		const resourceKeys = Object.keys(response.body.data.resources);
		// Resource key derives from the OpenAPI `tags` entry (lower-cased).
		// `EphemeralNode` → `ephemeralnode`.
		expect(resourceKeys).toContain('ephemeralnode');

		const ephemeralNodeResource = response.body.data.resources.ephemeralnode;
		const operationIds = ephemeralNodeResource.endpoints.map(
			(e: { operationId: string }) => e.operationId,
		);
		expect(operationIds).toContain('listEphemeralNodes');
	});

	test('any member with ephemeralNode:read also sees the ephemeralnode resource', async () => {
		const response = await authMemberAgent.get('/discover').expect(200);

		const resourceKeys = Object.keys(response.body.data.resources);
		expect(resourceKeys).toContain('ephemeralnode');
	});

	test('caller without ephemeralNode:read does not see the ephemeralnode resource', async () => {
		const response = await authUnscopedAgent.get('/discover').expect(200);

		const resourceKeys = Object.keys(response.body.data.resources);
		expect(resourceKeys).not.toContain('ephemeralnode');
	});
});

describe('listEphemeralNodes handler middleware', () => {
	test('handler is gated by ephemeralNode:read scope', () => {
		const middlewareChain = handlers.listEphemeralNodes as unknown as Array<
			Record<string, unknown>
		>;
		const scopedMiddleware = middlewareChain.find(
			(mw) => typeof mw === 'function' && '__apiKeyScope' in mw,
		) as { __apiKeyScope: string } | undefined;

		expect(scopedMiddleware).toBeDefined();
		expect(scopedMiddleware?.__apiKeyScope).toBe('ephemeralNode:read');
	});
});

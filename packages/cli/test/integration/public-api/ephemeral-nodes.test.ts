import type { User } from '@n8n/db';

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

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();
});

beforeEach(() => {
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
	// Skipped tests below reference an "unscoped" agent (an API key that does
	// not hold `node:read`). Wire it up here so type-checking stays green and
	// the body is ready to re-enable. Today it's the same as the member agent
	// because there's no scope to lack.
	authUnscopedAgent = testServer.publicApiAgentFor(member);
});

describe('GET /ephemeral-nodes', () => {
	test('returns 401 without API key', async () => {
		await testServer.publicApiAgentWithoutApiKey().get('/ephemeral-nodes').expect(401);
	});

	test('returns 200 with stub catalogue for any authenticated owner', async () => {
		const response = await authOwnerAgent.get('/ephemeral-nodes').expect(200);

		expect(response.body).toEqual({ data: [], nextCursor: null });
	});

	test('returns 200 with stub catalogue for any authenticated member', async () => {
		const response = await authMemberAgent.get('/ephemeral-nodes').expect(200);

		expect(response.body).toEqual({ data: [], nextCursor: null });
	});

	test('accepts the documented query params without rejecting', async () => {
		// Validation only — the stub returns an empty list regardless.
		const response = await authOwnerAgent
			.get('/ephemeral-nodes')
			.query({ nodeType: 'n8n-nodes-base.httpRequest', limit: 50 })
			.expect(200);

		expect(response.body).toEqual({ data: [], nextCursor: null });
	});

	// Skipped: flip to `test(...)` when Engineer A's permissions PR lands and
	// the handler gates with `apiKeyHasScopeWithGlobalScopeFallback({ scope: 'node:read' })`.
	// The owner/member fixtures will need explicit `{ scopes: [...] }` then — one
	// holding `node:read`, one without.
	test.skip('returns 403 without node:read scope', async () => {
		await authUnscopedAgent.get('/ephemeral-nodes').expect(403);
	});
});

describe('GET /discover lists ephemeral-nodes', () => {
	// Discover treats `scope: null` endpoints as visible to everyone (see
	// discover.service.ts — `ep.scope === null || scopeSet.has(ep.scope)`).
	test('any authenticated owner sees the ephemeralnode resource', async () => {
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

	test('any authenticated member also sees the ephemeralnode resource', async () => {
		const response = await authMemberAgent.get('/discover').expect(200);

		const resourceKeys = Object.keys(response.body.data.resources);
		expect(resourceKeys).toContain('ephemeralnode');
	});

	// Skipped: flip to `test(...)` when the handler is scope-gated. Discover
	// will then hide the resource from callers without `node:read`.
	test.skip('owner without node:read does not see the ephemeralnode resource', async () => {
		const response = await authUnscopedAgent.get('/discover').expect(200);

		const resourceKeys = Object.keys(response.body.data.resources);
		expect(resourceKeys).not.toContain('ephemeralnode');
	});
});

describe('listEphemeralNodes handler middleware', () => {
	// Swap-back guard: when the permissions PR adds `node:read`,
	// this handler MUST be updated to gate with
	// `apiKeyHasScopeWithGlobalScopeFallback({ scope: 'node:read' })`. That
	// At that point this assertion flips and you need to:
	//   1. Replace this test body with `expect(hasScopedMiddleware).toBe(true)`
	//      (or just delete this suite — the 401/403 coverage proves auth+scope).
	//   2. Uncomment the 403 case in the `GET /ephemeral-nodes` suite for callers
	//      lacking `node:read`.
	//   3. Uncomment the "without node:read does not see…" case in the discover suite.
	test('handler is currently auth-only (no scope middleware) — swap when permissions PR lands', () => {
		const middlewareChain = handlers.listEphemeralNodes as unknown as Array<
			Record<string, unknown>
		>;
		const hasScopedMiddleware = middlewareChain.some(
			(mw) => typeof mw === 'function' && '__apiKeyScope' in mw,
		);

		expect(hasScopedMiddleware).toBe(false);
	});
});

/**
 * Locks in the four-call discovery flow an external client (e.g. Claude) walks
 * to drive `POST /ephemeral-nodes/execute`:
 *
 *   1. GET /credentials   → needs id, name, type per item
 *   2. GET /projects      → needs id, name per item
 *   3. GET /ephemeral-nodes → contract-only stub today
 *   4. GET /discover      → must list all three resources for the caller
 *
 * If a field drops out of any of the response shapes this test catches it.
 *
 * NOTE: /ephemeral-nodes is currently auth-only (no scope gate) pending
 * Engineer A's permissions PR. See `ephemeral-nodes.handler.ts` for context.
 */

import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';

import { saveCredential } from '../shared/db/credentials';
import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	enabledFeatures: ['feat:projectRole:admin'],
	quotas: { 'quota:maxTeamProjects': -1 },
});

let owner: User;
let authAgent: SuperAgentTest;

beforeAll(async () => {
	await utils.initCredentialsTypes();
	owner = await createOwnerWithApiKey({
		scopes: ['credential:list', 'project:list'],
	});
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
	authAgent = testServer.publicApiAgentFor(owner);
});

describe('Ephemeral nodes discovery flow contract', () => {
	test('GET /credentials returns id, name, type for every item', async () => {
		await saveCredential(
			{ name: 'My GitHub', type: 'githubApi', data: { accessToken: 'x' } },
			{ user: owner, role: 'credential:owner' },
		);

		const response = await authAgent.get('/credentials').expect(200);

		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThan(0);

		for (const credential of response.body.data) {
			expect(typeof credential.id).toBe('string');
			expect(typeof credential.name).toBe('string');
			expect(typeof credential.type).toBe('string');
		}
	});

	test('GET /projects returns id, name for every item', async () => {
		await createTeamProject();

		const response = await authAgent.get('/projects').expect(200);

		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThan(0);

		for (const project of response.body.data) {
			expect(typeof project.id).toBe('string');
			expect(typeof project.name).toBe('string');
		}
	});

	test('GET /ephemeral-nodes returns the documented stub shape', async () => {
		const response = await authAgent.get('/ephemeral-nodes').expect(200);

		expect(response.body).toEqual({ data: [], nextCursor: null });
	});

	test('GET /discover surfaces credentials, projects, and ephemeralnode for the same API key', async () => {
		const response = await authAgent.get('/discover').expect(200);

		const resourceKeys = Object.keys(response.body.data.resources);
		expect(resourceKeys).toEqual(
			expect.arrayContaining(['credential', 'projects', 'ephemeralnode']),
		);
	});

	// Skipped: flip to `test(...)` when Engineer A's permissions PR lands.
	// Also add `'node:read'` to the `createOwnerWithApiKey` scopes in `beforeAll`.
	// Sanity check that one API key can hold all three scopes Claude needs.
	test.skip('A single API key can carry credential:list + project:list + node:read', async () => {
		const response = await authAgent.get('/discover').expect(200);

		expect(response.body.data.scopes).toEqual(
			expect.arrayContaining(['credential:list', 'project:list', 'node:read']),
		);
	});
});

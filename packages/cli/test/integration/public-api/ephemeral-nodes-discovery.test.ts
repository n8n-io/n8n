/**
 * Locks in the four-call discovery flow an external client (e.g. Claude) walks
 * to drive `POST /ephemeral-nodes/execute`:
 *
 *   1. GET /credentials   → needs id, name, type per item
 *   2. GET /projects      → needs id, name per item
 *   3. GET /ephemeral-nodes → needs nodeType, nodeTypeVersion, displayName, description per item
 *   4. GET /discover      → must list all three resources for the caller
 *
 * If a field drops out of any of the response shapes this test catches it.
 */

import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

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
		scopes: ['credential:list', 'project:list', 'ephemeralNode:read'],
	});

	// One executable fixture is enough to exercise the response shape this
	// contract test guards. See `ephemeral-nodes.test.ts` for the full
	// filter/pagination/mapping coverage.
	Container.get(LoadNodesAndCredentials).types.nodes = [
		{
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			description: 'Makes an HTTP request and returns the response',
			group: ['input'],
			version: 4.2,
			codex: { categories: ['Core Nodes'] },
			credentials: [{ name: 'httpBasicAuth' }],
		} as INodeTypeDescription,
	];
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

	test('GET /ephemeral-nodes returns nodeType, nodeTypeVersion, and displayName for every item', async () => {
		const response = await authAgent.get('/ephemeral-nodes').expect(200);

		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThan(0);

		for (const node of response.body.data) {
			expect(typeof node.nodeType).toBe('string');
			expect(typeof node.nodeTypeVersion).toBe('number');
			expect(typeof node.displayName).toBe('string');
			expect(typeof node.description).toBe('string');
			expect(Array.isArray(node.supportedCredentialTypes)).toBe(true);
		}
	});

	test('GET /discover surfaces credentials, projects, and ephemeralnode for the same API key', async () => {
		const response = await authAgent.get('/discover').expect(200);

		const resourceKeys = Object.keys(response.body.data.resources);
		expect(resourceKeys).toEqual(
			expect.arrayContaining(['credential', 'projects', 'ephemeralnode']),
		);
	});

	// Sanity check that one API key can hold all three scopes an LLM client needs.
	test('A single API key can carry credential:list + project:list + ephemeralNode:read', async () => {
		const response = await authAgent.get('/discover').expect(200);

		expect(response.body.data.scopes).toEqual(
			expect.arrayContaining(['credential:list', 'project:list', 'ephemeralNode:read']),
		);
	});
});

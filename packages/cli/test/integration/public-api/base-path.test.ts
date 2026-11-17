import type { User } from '@n8n/db';

import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi', 'auth'],
	basePath: '/n8n',
});

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
});

beforeEach(() => {
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

describe('Public API base path', () => {
	test('should route requests through the base-path-prefixed OpenAPI server path', async () => {
		const response = await authOwnerAgent.get('/discover');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.resources).toBeDefined();
	});

	test('returns OpenAPI YAML with the base-path-prefixed server URL', async () => {
		const response = await authOwnerAgent.get('/openapi.yml');

		expect(response.statusCode).toBe(200);
		expect(response.headers['content-type']).toMatch(/yaml|text/);
		expect(response.text).toContain('/n8n/api/v1');
		expect(response.text).not.toContain('url: /api/v1');
	});
});

describe('REST agents under a base path', () => {
	test('should send authenticated REST requests through the base path', async () => {
		const response = await testServer.authAgentFor(owner).get('/login');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.id).toBe(owner.id);
	});
});

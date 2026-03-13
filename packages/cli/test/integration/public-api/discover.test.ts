import type { User } from '@n8n/db';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();
});

beforeEach(() => {
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

const testWithAPIKey = (method: 'get', url: string, apiKey: string | null) => async () => {
	void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
	const response = await authOwnerAgent[method](url);
	expect(response.statusCode).toBe(401);
};

describe('GET /discover', () => {
	test('should fail when no API key header is sent', async () => {
		const unauthAgent = testServer.publicApiAgentWithoutApiKey();
		const response = await unauthAgent.get('/discover');
		expect(response.statusCode).toBe(401);
	});

	test('should fail due to missing API Key', testWithAPIKey('get', '/discover', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/discover', 'abcXYZ'));

	test('should return discover data for owner', async () => {
		const response = await authOwnerAgent.get('/discover');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeDefined();
		expect(response.body.data.scopes).toBeInstanceOf(Array);
		expect(response.body.data.scopes.length).toBeGreaterThan(0);
		expect(response.body.data.resources).toBeDefined();
		expect(response.body.data.specUrl).toBe('/api/v1/openapi.yml');
	});

	test('should return discover data for member', async () => {
		const response = await authMemberAgent.get('/discover');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.scopes).toBeInstanceOf(Array);
		expect(response.body.data.scopes.length).toBeGreaterThan(0);
		expect(response.body.data.resources).toBeDefined();
	});

	test('owner should see at least as many resources as member', async () => {
		const ownerResponse = await authOwnerAgent.get('/discover');
		const memberResponse = await authMemberAgent.get('/discover');

		const ownerResourceKeys = Object.keys(ownerResponse.body.data.resources);
		const memberResourceKeys = Object.keys(memberResponse.body.data.resources);

		expect(ownerResourceKeys.length).toBeGreaterThanOrEqual(memberResourceKeys.length);
	});

	test('should include method, path, and operationId in every endpoint', async () => {
		const response = await authOwnerAgent.get('/discover');
		const resources = response.body.data.resources;

		for (const resource of Object.values(resources)) {
			expect((resource as any).endpoints.length).toBeGreaterThan(0);
			for (const endpoint of (resource as any).endpoints) {
				expect(endpoint.method).toBeDefined();
				expect(endpoint.path).toBeDefined();
				expect(endpoint.operationId).toBeDefined();
				expect(endpoint.path).toMatch(/^\/api\/v1\//);
			}
		}
	});

	test('should include operations array for each resource', async () => {
		const response = await authOwnerAgent.get('/discover');
		const resources = response.body.data.resources;

		for (const resource of Object.values(resources)) {
			expect((resource as any).operations).toBeInstanceOf(Array);
		}
	});

	test('should not include requestSchema without ?include=schemas', async () => {
		const response = await authOwnerAgent.get('/discover');
		const allEndpoints = Object.values(response.body.data.resources).flatMap(
			(r: any) => r.endpoints,
		);
		const withSchema = allEndpoints.filter((e: any) => 'requestSchema' in e);
		expect(withSchema).toHaveLength(0);
	});

	test('should include requestSchema with ?include=schemas', async () => {
		const response = await authOwnerAgent.get('/discover?include=schemas');
		expect(response.statusCode).toBe(200);

		const allEndpoints = Object.values(response.body.data.resources).flatMap(
			(r: any) => r.endpoints,
		);
		const withSchema = allEndpoints.filter((e: any) => 'requestSchema' in e);
		expect(withSchema.length).toBeGreaterThan(0);

		for (const endpoint of withSchema) {
			expect((endpoint as Record<string, unknown>).requestSchema).toHaveProperty('type');
		}
	});

	test('should filter to a single resource with ?resource=tags', async () => {
		const response = await authOwnerAgent.get('/discover?resource=tags');
		expect(response.statusCode).toBe(200);

		const resourceKeys = Object.keys(response.body.data.resources);
		expect(resourceKeys).toEqual(['tags']);
	});

	test('should return empty resources for unknown resource filter', async () => {
		const response = await authOwnerAgent.get('/discover?resource=nonexistent');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.resources).toEqual({});
	});
});

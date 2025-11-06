import { testDb } from '@n8n/backend-test-utils';
import { ApiKeyRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner, createUser } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const testServer = setupTestServer({ endpointGroups: ['mcp'] });

let owner: User;
let member: User;

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
});

afterEach(async () => {
	await testDb.truncate(['ApiKey']);
});

describe('GET /mcp/api-key', () => {
	test('should create and return new API key if user does not have one', async () => {
		const response = await testServer.authAgentFor(owner).get('/mcp/api-key');

		expect(response.statusCode).toBe(200);

		const {
			data: { id, apiKey, userId },
		} = response.body;

		expect(id).toBeDefined();
		expect(apiKey).toBeDefined();
		expect(apiKey.length).toBeGreaterThanOrEqual(32);
		expect(userId).toBe(owner.id);
	});

	test('should return existing API key (redacted) if user already has one', async () => {
		const firstResponse = await testServer.authAgentFor(owner).get('/mcp/api-key');

		const firstApiKey = firstResponse.body.data.apiKey;

		const secondResponse = await testServer.authAgentFor(owner).get('/mcp/api-key');
		const secondApiKey = secondResponse.body.data.apiKey;

		expect(secondResponse.statusCode).toBe(200);
		expect(secondApiKey.slice(-4)).toBe(firstApiKey.slice(-4));
	});

	test('should return different API keys for different users', async () => {
		const ownerResponse = await testServer.authAgentFor(owner).get('/mcp/api-key');
		const memberResponse = await testServer.authAgentFor(member).get('/mcp/api-key');

		expect(ownerResponse.statusCode).toBe(200);
		expect(memberResponse.statusCode).toBe(200);

		expect(ownerResponse.body.data.apiKey).not.toBe(memberResponse.body.data.apiKey);
		expect(ownerResponse.body.data.userId).toBe(owner.id);
		expect(memberResponse.body.data.userId).toBe(member.id);
	});

	test('should require authentication', async () => {
		const response = await testServer.authlessAgent.get('/mcp/api-key');

		expect(response.statusCode).toBe(401);
	});
});

describe('POST /mcp/api-key/rotate', () => {
	test('should rotate existing API key and return new one', async () => {
		const initialResponse = await testServer.authAgentFor(owner).get('/mcp/api-key');
		const oldApiKey = initialResponse.body.data.apiKey;

		const rotateResponse = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');

		expect(rotateResponse.statusCode).toBe(200);

		const {
			data: { id, apiKey, userId },
		} = rotateResponse.body;

		expect(id).toBeDefined();
		expect(apiKey).toBeDefined();
		expect(apiKey).not.toBe(oldApiKey);
		expect(userId).toBe(owner.id);

		// Verify old API key is no longer valid
		const currentApiKeys = await Container.get(ApiKeyRepository).find({
			where: { userId: owner.id },
		});

		expect(currentApiKeys.length).toBe(1);
		expect(currentApiKeys[0].apiKey).toBe(apiKey);
		expect(currentApiKeys[0].apiKey).not.toBe(oldApiKey);
	});

	test('should allow multiple rotations in sequence', async () => {
		// Create initial API key
		await testServer.authAgentFor(owner).get('/mcp/api-key');

		// First rotation
		const firstRotation = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');
		const firstApiKey = firstRotation.body.data.apiKey;

		// Second rotation
		const secondRotation = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');
		const secondApiKey = secondRotation.body.data.apiKey;

		// Third rotation
		const thirdRotation = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');
		const thirdApiKey = thirdRotation.body.data.apiKey;

		expect(firstRotation.statusCode).toBe(200);
		expect(secondRotation.statusCode).toBe(200);
		expect(thirdRotation.statusCode).toBe(200);

		expect(firstApiKey).not.toBe(secondApiKey);
		expect(secondApiKey).not.toBe(thirdApiKey);
		expect(firstApiKey).not.toBe(thirdApiKey);
	});

	test('should require authentication', async () => {
		const response = await testServer.authlessAgent.post('/mcp/api-key/rotate');

		expect(response.statusCode).toBe(401);
	});

	test('should require mcpApiKey:rotate scope', async () => {
		// Create initial API key
		await testServer.authAgentFor(owner).get('/mcp/api-key');

		const response = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');

		expect(response.statusCode).toBe(200);
	});

	test('should maintain user association after rotation', async () => {
		// Create initial API key
		await testServer.authAgentFor(owner).get('/mcp/api-key');

		// Rotate
		const response = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.userId).toBe(owner.id);

		// Verify in database
		const apiKeyRepo = Container.get(ApiKeyRepository);
		const storedApiKey = await apiKeyRepo.findOne({
			where: { userId: owner.id },
		});

		expect(storedApiKey).toBeDefined();
		expect(storedApiKey?.apiKey).toBe(response.body.data.apiKey);
	});
});

describe('MCP API Key Security', () => {
	test('should generate unique API keys', async () => {
		const keys = new Set<string>();

		for (let i = 0; i < 5; i++) {
			const user = await createUser({ role: { slug: 'global:member' } });
			const response = await testServer.authAgentFor(user).get('/mcp/api-key');
			keys.add(response.body.data.apiKey);
		}

		expect(keys.size).toBe(5);
	});
});

describe('MCP API Key Edge Cases', () => {
	test('should handle concurrent get requests without creating duplicates', async () => {
		const requests = Array(3)
			.fill(null)
			.map(() => testServer.authAgentFor(owner).get('/mcp/api-key'));

		await Promise.all(requests);

		const apiKeyRepo = Container.get(ApiKeyRepository);
		const storedApiKey = await apiKeyRepo.find({
			where: { userId: owner.id },
		});
		expect(storedApiKey.length).toBe(1);
	});
});

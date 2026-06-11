import type { ApiKeyWithRawValue } from '@n8n/api-types';
import { testDb, randomValidPassword, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { ApiKeyRepository, GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	getApiKeyScopesForRole,
	getOwnerOnlyApiKeyScopes,
	type ApiKeyScope,
} from '@n8n/permissions';
import { PublicApiKeyService } from '@/services/public-api-key.service';

import {
	createAdmin,
	createMemberWithApiKey,
	createOwnerWithApiKey,
	createUser,
	createUserShell,
} from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['apiKeys'] });
let publicApiKeyService: PublicApiKeyService;

beforeAll(() => {
	publicApiKeyService = Container.get(PublicApiKeyService);
});

beforeEach(async () => {
	await testDb.truncate(['User']);
	mockInstance(GlobalConfig, { publicApi: { disabled: false } });
});

describe('When public API is disabled', () => {
	let owner: User;
	let authAgent: SuperAgentTest;

	beforeEach(async () => {
		owner = await createOwnerWithApiKey();

		authAgent = testServer.authAgentFor(owner);
		mockInstance(GlobalConfig, { publicApi: { disabled: true } });
	});

	test('POST /api-keys should 404', async () => {
		await authAgent.post('/api-keys').expect(404);
	});

	test('GET /api-keys should 404', async () => {
		await authAgent.get('/api-keys').expect(404);
	});

	test('DELETE /api-key/:id should 404', async () => {
		await authAgent.delete(`/api-keys/${1}`).expect(404);
	});
});

describe('Owner shell', () => {
	let ownerShell: User;

	beforeEach(async () => {
		ownerShell = await createUserShell(GLOBAL_OWNER_ROLE);
	});

	test('POST /api-keys should create an api key with no expiration', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['workflow:create'] });

		const newApiKey = newApiKeyResponse.body.data as ApiKeyWithRawValue;

		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: ownerShell.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'My API Key',
			userId: ownerShell.id,
			apiKey: newApiKey.rawApiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
		});

		expect(newApiKey.expiresAt).toBeNull();
		expect(newApiKey.rawApiKey).toBeDefined();
	});

	test('POST /api-keys should fail to create api key with invalid scope', async () => {
		await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['wrong'] })
			.expect(400);
	});

	test('POST /api-keys should create an api key with expiration', async () => {
		const expiresAt = Date.now() + 1000;

		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt, scopes: ['workflow:create'] });

		const newApiKey = newApiKeyResponse.body.data as ApiKeyWithRawValue;

		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: ownerShell.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'My API Key',
			userId: ownerShell.id,
			apiKey: newApiKey.rawApiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
		});

		expect(newApiKey.expiresAt).toBe(expiresAt);
		expect(newApiKey.rawApiKey).toBeDefined();
	});

	test("POST /api-keys should create an api key with scopes allow in the user's role", async () => {
		const expiresAt = Date.now() + 1000;

		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt, scopes: ['user:create'] });

		const newApiKey = newApiKeyResponse.body.data as ApiKeyWithRawValue;

		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: ownerShell.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'My API Key',
			userId: ownerShell.id,
			apiKey: newApiKey.rawApiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			scopes: ['user:create'],
			audience: 'public-api',
			lastUsedAt: null,
		});

		expect(newApiKey.expiresAt).toBe(expiresAt);
		expect(newApiKey.rawApiKey).toBeDefined();
	});

	test('PATCH /api-keys should update API key label', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['user:create'] });

		const newApiKey = newApiKeyResponse.body.data as ApiKeyWithRawValue;

		await testServer
			.authAgentFor(ownerShell)
			.patch(`/api-keys/${newApiKey.id}`)
			.send({ label: 'updated label', scopes: ['user:create'] });

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: ownerShell.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'updated label',
			userId: ownerShell.id,
			apiKey: newApiKey.rawApiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			scopes: ['user:create'],
			audience: 'public-api',
			lastUsedAt: null,
		});
	});

	test('PATCH /api-keys should update API key scopes', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['user:create'] });

		const newApiKey = newApiKeyResponse.body.data as ApiKeyWithRawValue;

		await testServer
			.authAgentFor(ownerShell)
			.patch(`/api-keys/${newApiKey.id}`)
			.send({ label: 'updated label', scopes: ['user:create', 'workflow:create'] });

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: ownerShell.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'updated label',
			userId: ownerShell.id,
			apiKey: newApiKey.rawApiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			scopes: ['user:create', 'workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
		});
	});

	test('PATCH /api-keys should not modify API key expiration', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['user:create'] });

		const newApiKey = newApiKeyResponse.body.data as ApiKeyWithRawValue;

		await testServer
			.authAgentFor(ownerShell)
			.patch(`/api-keys/${newApiKey.id}`)
			.send({ label: 'updated label', expiresAt: 123, scopes: ['user:create'] });

		const getApiKeysResponse = await testServer.authAgentFor(ownerShell).get('/api-keys');

		const allApiKeys = getApiKeysResponse.body.data.items as ApiKeyWithRawValue[];

		const updatedApiKey = allApiKeys.find((apiKey) => apiKey.id === newApiKey.id);

		expect(updatedApiKey?.expiresAt).toBe(null);
	});

	test('GET /api-keys should fetch the api key redacted', async () => {
		const expirationDateInTheFuture = Date.now() + 1000;

		const apiKeyWithNoExpiration = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['workflow:create'] });

		const apiKeyWithExpiration = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({
				label: 'My API Key 2',
				expiresAt: expirationDateInTheFuture,
				scopes: ['workflow:create'],
			});

		const retrieveAllApiKeysResponse = await testServer.authAgentFor(ownerShell).get('/api-keys');

		expect(retrieveAllApiKeysResponse.statusCode).toBe(200);

		const expectedOwner = {
			id: ownerShell.id,
			firstName: ownerShell.firstName ?? null,
			lastName: ownerShell.lastName ?? null,
			email: ownerShell.email,
		};

		expect(retrieveAllApiKeysResponse.body.data.counts.all).toBe(2);
		expect(retrieveAllApiKeysResponse.body.data.items[0]).toEqual({
			id: apiKeyWithExpiration.body.data.id,
			label: 'My API Key 2',
			userId: ownerShell.id,
			apiKey: publicApiKeyService.redactApiKey(apiKeyWithExpiration.body.data.rawApiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			expiresAt: expirationDateInTheFuture,
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
			owner: expectedOwner,
		});

		expect(retrieveAllApiKeysResponse.body.data.items[1]).toEqual({
			id: apiKeyWithNoExpiration.body.data.id,
			label: 'My API Key',
			userId: ownerShell.id,
			apiKey: publicApiKeyService.redactApiKey(apiKeyWithNoExpiration.body.data.rawApiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			expiresAt: null,
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
			owner: expectedOwner,
		});
	});

	test('DELETE /api-keys/:id should delete the api key', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['workflow:create'] });

		const deleteApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.delete(`/api-keys/${newApiKeyResponse.body.data.id}`);

		const retrieveAllApiKeysResponse = await testServer.authAgentFor(ownerShell).get('/api-keys');

		expect(deleteApiKeyResponse.body.data.success).toBe(true);
		expect(retrieveAllApiKeysResponse.body.data.counts.all).toBe(0);
		expect(retrieveAllApiKeysResponse.body.data.items).toHaveLength(0);
	});

	test('GET /api-keys/scopes should return scopes for the role', async () => {
		const apiKeyScopesResponse = await testServer.authAgentFor(ownerShell).get('/api-keys/scopes');

		const scopes = apiKeyScopesResponse.body.data as ApiKeyScope[];

		const scopesForRole = getApiKeyScopesForRole(ownerShell);

		expect(scopes.sort()).toEqual(scopesForRole.sort());
	});
});

describe('Member', () => {
	const memberPassword = randomValidPassword();
	let member: User;

	beforeEach(async () => {
		member = await createUser({
			password: memberPassword,
			role: GLOBAL_MEMBER_ROLE,
		});
	});

	test('POST /api-keys should create an api key with no expiration', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(member)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['workflow:create'] });

		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKeyResponse.body.data.apiKey).toBeDefined();
		expect(newApiKeyResponse.body.data.apiKey).not.toBeNull();

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: member.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'My API Key',
			userId: member.id,
			apiKey: newApiKeyResponse.body.data.rawApiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
		});

		expect(newApiKeyResponse.body.data.expiresAt).toBeNull();
		expect(newApiKeyResponse.body.data.rawApiKey).toBeDefined();
	});

	test('POST /api-keys should create an api key with expiration', async () => {
		const expiresAt = Date.now() + 1000;

		const newApiKeyResponse = await testServer
			.authAgentFor(member)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt, scopes: ['workflow:create'] });

		const newApiKey = newApiKeyResponse.body.data as ApiKeyWithRawValue;

		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: member.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'My API Key',
			userId: member.id,
			apiKey: newApiKey.rawApiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
		});

		expect(newApiKey.expiresAt).toBe(expiresAt);
		expect(newApiKey.rawApiKey).toBeDefined();
	});

	test("POST /api-keys should create an api key with scopes allowed in the user's role", async () => {
		const expiresAt = Date.now() + 1000;

		const newApiKeyResponse = await testServer
			.authAgentFor(member)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt, scopes: ['workflow:create'] });

		const newApiKey = newApiKeyResponse.body.data as ApiKeyWithRawValue;

		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: member.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'My API Key',
			userId: member.id,
			apiKey: newApiKey.rawApiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
		});

		expect(newApiKey.expiresAt).toBe(expiresAt);
		expect(newApiKey.rawApiKey).toBeDefined();
	});

	test("POST /api-keys should fail to create api key with scopes not allowed in the user's role", async () => {
		const expiresAt = Date.now() + 1000;

		const notAllowedScope = getOwnerOnlyApiKeyScopes()[0];

		const newApiKeyResponse = await testServer
			.authAgentFor(member)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt, scopes: [notAllowedScope] });

		expect(newApiKeyResponse.statusCode).toBe(400);
	});

	test('GET /api-keys should fetch the api key redacted', async () => {
		const expirationDateInTheFuture = Date.now() + 1000;

		const apiKeyWithNoExpiration = await testServer
			.authAgentFor(member)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['workflow:create'] });

		const apiKeyWithExpiration = await testServer
			.authAgentFor(member)
			.post('/api-keys')
			.send({
				label: 'My API Key 2',
				expiresAt: expirationDateInTheFuture,
				scopes: ['workflow:create'],
			});

		const retrieveAllApiKeysResponse = await testServer.authAgentFor(member).get('/api-keys');

		expect(retrieveAllApiKeysResponse.statusCode).toBe(200);

		const expectedOwner = {
			id: member.id,
			firstName: member.firstName ?? null,
			lastName: member.lastName ?? null,
			email: member.email,
		};

		expect(retrieveAllApiKeysResponse.body.data.counts.all).toBe(2);
		expect(retrieveAllApiKeysResponse.body.data.items[0]).toEqual({
			id: apiKeyWithExpiration.body.data.id,
			label: 'My API Key 2',
			userId: member.id,
			apiKey: publicApiKeyService.redactApiKey(apiKeyWithExpiration.body.data.rawApiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			expiresAt: expirationDateInTheFuture,
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
			owner: expectedOwner,
		});

		expect(retrieveAllApiKeysResponse.body.data.items[1]).toEqual({
			id: apiKeyWithNoExpiration.body.data.id,
			label: 'My API Key',
			userId: member.id,
			apiKey: publicApiKeyService.redactApiKey(apiKeyWithNoExpiration.body.data.rawApiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			expiresAt: null,
			scopes: ['workflow:create'],
			audience: 'public-api',
			lastUsedAt: null,
			owner: expectedOwner,
		});
	});

	test('DELETE /api-keys/:id should delete the api key', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(member)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['workflow:create'] });

		const deleteApiKeyResponse = await testServer
			.authAgentFor(member)
			.delete(`/api-keys/${newApiKeyResponse.body.data.id}`);

		const retrieveAllApiKeysResponse = await testServer.authAgentFor(member).get('/api-keys');

		expect(deleteApiKeyResponse.body.data.success).toBe(true);
		expect(retrieveAllApiKeysResponse.body.data.counts.all).toBe(0);
		expect(retrieveAllApiKeysResponse.body.data.items).toHaveLength(0);
	});

	test('GET /api-keys/scopes should return scopes for the role', async () => {
		const apiKeyScopesResponse = await testServer.authAgentFor(member).get('/api-keys/scopes');

		const scopes = apiKeyScopesResponse.body.data as ApiKeyScope[];

		const scopesForRole = getApiKeyScopesForRole(member);

		expect(scopes.sort()).toEqual(scopesForRole.sort());
	});
});

describe('Pagination', () => {
	const seedKeys = async (user: User, count: number): Promise<string[]> => {
		const agent = testServer.authAgentFor(user);
		const ids: string[] = [];
		for (let i = 0; i < count; i++) {
			const res = await agent
				.post('/api-keys')
				.send({ label: `Key ${i}`, expiresAt: null, scopes: ['workflow:create'] });
			ids.push(res.body.data.id);
		}
		return ids;
	};

	test('GET /api-keys honors `take` and returns total count', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		await seedKeys(owner, 3);

		const response = await testServer.authAgentFor(owner).get('/api-keys?take=2').expect(200);

		expect(response.body.data.counts.all).toBe(3);
		expect(response.body.data.items).toHaveLength(2);
	});

	test('GET /api-keys honors `skip` to page through results', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		const createdIds = await seedKeys(owner, 3);

		const agent = testServer.authAgentFor(owner);
		const firstPage = await agent.get('/api-keys?take=2&skip=0').expect(200);
		const secondPage = await agent.get('/api-keys?take=2&skip=2').expect(200);

		expect(firstPage.body.data.items).toHaveLength(2);
		expect(secondPage.body.data.items).toHaveLength(1);

		const pagedIds = [...firstPage.body.data.items, ...secondPage.body.data.items].map(
			(k: { id: string }) => k.id,
		);
		expect(new Set(pagedIds)).toEqual(new Set(createdIds));
	});
});

describe('Sorting', () => {
	test('GET /api-keys sorts by label asc when sortBy=label:asc', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		const agent = testServer.authAgentFor(owner);
		for (const label of ['gamma', 'alpha', 'beta']) {
			await agent.post('/api-keys').send({ label, expiresAt: null, scopes: ['workflow:create'] });
		}

		const response = await agent.get('/api-keys?sortBy=label:asc').expect(200);

		const labels = (response.body.data.items as Array<{ label: string }>).map((k) => k.label);
		expect(labels).toEqual(['alpha', 'beta', 'gamma']);
	});

	test('GET /api-keys sorts by scope count when sortBy=scopes:desc', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		const agent = testServer.authAgentFor(owner);
		await agent
			.post('/api-keys')
			.send({ label: 'one-scope', expiresAt: null, scopes: ['workflow:create'] });
		await agent.post('/api-keys').send({
			label: 'three-scopes',
			expiresAt: null,
			scopes: ['workflow:create', 'workflow:read', 'workflow:delete'],
		});
		await agent.post('/api-keys').send({
			label: 'two-scopes',
			expiresAt: null,
			scopes: ['workflow:create', 'workflow:read'],
		});

		const response = await agent.get('/api-keys?sortBy=scopes:desc').expect(200);

		const labels = (response.body.data.items as Array<{ label: string }>).map((k) => k.label);
		expect(labels).toEqual(['three-scopes', 'two-scopes', 'one-scope']);
	});

	test('GET /api-keys rejects an unknown sortBy with 400', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		await testServer.authAgentFor(owner).get('/api-keys?sortBy=bogus:asc').expect(400);
	});
});

describe('Label search', () => {
	test('GET /api-keys treats % in the search string as a literal character', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		const agent = testServer.authAgentFor(owner);
		for (const label of ['100% complete', 'partial', 'fully done']) {
			await agent.post('/api-keys').send({ label, expiresAt: null, scopes: ['workflow:create'] });
		}

		const response = await agent.get('/api-keys?label=100%25').expect(200);

		const labels = (response.body.data.items as Array<{ label: string }>).map((k) => k.label);
		expect(labels).toEqual(['100% complete']);
	});

	test('GET /api-keys returns counts under filter and totals over the full list', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		const agent = testServer.authAgentFor(owner);
		for (const label of ['prod-a', 'prod-b', 'staging']) {
			await agent.post('/api-keys').send({ label, expiresAt: null, scopes: ['workflow:create'] });
		}

		const filtered = await agent.get('/api-keys?label=prod').expect(200);
		expect(filtered.body.data.counts.all).toBe(2);
		expect(filtered.body.data.totals.all).toBe(3);

		const unfiltered = await agent.get('/api-keys').expect(200);
		expect(unfiltered.body.data.counts.all).toBe(3);
		expect(unfiltered.body.data.totals.all).toBe(3);
	});
});

describe('Multi-value sortBy', () => {
	test('GET /api-keys rejects array sortBy with 400', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		await testServer
			.authAgentFor(owner)
			.get('/api-keys?sortBy=label:asc&sortBy=createdAt:desc')
			.expect(400);
	});
});

describe('Cross-user behavior (admin scope)', () => {
	test("GET /api-keys returns every user's keys for an owner", async () => {
		const ownerWithKey = await createOwnerWithApiKey();
		const memberWithKey = await createMemberWithApiKey();

		const response = await testServer.authAgentFor(ownerWithKey).get('/api-keys').expect(200);

		const ids = (response.body.data.items as Array<{ id: string }>).map((k) => k.id);
		expect(ids).toEqual(
			expect.arrayContaining([ownerWithKey.apiKeys[0].id, memberWithKey.apiKeys[0].id]),
		);
		expect(ids).toHaveLength(2);
	});

	test('GET /api-keys returns only the caller’s keys for a member', async () => {
		const memberWithKey = await createMemberWithApiKey();
		await createOwnerWithApiKey();

		const response = await testServer.authAgentFor(memberWithKey).get('/api-keys').expect(200);

		const ids = (response.body.data.items as Array<{ id: string }>).map((k) => k.id);
		expect(ids).toEqual([memberWithKey.apiKeys[0].id]);
	});

	test('DELETE /api-keys/:id 404s when a member targets another user’s key', async () => {
		const ownerWithKey = await createOwnerWithApiKey();
		const member = await createUser({ role: GLOBAL_MEMBER_ROLE });

		await testServer
			.authAgentFor(member)
			.delete(`/api-keys/${ownerWithKey.apiKeys[0].id}`)
			.expect(404);

		// Owner's key still exists.
		const ownerKeys = await Container.get(ApiKeyRepository).findBy({ userId: ownerWithKey.id });
		expect(ownerKeys).toHaveLength(1);
	});

	test('DELETE /api-keys/:id lets an admin revoke another user’s key', async () => {
		const admin = await createAdmin();
		const memberWithKey = await createMemberWithApiKey();

		await testServer
			.authAgentFor(admin)
			.delete(`/api-keys/${memberWithKey.apiKeys[0].id}`)
			.expect(200);

		const memberKeys = await Container.get(ApiKeyRepository).findBy({ userId: memberWithKey.id });
		expect(memberKeys).toHaveLength(0);
	});
});

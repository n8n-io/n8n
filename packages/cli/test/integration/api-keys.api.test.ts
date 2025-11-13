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
import { mock } from 'jest-mock-extended';

import type { License } from '@/license';
import { PublicApiKeyService } from '@/services/public-api-key.service';

import { createOwnerWithApiKey, createUser, createUserShell } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['apiKeys'] });
let publicApiKeyService: PublicApiKeyService;
const license = mock<License>();

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

		const allApiKeys = getApiKeysResponse.body.data as ApiKeyWithRawValue[];

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

		expect(retrieveAllApiKeysResponse.body.data[1]).toEqual({
			id: apiKeyWithExpiration.body.data.id,
			label: 'My API Key 2',
			userId: ownerShell.id,
			apiKey: publicApiKeyService.redactApiKey(apiKeyWithExpiration.body.data.rawApiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			expiresAt: expirationDateInTheFuture,
			scopes: ['workflow:create'],
			audience: 'public-api',
		});

		expect(retrieveAllApiKeysResponse.body.data[0]).toEqual({
			id: apiKeyWithNoExpiration.body.data.id,
			label: 'My API Key',
			userId: ownerShell.id,
			apiKey: publicApiKeyService.redactApiKey(apiKeyWithNoExpiration.body.data.rawApiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			expiresAt: null,
			scopes: ['workflow:create'],
			audience: 'public-api',
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
		expect(retrieveAllApiKeysResponse.body.data.length).toBe(0);
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
		await utils.setInstanceOwnerSetUp(true);
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
		});

		expect(newApiKey.expiresAt).toBe(expiresAt);
		expect(newApiKey.rawApiKey).toBeDefined();
	});

	test("POST /api-keys should create an api key with scopes allowed in the user's role", async () => {
		const expiresAt = Date.now() + 1000;
		license.isApiKeyScopesEnabled.mockReturnValue(true);

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
		});

		expect(newApiKey.expiresAt).toBe(expiresAt);
		expect(newApiKey.rawApiKey).toBeDefined();
	});

	test("POST /api-keys should fail to create api key with scopes not allowed in the user's role", async () => {
		const expiresAt = Date.now() + 1000;
		license.isApiKeyScopesEnabled.mockReturnValue(true);

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

		expect(retrieveAllApiKeysResponse.body.data[1]).toEqual({
			id: apiKeyWithExpiration.body.data.id,
			label: 'My API Key 2',
			userId: member.id,
			apiKey: publicApiKeyService.redactApiKey(apiKeyWithExpiration.body.data.rawApiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			expiresAt: expirationDateInTheFuture,
			scopes: ['workflow:create'],
			audience: 'public-api',
		});

		expect(retrieveAllApiKeysResponse.body.data[0]).toEqual({
			id: apiKeyWithNoExpiration.body.data.id,
			label: 'My API Key',
			userId: member.id,
			apiKey: publicApiKeyService.redactApiKey(apiKeyWithNoExpiration.body.data.rawApiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			expiresAt: null,
			scopes: ['workflow:create'],
			audience: 'public-api',
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
		expect(retrieveAllApiKeysResponse.body.data.length).toBe(0);
	});

	test('GET /api-keys/scopes should return scopes for the role', async () => {
		const apiKeyScopesResponse = await testServer.authAgentFor(member).get('/api-keys/scopes');

		const scopes = apiKeyScopesResponse.body.data as ApiKeyScope[];

		const scopesForRole = getApiKeyScopesForRole(member);

		expect(scopes.sort()).toEqual(scopesForRole.sort());
	});
});

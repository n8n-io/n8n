import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import type { ApiKey } from '@/databases/entities/api-key';
import type { User } from '@/databases/entities/user';
import { ApiKeyRepository } from '@/databases/repositories/api-key.repository';
import { PublicApiKeyService } from '@/services/public-api-key.service';
import { mockInstance } from '@test/mocking';

import { createOwnerWithApiKey, createUser, createUserShell } from './shared/db/users';
import { randomValidPassword } from './shared/random';
import * as testDb from './shared/test-db';
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
		ownerShell = await createUserShell('global:owner');
	});

	test('POST /api-keys should create an api key', async () => {
		const newApiKeyResponse = await testServer.authAgentFor(ownerShell).post('/api-keys');

		const newApiKey = newApiKeyResponse.body.data as ApiKey;

		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();

		const newStoredApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
			userId: ownerShell.id,
		});

		expect(newStoredApiKey).toEqual({
			id: expect.any(String),
			label: 'My API Key',
			userId: ownerShell.id,
			apiKey: newApiKey.apiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
	});

	test('GET /api-keys should fetch the api key redacted', async () => {
		const newApiKeyResponse = await testServer.authAgentFor(ownerShell).post('/api-keys');

		const retrieveAllApiKeysResponse = await testServer.authAgentFor(ownerShell).get('/api-keys');

		expect(retrieveAllApiKeysResponse.statusCode).toBe(200);

		expect(retrieveAllApiKeysResponse.body.data[0]).toEqual({
			id: newApiKeyResponse.body.data.id,
			label: 'My API Key',
			userId: ownerShell.id,
			apiKey: publicApiKeyService.redactApiKey(newApiKeyResponse.body.data.apiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
	});

	test('DELETE /api-keys/:id should delete the api key', async () => {
		const newApiKeyResponse = await testServer.authAgentFor(ownerShell).post('/api-keys');

		const deleteApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.delete(`/api-keys/${newApiKeyResponse.body.data.id}`);

		const retrieveAllApiKeysResponse = await testServer.authAgentFor(ownerShell).get('/api-keys');

		expect(deleteApiKeyResponse.body.data.success).toBe(true);
		expect(retrieveAllApiKeysResponse.body.data.length).toBe(0);
	});
});

describe('Member', () => {
	const memberPassword = randomValidPassword();
	let member: User;

	beforeEach(async () => {
		member = await createUser({
			password: memberPassword,
			role: 'global:member',
		});
		await utils.setInstanceOwnerSetUp(true);
	});

	test('POST /api-keys should create an api key', async () => {
		const newApiKeyResponse = await testServer.authAgentFor(member).post('/api-keys');

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
			apiKey: newApiKeyResponse.body.data.apiKey,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
	});

	test('GET /api-keys should fetch the api key redacted', async () => {
		const newApiKeyResponse = await testServer.authAgentFor(member).post('/api-keys');

		const retrieveAllApiKeysResponse = await testServer.authAgentFor(member).get('/api-keys');

		expect(retrieveAllApiKeysResponse.statusCode).toBe(200);

		expect(retrieveAllApiKeysResponse.body.data[0]).toEqual({
			id: newApiKeyResponse.body.data.id,
			label: 'My API Key',
			userId: member.id,
			apiKey: publicApiKeyService.redactApiKey(newApiKeyResponse.body.data.apiKey),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});

		expect(newApiKeyResponse.body.data.apiKey).not.toEqual(
			retrieveAllApiKeysResponse.body.data[0].apiKey,
		);
	});

	test('DELETE /api-keys/:id should delete the api key', async () => {
		const newApiKeyResponse = await testServer.authAgentFor(member).post('/api-keys');

		const deleteApiKeyResponse = await testServer
			.authAgentFor(member)
			.delete(`/api-keys/${newApiKeyResponse.body.data.id}`);

		const retrieveAllApiKeysResponse = await testServer.authAgentFor(member).get('/api-keys');

		expect(deleteApiKeyResponse.body.data.success).toBe(true);
		expect(retrieveAllApiKeysResponse.body.data.length).toBe(0);
	});
});

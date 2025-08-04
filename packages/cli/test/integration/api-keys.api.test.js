'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const jest_mock_extended_1 = require('jest-mock-extended');
const public_api_key_service_1 = require('@/services/public-api-key.service');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
const testServer = utils.setupTestServer({ endpointGroups: ['apiKeys'] });
let publicApiKeyService;
const license = (0, jest_mock_extended_1.mock)();
beforeAll(() => {
	publicApiKeyService = di_1.Container.get(public_api_key_service_1.PublicApiKeyService);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
	(0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, { publicApi: { disabled: false } });
});
describe('When public API is disabled', () => {
	let owner;
	let authAgent;
	beforeEach(async () => {
		owner = await (0, users_1.createOwnerWithApiKey)();
		authAgent = testServer.authAgentFor(owner);
		(0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
			publicApi: { disabled: true },
		});
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
	let ownerShell;
	beforeEach(async () => {
		ownerShell = await (0, users_1.createUserShell)('global:owner');
	});
	test('POST /api-keys should create an api key with no expiration', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['workflow:create'] });
		const newApiKey = newApiKeyResponse.body.data;
		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();
		const newStoredApiKey = await di_1.Container.get(db_1.ApiKeyRepository).findOneByOrFail({
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
		const newApiKey = newApiKeyResponse.body.data;
		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();
		const newStoredApiKey = await di_1.Container.get(db_1.ApiKeyRepository).findOneByOrFail({
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
		const newApiKey = newApiKeyResponse.body.data;
		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();
		const newStoredApiKey = await di_1.Container.get(db_1.ApiKeyRepository).findOneByOrFail({
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
		});
		expect(newApiKey.expiresAt).toBe(expiresAt);
		expect(newApiKey.rawApiKey).toBeDefined();
	});
	test('PATCH /api-keys should update API key label', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['user:create'] });
		const newApiKey = newApiKeyResponse.body.data;
		await testServer
			.authAgentFor(ownerShell)
			.patch(`/api-keys/${newApiKey.id}`)
			.send({ label: 'updated label', scopes: ['user:create'] });
		const newStoredApiKey = await di_1.Container.get(db_1.ApiKeyRepository).findOneByOrFail({
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
		});
	});
	test('PATCH /api-keys should update API key scopes', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['user:create'] });
		const newApiKey = newApiKeyResponse.body.data;
		await testServer
			.authAgentFor(ownerShell)
			.patch(`/api-keys/${newApiKey.id}`)
			.send({ label: 'updated label', scopes: ['user:create', 'workflow:create'] });
		const newStoredApiKey = await di_1.Container.get(db_1.ApiKeyRepository).findOneByOrFail({
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
		});
	});
	test('PATCH /api-keys should not modify API key expiration', async () => {
		const newApiKeyResponse = await testServer
			.authAgentFor(ownerShell)
			.post('/api-keys')
			.send({ label: 'My API Key', expiresAt: null, scopes: ['user:create'] });
		const newApiKey = newApiKeyResponse.body.data;
		await testServer
			.authAgentFor(ownerShell)
			.patch(`/api-keys/${newApiKey.id}`)
			.send({ label: 'updated label', expiresAt: 123, scopes: ['user:create'] });
		const getApiKeysResponse = await testServer.authAgentFor(ownerShell).get('/api-keys');
		const allApiKeys = getApiKeysResponse.body.data;
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
		const scopes = apiKeyScopesResponse.body.data;
		const scopesForRole = (0, permissions_1.getApiKeyScopesForRole)(ownerShell.role);
		expect(scopes).toEqual(scopesForRole);
	});
});
describe('Member', () => {
	const memberPassword = (0, backend_test_utils_1.randomValidPassword)();
	let member;
	beforeEach(async () => {
		member = await (0, users_1.createUser)({
			password: memberPassword,
			role: 'global:member',
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
		const newStoredApiKey = await di_1.Container.get(db_1.ApiKeyRepository).findOneByOrFail({
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
		const newApiKey = newApiKeyResponse.body.data;
		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();
		const newStoredApiKey = await di_1.Container.get(db_1.ApiKeyRepository).findOneByOrFail({
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
		const newApiKey = newApiKeyResponse.body.data;
		expect(newApiKeyResponse.statusCode).toBe(200);
		expect(newApiKey).toBeDefined();
		const newStoredApiKey = await di_1.Container.get(db_1.ApiKeyRepository).findOneByOrFail({
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
		});
		expect(newApiKey.expiresAt).toBe(expiresAt);
		expect(newApiKey.rawApiKey).toBeDefined();
	});
	test("POST /api-keys should fail to create api key with scopes not allowed in the user's role", async () => {
		const expiresAt = Date.now() + 1000;
		license.isApiKeyScopesEnabled.mockReturnValue(true);
		const notAllowedScope = (0, permissions_1.getOwnerOnlyApiKeyScopes)()[0];
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
		const scopes = apiKeyScopesResponse.body.data;
		const scopesForRole = (0, permissions_1.getApiKeyScopesForRole)(member.role);
		expect(scopes).toEqual(scopesForRole);
	});
});
//# sourceMappingURL=api-keys.api.test.js.map

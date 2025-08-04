'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const jest_mock_extended_1 = require('jest-mock-extended');
const luxon_1 = require('luxon');
const n8n_workflow_1 = require('n8n-workflow');
const users_1 = require('@test-integration/db/users');
const retry_until_1 = require('@test-integration/retry-until');
const jwt_service_1 = require('../jwt.service');
const last_active_at_service_1 = require('../last-active-at.service');
const public_api_key_service_1 = require('../public-api-key.service');
const mockReqWith = (apiKey, path, method) => {
	return (0, jest_mock_extended_1.mock)({
		path,
		method,
		headers: {
			'x-n8n-api-key': apiKey,
		},
	});
};
const instanceSettings = (0, jest_mock_extended_1.mock)({ encryptionKey: 'test-key' });
const eventService = (0, jest_mock_extended_1.mock)();
const securitySchema = (0, jest_mock_extended_1.mock)({
	name: 'X-N8N-API-KEY',
});
const jwtService = new jwt_service_1.JwtService(instanceSettings);
let userRepository;
let apiKeyRepository;
let lastActiveAtService;
let publicApiKeyService;
describe('PublicApiKeyService', () => {
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['User']);
		jest.clearAllMocks();
	});
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		userRepository = di_1.Container.get(db_1.UserRepository);
		apiKeyRepository = di_1.Container.get(db_1.ApiKeyRepository);
		lastActiveAtService = di_1.Container.get(last_active_at_service_1.LastActiveAtService);
		publicApiKeyService = new public_api_key_service_1.PublicApiKeyService(
			apiKeyRepository,
			userRepository,
			jwtService,
			eventService,
			lastActiveAtService,
		);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('getAuthMiddleware', () => {
		it('should return false if api key is invalid', async () => {
			const apiKey = 'invalid';
			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';
			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);
			const response = await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);
			expect(response).toBe(false);
		});
		it('should return false if valid api key is not in database', async () => {
			const apiKey = jwtService.sign({ sub: '123' });
			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';
			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);
			const response = await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);
			expect(response).toBe(false);
		});
		it('should return true if valid api key exist in the database', async () => {
			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const [{ apiKey }] = owner.apiKeys;
			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);
			const response = await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);
			expect(response).toBe(true);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith(
				'public-api-invoked',
				expect.objectContaining({
					userId: owner.id,
					path,
					method,
					apiVersion: 'v1',
				}),
			);
		});
		it('should return false if expired JWT is used', async () => {
			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';
			const dateInThePast = luxon_1.DateTime.now().minus({ days: 1 }).toUnixInteger();
			const owner = await (0, users_1.createOwnerWithApiKey)({
				expiresAt: dateInThePast,
			});
			const [{ apiKey }] = owner.apiKeys;
			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);
			const response = await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);
			expect(response).toBe(false);
		});
		it('should work with non JWT (legacy) api keys', async () => {
			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';
			const legacyApiKey = `n8n_api_${(0, n8n_workflow_1.randomString)(10)}`;
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const [{ apiKey }] = owner.apiKeys;
			await di_1.Container.get(db_1.ApiKeyRepository).update({ apiKey }, { apiKey: legacyApiKey });
			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);
			const response = await middleware(
				mockReqWith(legacyApiKey, path, method),
				{},
				securitySchema,
			);
			expect(response).toBe(true);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith(
				'public-api-invoked',
				expect.objectContaining({
					userId: owner.id,
					path,
					method,
					apiVersion: 'v1',
				}),
			);
		});
		it('should update last active at for the user', async () => {
			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const [{ apiKey }] = owner.apiKeys;
			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);
			await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await (0, retry_until_1.retryUntil)(async () => {
				const userOnDb = await userRepository.findOneByOrFail({ id: owner.id });
				expect(userOnDb.lastActiveAt).toBeDefined();
				expect(
					luxon_1.DateTime.fromSQL(userOnDb.lastActiveAt.toString()).toJSDate().getTime(),
				).toEqual(luxon_1.DateTime.now().startOf('day').toMillis());
			});
		});
	});
	describe('redactApiKey', () => {
		it('should redact api key', async () => {
			const jwt =
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE0ODUxNDA5ODQsImlhdCI6MTQ4NTEzNzM4NCwiaXNzIjoiYWNtZS5jb20iLCJzdWIiOiIyOWFjMGMxOC0wYjRhLTQyY2YtODJmYy0wM2Q1NzAzMThhMWQiLCJhcHBsaWNhdGlvbklkIjoiNzkxMDM3MzQtOTdhYi00ZDFhLWFmMzctZTAwNmQwNWQyOTUyIiwicm9sZXMiOltdfQ.Mp0Pcwsz5VECK11Kf2ZZNF_SMKu5CgBeLN9ZOP04kZo';
			const redactedApiKey = publicApiKeyService.redactApiKey(jwt);
			expect(redactedApiKey).toBe('******4kZo');
		});
	});
	describe('removeOwnerOnlyScopesFromApiKeys', () => {
		it("it should remove all owner only scopes from user's API keys", async () => {
			const adminUser = await (0, users_1.createAdminWithApiKey)();
			const apiKeyId = adminUser.apiKeys[0].id;
			const ownerOnlyScopes = (0, permissions_1.getOwnerOnlyApiKeyScopes)();
			await publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(adminUser);
			const apiKeyOnDb = await apiKeyRepository.findOneByOrFail({ id: apiKeyId });
			expect(ownerOnlyScopes.some((ownerScope) => apiKeyOnDb.scopes.includes(ownerScope))).toBe(
				false,
			);
		});
	});
	describe('getApiKeyScopedMiddleware', () => {
		it('should allow access when API key has required scope', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)({
				scopes: ['workflow:read', 'user:read'],
			});
			const [{ apiKey }] = owner.apiKeys;
			const requiredScope = 'workflow:read';
			const req = mockReqWith(apiKey, '/test', 'GET');
			const res = (0, jest_mock_extended_1.mockDeep)();
			res.status.mockReturnThis();
			res.json.mockReturnThis();
			const next = jest.fn();
			const middleware = publicApiKeyService.getApiKeyScopeMiddleware(requiredScope);
			await middleware(req, res, next);
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
			expect(res.json).not.toHaveBeenCalled();
		});
		it('should deny access when API key does not have required scope', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)({
				scopes: ['user:read'],
			});
			const [{ apiKey }] = owner.apiKeys;
			const requiredScope = 'workflow:read';
			const req = mockReqWith(apiKey, '/test', 'GET');
			const res = (0, jest_mock_extended_1.mockDeep)();
			res.status.mockReturnThis();
			res.json.mockReturnThis();
			const next = jest.fn();
			const middleware = publicApiKeyService.getApiKeyScopeMiddleware(requiredScope);
			await middleware(req, res, next);
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
		});
		it('should deny access when API key is invalid', async () => {
			const invalidApiKey = 'invalid-api-key';
			const requiredScope = 'workflow:read';
			const req = mockReqWith(invalidApiKey, '/test', 'GET');
			const res = (0, jest_mock_extended_1.mockDeep)();
			res.status.mockReturnThis();
			res.json.mockReturnThis();
			const next = jest.fn();
			const middleware = publicApiKeyService.getApiKeyScopeMiddleware(requiredScope);
			await middleware(req, res, next);
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
		});
		it('should deny access when header x-n8n-api-key is not present', async () => {
			const requiredScope = 'workflow:read';
			const req = (0, jest_mock_extended_1.mock)({
				path: '/test',
				method: 'GET',
			});
			const res = (0, jest_mock_extended_1.mockDeep)();
			res.status.mockReturnThis();
			res.json.mockReturnThis();
			const next = jest.fn();
			const middleware = publicApiKeyService.getApiKeyScopeMiddleware(requiredScope);
			await middleware(req, res, next);
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalled();
		});
	});
	describe('apiKeyHasValidScopes', () => {
		it('should return true if API key has the required scope', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)({
				scopes: ['workflow:read', 'user:read'],
			});
			const apiKey = owner.apiKeys[0].apiKey;
			const requiredScope = 'workflow:read';
			const result = await publicApiKeyService.apiKeyHasValidScopes(apiKey, requiredScope);
			expect(result).toBe(true);
		});
		it('should return false if API key does not have the required scope', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)({
				scopes: ['user:read'],
			});
			const apiKey = owner.apiKeys[0].apiKey;
			const requiredScope = 'workflow:read';
			const result = await publicApiKeyService.apiKeyHasValidScopes(apiKey, requiredScope);
			expect(result).toBe(false);
		});
	});
	describe('apiKeyHasValidScopesForRole', () => {
		it('should return true if API key has the required scope for the role', async () => {
			const ownerOnlyScopes = (0, permissions_1.getOwnerOnlyApiKeyScopes)();
			const result = publicApiKeyService.apiKeyHasValidScopesForRole(
				'global:owner',
				ownerOnlyScopes,
			);
			expect(result).toBe(true);
		});
		it('should return false if API key does not have the required scope for the role', async () => {
			const ownerOnlyScopes = (0, permissions_1.getOwnerOnlyApiKeyScopes)();
			const result = publicApiKeyService.apiKeyHasValidScopesForRole(
				'global:member',
				ownerOnlyScopes,
			);
			expect(result).toBe(false);
		});
	});
});
//# sourceMappingURL=public-api-key.service.test.js.map

import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import type { Response, NextFunction } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { InstanceSettings } from 'n8n-core';
import { randomString } from 'n8n-workflow';
import type { OpenAPIV3 } from 'openapi-types';

import { ApiKeyRepository } from '@/databases/repositories/api-key.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { getConnection } from '@/db';
import type { EventService } from '@/events/event.service';
import { getOwnerOnlyApiKeyScopes } from '@/public-api/permissions.ee';
import type { AuthenticatedRequest } from '@/requests';
import { createAdminWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import * as testDb from '@test-integration/test-db';

import { JwtService } from '../jwt.service';
import { PublicApiKeyService } from '../public-api-key.service';

const mockReqWith = (apiKey: string, path: string, method: string) => {
	return mock<AuthenticatedRequest>({
		path,
		method,
		headers: {
			'x-n8n-api-key': apiKey,
		},
	});
};

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });

const eventService = mock<EventService>();

const securitySchema = mock<OpenAPIV3.ApiKeySecurityScheme>({
	name: 'X-N8N-API-KEY',
});

const jwtService = new JwtService(instanceSettings);

let userRepository: UserRepository;
let apiKeyRepository: ApiKeyRepository;

describe('PublicApiKeyService', () => {
	beforeEach(async () => {
		await testDb.truncate(['User']);
		jest.clearAllMocks();
	});

	beforeAll(async () => {
		await testDb.init();
		userRepository = new UserRepository(getConnection());
		apiKeyRepository = new ApiKeyRepository(getConnection());
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getAuthMiddleware', () => {
		it('should return false if api key is invalid', async () => {
			//Arrange

			const apiKey = 'invalid';
			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);

			//Act

			const response = await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);

			//Assert

			expect(response).toBe(false);
		});

		it('should return false if valid api key is not in database', async () => {
			//Arrange

			const apiKey = jwtService.sign({ sub: '123' });
			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);

			//Act

			const response = await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);

			//Assert

			expect(response).toBe(false);
		});

		it('should return true if valid api key exist in the database', async () => {
			//Arrange

			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			const owner = await createOwnerWithApiKey();

			const [{ apiKey }] = owner.apiKeys;

			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);

			//Act

			const response = await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);

			//Assert

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
			//Arrange

			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			const dateInThePast = DateTime.now().minus({ days: 1 }).toUnixInteger();

			const owner = await createOwnerWithApiKey({
				expiresAt: dateInThePast,
			});

			const [{ apiKey }] = owner.apiKeys;

			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);

			//Act

			const response = await middleware(mockReqWith(apiKey, path, method), {}, securitySchema);

			//Assert

			expect(response).toBe(false);
		});

		it('should work with non JWT (legacy) api keys', async () => {
			//Arrange

			const path = '/test';
			const method = 'GET';
			const apiVersion = 'v1';
			const legacyApiKey = `n8n_api_${randomString(10)}`;

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			const owner = await createOwnerWithApiKey();

			const [{ apiKey }] = owner.apiKeys;

			await Container.get(ApiKeyRepository).update({ apiKey }, { apiKey: legacyApiKey });

			const middleware = publicApiKeyService.getAuthMiddleware(apiVersion);

			//Act

			const response = await middleware(
				mockReqWith(legacyApiKey, path, method),
				{},
				securitySchema,
			);

			//Assert

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
	});

	describe('redactApiKey', () => {
		it('should redact api key', async () => {
			//Arrange

			const jwt =
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE0ODUxNDA5ODQsImlhdCI6MTQ4NTEzNzM4NCwiaXNzIjoiYWNtZS5jb20iLCJzdWIiOiIyOWFjMGMxOC0wYjRhLTQyY2YtODJmYy0wM2Q1NzAzMThhMWQiLCJhcHBsaWNhdGlvbklkIjoiNzkxMDM3MzQtOTdhYi00ZDFhLWFmMzctZTAwNmQwNWQyOTUyIiwicm9sZXMiOltdfQ.Mp0Pcwsz5VECK11Kf2ZZNF_SMKu5CgBeLN9ZOP04kZo';

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			//Act

			const redactedApiKey = publicApiKeyService.redactApiKey(jwt);

			//Assert

			expect(redactedApiKey).toBe('******4kZo');
		});
	});

	describe('removeOwnerOnlyScopesFromApiKeys', () => {
		it("it should remove all owner only scopes from user's API keys", async () => {
			// Arrange

			const adminUser = await createAdminWithApiKey();
			const apiKeyId = adminUser.apiKeys[0].id;
			const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			// Act

			await publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(adminUser);

			// Assert

			const apiKeyOnDb = await apiKeyRepository.findOneByOrFail({ id: apiKeyId });

			expect(ownerOnlyScopes.some((ownerScope) => apiKeyOnDb.scopes.includes(ownerScope))).toBe(
				false,
			);
		});
	});

	describe('getApiKeyScopedMiddleware', () => {
		it('should allow access when API key has required scope', async () => {
			// Arrange
			const owner = await createOwnerWithApiKey({
				scopes: ['workflow:read', 'user:read'],
			});
			const [{ apiKey }] = owner.apiKeys;

			const requiredScope = 'workflow:read' as ApiKeyScope;

			const req = mockReqWith(apiKey, '/test', 'GET');

			const res = mockDeep<Response>();

			res.status.mockReturnThis();
			res.json.mockReturnThis();

			const next = jest.fn() as NextFunction;

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			// Act
			const middleware = publicApiKeyService.getApiKeyScopeMiddleware(requiredScope);
			await middleware(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
			expect(res.json).not.toHaveBeenCalled();
		});

		it('should deny access when API key does not have required scope', async () => {
			// Arrange
			const owner = await createOwnerWithApiKey({
				scopes: ['user:read'],
			});
			const [{ apiKey }] = owner.apiKeys;

			const requiredScope = 'workflow:read' as ApiKeyScope;

			const req = mockReqWith(apiKey, '/test', 'GET');

			const res = mockDeep<Response>();

			res.status.mockReturnThis();
			res.json.mockReturnThis();

			const next = jest.fn() as NextFunction;

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			// Act
			const middleware = publicApiKeyService.getApiKeyScopeMiddleware(requiredScope);
			await middleware(req, res, next);

			// Assert
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
		});

		it('should deny access when API key is invalid', async () => {
			// Arrange
			const invalidApiKey = 'invalid-api-key';
			const requiredScope = 'workflow:read' as ApiKeyScope;

			const req = mockReqWith(invalidApiKey, '/test', 'GET');

			const res = mockDeep<Response>();

			res.status.mockReturnThis();
			res.json.mockReturnThis();

			const next = jest.fn() as NextFunction;

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			// Act
			const middleware = publicApiKeyService.getApiKeyScopeMiddleware(requiredScope);
			await middleware(req, res, next);

			// Assert
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
		});

		it('should deny access when header x-n8n-api-key is not present', async () => {
			// Arrange

			const requiredScope = 'workflow:read' as ApiKeyScope;

			const req = mock<AuthenticatedRequest>({
				path: '/test',
				method: 'GET',
			});

			const res = mockDeep<Response>();

			res.status.mockReturnThis();
			res.json.mockReturnThis();

			const next = jest.fn() as NextFunction;

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			// Act
			const middleware = publicApiKeyService.getApiKeyScopeMiddleware(requiredScope);
			await middleware(req, res, next);

			// Assert
			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalled();
		});
	});

	describe('apiKeyHasValidScopes', () => {
		it('should return true if API key has the required scope', async () => {
			// Arrange

			const owner = await createOwnerWithApiKey({
				scopes: ['workflow:read', 'user:read'],
			});

			const apiKey = owner.apiKeys[0].apiKey;
			const requiredScope = 'workflow:read' as ApiKeyScope;

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			// Act
			const result = await publicApiKeyService.apiKeyHasValidScopes(apiKey, requiredScope);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false if API key does not have the required scope', async () => {
			// Arrange

			const owner = await createOwnerWithApiKey({
				scopes: ['user:read'],
			});

			const apiKey = owner.apiKeys[0].apiKey;
			const requiredScope = 'workflow:read' as ApiKeyScope;

			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			// Act
			const result = await publicApiKeyService.apiKeyHasValidScopes(apiKey, requiredScope);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('apiKeyHasValidScopesForRole', () => {
		it('should return true if API key has the required scope for the role', async () => {
			// Arrange
			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();

			// Act

			const result = publicApiKeyService.apiKeyHasValidScopesForRole(
				'global:owner',
				ownerOnlyScopes,
			);

			// Assert

			expect(result).toBe(true);
		});

		it('should return false if API key does not have the required scope for the role', async () => {
			// Arrange
			const publicApiKeyService = new PublicApiKeyService(
				apiKeyRepository,
				userRepository,
				jwtService,
				eventService,
			);

			const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();

			// Act

			const result = publicApiKeyService.apiKeyHasValidScopesForRole(
				'global:member',
				ownerOnlyScopes,
			);

			// Assert

			expect(result).toBe(false);
		});
	});
});

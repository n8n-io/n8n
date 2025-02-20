import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { InstanceSettings } from 'n8n-core';
import { randomString } from 'n8n-workflow';
import type { OpenAPIV3 } from 'openapi-types';

import { ApiKeyRepository } from '@/databases/repositories/api-key.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { getConnection } from '@/db';
import type { EventService } from '@/events/event.service';
import type { AuthenticatedRequest } from '@/requests';
import { createOwnerWithApiKey } from '@test-integration/db/users';
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
});

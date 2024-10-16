import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
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
	});
});

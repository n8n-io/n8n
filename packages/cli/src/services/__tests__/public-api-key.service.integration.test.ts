import { testDb } from '@n8n/backend-test-utils';
import { ApiKeyRepository, GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { getOwnerOnlyApiKeyScopes, type ApiKeyScope } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { createAdminWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';

import { JwtService } from '../jwt.service';
import { PublicApiKeyService } from '../public-api-key.service';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });

const jwtService = new JwtService(instanceSettings, mock());

let apiKeyRepository: ApiKeyRepository;
let publicApiKeyService: PublicApiKeyService;

describe('PublicApiKeyService', () => {
	beforeEach(async () => {
		await testDb.truncate(['User']);
		jest.clearAllMocks();
	});

	beforeAll(async () => {
		await testDb.init();
		apiKeyRepository = Container.get(ApiKeyRepository);
		publicApiKeyService = new PublicApiKeyService(apiKeyRepository, jwtService);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('redactApiKey', () => {
		it('should redact api key', async () => {
			//Arrange

			const jwt =
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE0ODUxNDA5ODQsImlhdCI6MTQ4NTEzNzM4NCwiaXNzIjoiYWNtZS5jb20iLCJzdWIiOiIyOWFjMGMxOC0wYjRhLTQyY2YtODJmYy0wM2Q1NzAzMThhMWQiLCJhcHBsaWNhdGlvbklkIjoiNzkxMDM3MzQtOTdhYi00ZDFhLWFmMzctZTAwNmQwNWQyOTUyIiwicm9sZXMiOltdfQ.Mp0Pcwsz5VECK11Kf2ZZNF_SMKu5CgBeLN9ZOP04kZo';

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

			// Act

			await publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(adminUser);

			// Assert

			const apiKeyOnDb = await apiKeyRepository.findOneByOrFail({ id: apiKeyId });

			expect(ownerOnlyScopes.some((ownerScope) => apiKeyOnDb.scopes.includes(ownerScope))).toBe(
				false,
			);
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

			// Act
			const result = await publicApiKeyService.apiKeyHasValidScopes(apiKey, requiredScope);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('apiKeyHasValidScopesForRole', () => {
		it('should return true if API key has the required scope for the role', async () => {
			// Arrange
			const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();

			// Act

			const result = publicApiKeyService.apiKeyHasValidScopesForRole(
				{
					role: GLOBAL_OWNER_ROLE,
				},
				ownerOnlyScopes,
			);

			// Assert

			expect(result).toBe(true);
		});

		it('should return false if API key does not have the required scope for the role', async () => {
			// Arrange
			const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();

			// Act

			const result = publicApiKeyService.apiKeyHasValidScopesForRole(
				{
					role: GLOBAL_MEMBER_ROLE,
				},
				ownerOnlyScopes,
			);

			// Assert

			expect(result).toBe(false);
		});
	});
});

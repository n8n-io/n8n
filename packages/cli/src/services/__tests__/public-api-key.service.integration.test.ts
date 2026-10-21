import { testDb } from '@n8n/backend-test-utils';
import {
	ApiKeyRepository,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	ProjectRelationRepository,
	ProjectRepository,
	TransactionRunner,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import {
	getOwnerOnlyApiKeyScopes,
	MEMBER_API_KEY_SCOPES,
	type ApiKeyScope,
} from '@n8n/permissions';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import {
	createAdminWithApiKey,
	createMemberWithApiKey,
	createOwnerWithApiKey,
} from '@test-integration/db/users';

import { JwtService } from '@n8n/backend-services';
import { PublicApiKeyService } from '../public-api-key.service';
import { UserService } from '../user.service';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });

const jwtService = new JwtService(instanceSettings, mock(), mock());

let apiKeyRepository: ApiKeyRepository;
let publicApiKeyService: PublicApiKeyService;

describe('PublicApiKeyService', () => {
	beforeEach(async () => {
		await testDb.truncate(['User']);
		vi.clearAllMocks();
	});

	beforeAll(async () => {
		await testDb.init();
		apiKeyRepository = Container.get(ApiKeyRepository);
		publicApiKeyService = new PublicApiKeyService(
			apiKeyRepository,
			jwtService,
			mock(),
			mock(),
			Container.get(TransactionRunner),
		);
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

			const apiKeyOnDb = await apiKeyRepository.findByIdOrFail(apiKeyId);

			expect(ownerOnlyScopes.some((ownerScope) => apiKeyOnDb.scopes.includes(ownerScope))).toBe(
				false,
			);
		});

		it('should keep every scope a member may hold', async () => {
			const adminUser = await createAdminWithApiKey({
				scopes: [...MEMBER_API_KEY_SCOPES, 'user:create'],
			});
			const apiKeyId = adminUser.apiKeys[0].id;

			await publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(adminUser);

			const apiKeyOnDb = await apiKeyRepository.findByIdOrFail(apiKeyId);
			expect(apiKeyOnDb.scopes).toEqual(MEMBER_API_KEY_SCOPES);
		});
	});

	describe('role change transaction', () => {
		it.each([false, true])(
			'keeps user, project and API key changes atomic (failure: %s)',
			async (fail) => {
				const user = await createMemberWithApiKey();
				const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
					user.id,
				);
				const deleteKeys = apiKeyRepository.deleteAllForUser.bind(apiKeyRepository);
				const deletion = vi
					.spyOn(apiKeyRepository, 'deleteAllForUser')
					.mockImplementationOnce(async (userId, audience, ctx) => {
						await deleteKeys(userId, audience, ctx);
						if (fail) throw new Error('Role change failed');
					});

				try {
					const change = Container.get(UserService).changeUserRole(user, {
						newRoleName: 'global:chatUser',
					});
					if (fail) {
						await expect(change).rejects.toThrow('Role change failed');
					} else {
						await change;
					}

					const storedUser = await Container.get(UserRepository).findByIdWithRole(user.id);
					const projectRelation = await Container.get(ProjectRelationRepository).findOneOrFail({
						where: { userId: user.id, projectId: project.id },
						relations: ['role'],
					});
					expect(storedUser?.role.slug).toBe(fail ? 'global:member' : 'global:chatUser');
					expect(projectRelation.role.slug).toBe(fail ? 'project:personalOwner' : 'project:viewer');
					expect(await apiKeyRepository.findByUserId(user.id)).toHaveLength(fail ? 1 : 0);
				} finally {
					deletion.mockRestore();
				}
			},
		);
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

		it('should let a member grant every member scope', async () => {
			const result = publicApiKeyService.apiKeyHasValidScopesForRole(
				{
					role: GLOBAL_MEMBER_ROLE,
				},
				MEMBER_API_KEY_SCOPES,
			);

			expect(result).toBe(true);
		});
	});
});

import type {
	CredentialsEntity,
	CredentialsRepository,
	SharedCredentialsRepository,
	ProjectRepository,
	UserRepository,
	User,
} from '@n8n/db';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { CREDENTIAL_ERRORS, CredentialDataError, Credentials, type ErrorReporter } from 'n8n-core';
import { CREDENTIAL_EMPTY_VALUE, type ICredentialType } from 'n8n-workflow';
import type { Logger } from '@n8n/backend-common';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import type { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { CredentialsTester } from '@/services/credentials-tester.service';
import type { ExternalHooks } from '@/external-hooks';

describe('CredentialsService', () => {
	const credType = mock<ICredentialType>({
		extends: [],
		properties: [
			{
				name: 'clientSecret',
				type: 'string',
				typeOptions: { password: true },
				doNotInherit: false,
			},
			{
				name: 'accessToken',
				type: 'string',
				typeOptions: { password: true },
				doNotInherit: false,
			},
		],
	});

	const errorReporter = mock<ErrorReporter>();
	const credentialTypes = mock<CredentialTypes>();
	const credentialsRepository = mock<CredentialsRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const ownershipService = mock<OwnershipService>();
	const logger = mock<Logger>();
	const credentialsTester = mock<CredentialsTester>();
	const externalHooks = mock<ExternalHooks>();
	const projectRepository = mock<ProjectRepository>();
	const projectService = mock<ProjectService>();
	const roleService = mock<RoleService>();
	const userRepository = mock<UserRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();

	const service = new CredentialsService(
		credentialsRepository,
		sharedCredentialsRepository,
		ownershipService,
		logger,
		errorReporter,
		credentialsTester,
		externalHooks,
		credentialTypes,
		projectRepository,
		projectService,
		roleService,
		userRepository,
		credentialsFinderService,
	);

	beforeEach(() => jest.resetAllMocks());

	describe('redact', () => {
		it('should redact sensitive values', () => {
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});

			const decryptedData = {
				clientId: 'abc123',
				clientSecret: 'sensitiveSecret',
				accessToken: '',
				oauthTokenData: 'super-secret',
				csrfSecret: 'super-secret',
			};

			credentialTypes.getByName.calledWith(credential.type).mockReturnValueOnce(credType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				clientId: 'abc123',
				clientSecret: CREDENTIAL_BLANKING_VALUE,
				accessToken: CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
				csrfSecret: CREDENTIAL_BLANKING_VALUE,
			});
		});
	});

	describe('decrypt', () => {
		const data = {
			clientId: 'abc123',
			clientSecret: 'sensitiveSecret',
			accessToken: '',
			oauthTokenData: 'super-secret',
			csrfSecret: 'super-secret',
		};
		const credentialEntity = mock<CredentialsEntity>({
			id: '123',
			name: 'Test Credential',
			type: 'oauth2',
		});
		const credentials = mock<Credentials>({ id: credentialEntity.id });

		beforeEach(() => {
			credentialTypes.getByName.calledWith(credentialEntity.type).mockReturnValueOnce(credType);
		});

		it('should redact sensitive values by default', () => {
			// ARRANGE
			jest.spyOn(Credentials.prototype, 'getData').mockReturnValueOnce(data);

			// ACT
			const redactedData = service.decrypt(credentialEntity);

			// ASSERT
			expect(redactedData).toEqual({
				...data,
				clientSecret: CREDENTIAL_BLANKING_VALUE,
				accessToken: CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
				csrfSecret: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('should return sensitive values if `includeRawData` is true', () => {
			// ARRANGE
			jest.spyOn(Credentials.prototype, 'getData').mockReturnValueOnce(data);

			// ACT
			const redactedData = service.decrypt(credentialEntity, true);

			// ASSERT
			expect(redactedData).toEqual(data);
		});

		it('should return return an empty object if decryption fails', () => {
			// ARRANGE
			const decryptionError = new CredentialDataError(
				credentials,
				CREDENTIAL_ERRORS.DECRYPTION_FAILED,
			);
			jest.spyOn(Credentials.prototype, 'getData').mockImplementation(() => {
				throw decryptionError;
			});

			// ACT
			const redactedData = service.decrypt(credentialEntity, true);

			// ASSERT
			expect(redactedData).toEqual({});
			expect(credentialTypes.getByName).not.toHaveBeenCalled();
			expect(errorReporter.error).toHaveBeenCalledWith(decryptionError, {
				extra: { credentialId: credentialEntity.id },
				level: 'error',
				tags: { credentialType: credentialEntity.type },
			});
		});
	});

	describe('getMany', () => {
		const ownerUser = mock<User>({ id: 'owner-id', role: GLOBAL_OWNER_ROLE });
		const memberUser = mock<User>({ id: 'member-id', role: GLOBAL_MEMBER_ROLE });

		const regularCredential = {
			id: 'cred-1',
			name: 'Regular Credential',
			type: 'apiKey',
			isGlobal: false,
			shared: [],
		} as Partial<CredentialsEntity> as CredentialsEntity;

		const globalCredential = {
			id: 'cred-2',
			name: 'Global Credential',
			type: 'apiKey',
			isGlobal: true,
			shared: [],
		} as Partial<CredentialsEntity> as CredentialsEntity;

		beforeEach(() => {
			// Mock ownershipService to return credentials as-is
			ownershipService.addOwnedByAndSharedWith.mockImplementation((c: any) => c as any);
		});

		describe('with includeGlobal = true', () => {
			it('should include global credentials for owner users', async () => {
				// ARRANGE
				credentialsRepository.findMany.mockResolvedValue([regularCredential]);
				credentialsRepository.findAllGlobalCredentials.mockResolvedValue([globalCredential]);

				// ACT
				const result = await service.getMany(ownerUser, {
					includeGlobal: true,
				});

				// ASSERT
				expect(credentialsRepository.findMany).toHaveBeenCalled();
				expect(credentialsRepository.findAllGlobalCredentials).toHaveBeenCalledWith(false);
				expect(result).toHaveLength(2);
				expect(result).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ id: 'cred-1' }),
						expect.objectContaining({ id: 'cred-2' }),
					]),
				);
			});

			it('should include global credentials for member users', async () => {
				// ARRANGE
				credentialsFinderService.getCredentialIdsByUserAndRole.mockResolvedValue(['cred-1']);
				credentialsRepository.findMany.mockResolvedValue([regularCredential]);
				credentialsRepository.findAllGlobalCredentials.mockResolvedValue([globalCredential]);

				// ACT
				const result = await service.getMany(memberUser, {
					includeGlobal: true,
				});

				// ASSERT
				expect(credentialsRepository.findMany).toHaveBeenCalled();
				expect(credentialsRepository.findAllGlobalCredentials).toHaveBeenCalledWith(false);
				expect(result).toHaveLength(2);
				expect(result).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ id: 'cred-1' }),
						expect.objectContaining({ id: 'cred-2' }),
					]),
				);
			});

			it('should deduplicate credentials when user has project access to global credential', async () => {
				// ARRANGE - User already has access to global credential through project
				const sharedGlobalCred = {
					id: 'cred-2', // Same ID as globalCredential
					name: 'Global Credential',
					type: 'apiKey',
					isGlobal: true,
					shared: [],
				} as Partial<CredentialsEntity> as CredentialsEntity;
				credentialsFinderService.getCredentialIdsByUserAndRole.mockResolvedValue([
					'cred-1',
					'cred-2',
				]);
				credentialsRepository.findMany.mockResolvedValue([regularCredential, sharedGlobalCred]);
				credentialsRepository.findAllGlobalCredentials.mockResolvedValue([globalCredential]);

				// ACT
				const result = await service.getMany(memberUser, {
					includeGlobal: true,
				});

				// ASSERT
				expect(result).toHaveLength(2);
				// Should have exactly one instance of cred-2, not two
				const credIds = result.map((c) => c.id);
				expect(credIds.filter((id) => id === 'cred-2')).toHaveLength(1);
			});

			it('should include data for global credentials when includeData is true', async () => {
				// ARRANGE
				credentialsRepository.findMany.mockResolvedValue([regularCredential]);
				credentialsRepository.findAllGlobalCredentials.mockResolvedValue([globalCredential]);
				projectService.getProjectRelationsForUser.mockResolvedValue([]);
				roleService.addScopes.mockImplementation(
					(c) => ({ ...c, scopes: ['credential:read'] }) as any,
				);

				// ACT
				await service.getMany(memberUser, {
					includeGlobal: true,
					includeData: true,
				});

				// ASSERT
				expect(credentialsRepository.findAllGlobalCredentials).toHaveBeenCalledWith(true);
			});
		});

		describe('with includeGlobal = false', () => {
			it('should exclude global credentials when includeGlobal is false', async () => {
				// ARRANGE
				credentialsRepository.findMany.mockResolvedValue([regularCredential]);

				// ACT
				const result = await service.getMany(ownerUser, {
					includeGlobal: false,
				});

				// ASSERT
				expect(credentialsRepository.findMany).toHaveBeenCalled();
				expect(credentialsRepository.findAllGlobalCredentials).not.toHaveBeenCalled();
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe('cred-1');
			});

			it('should exclude global credentials when includeGlobal is undefined', async () => {
				// ARRANGE
				credentialsFinderService.getCredentialIdsByUserAndRole.mockResolvedValue(['cred-1']);
				credentialsRepository.findMany.mockResolvedValue([regularCredential]);

				// ACT
				const result = await service.getMany(memberUser, {
					includeGlobal: false,
				});

				// ASSERT
				expect(credentialsRepository.findAllGlobalCredentials).not.toHaveBeenCalled();
				expect(result).toHaveLength(1);
			});
		});
	});

	describe('getCredentialsAUserCanUseInAWorkflow', () => {
		const user = mock<User>({ id: 'user-1' });
		const regularCredential = {
			id: 'cred-1',
			name: 'Regular Credential',
			type: 'apiKey',
			isGlobal: false,
		} as Partial<CredentialsEntity> as CredentialsEntity;
		const globalCredential = {
			id: 'cred-2',
			name: 'Global Credential',
			type: 'oauth2',
			isGlobal: true,
		} as Partial<CredentialsEntity> as CredentialsEntity;

		beforeEach(() => {
			projectService.getProjectRelationsForUser.mockResolvedValue([]);
			roleService.addScopes.mockImplementation(
				(c) => ({ ...c, scopes: ['credential:read'] }) as any,
			);
		});

		it('should include global credentials for workflows', async () => {
			// ARRANGE
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				regularCredential,
				globalCredential,
			]);
			credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValue([regularCredential]);

			// ACT
			const result = await service.getCredentialsAUserCanUseInAWorkflow(user, {
				workflowId: 'workflow-1',
			});

			// ASSERT
			expect(credentialsFinderService.findCredentialsForUser).toHaveBeenCalledWith(user, [
				'credential:read',
			]);
			expect(result).toHaveLength(2);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 'cred-1', isGlobal: false }),
					expect.objectContaining({ id: 'cred-2', isGlobal: true }),
				]),
			);
		});

		it('should include global credentials for projects', async () => {
			// ARRANGE
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				regularCredential,
				globalCredential,
			]);
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([regularCredential]);

			// ACT
			const result = await service.getCredentialsAUserCanUseInAWorkflow(user, {
				projectId: 'project-1',
			});

			// ASSERT
			expect(credentialsFinderService.findCredentialsForUser).toHaveBeenCalledWith(user, [
				'credential:read',
			]);
			expect(result).toHaveLength(2);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 'cred-1' }),
					expect.objectContaining({ id: 'cred-2' }),
				]),
			);
		});

		it('should not duplicate credentials when user has access to global credential through project', async () => {
			// ARRANGE - Both regular and global credentials are in workflow's project
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				regularCredential,
				globalCredential,
			]);
			credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValue([
				regularCredential,
				globalCredential,
			]);

			// ACT
			const result = await service.getCredentialsAUserCanUseInAWorkflow(user, {
				workflowId: 'workflow-1',
			});

			// ASSERT
			expect(result).toHaveLength(2);
			const credIds = result.map((c) => c.id);
			expect(credIds).toEqual(['cred-1', 'cred-2']);
			// Verify no duplicates
			expect(new Set(credIds).size).toBe(2);
		});
	});

	describe('createUnmanagedCredential', () => {
		const ownerUser = mock<User>({ id: 'owner-id', role: GLOBAL_OWNER_ROLE });
		const memberUser = mock<User>({ id: 'member-id', role: GLOBAL_MEMBER_ROLE });

		const credentialData = {
			name: 'Test Credential',
			type: 'apiKey',
			data: { apiKey: 'test-key' },
			projectId: 'project-1',
		};

		beforeEach(() => {
			// Mock the save chain
			credentialsRepository.create.mockImplementation((data) => ({ ...data }) as any);
			roleService.addScopes.mockImplementation(
				(c) =>
					({
						...c,
						scopes: ['credential:read', 'credential:update'],
					}) as any,
			);
			roleService.combineResourceScopes.mockReturnValue([
				'credential:read',
				'credential:update',
			] as any);
			sharedCredentialsRepository.findOne.mockResolvedValue({ role: 'credential:owner' } as any);
			sharedCredentialsRepository.create.mockImplementation((data) => data as any);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			externalHooks.run.mockResolvedValue();
			projectService.getProjectWithScope.mockResolvedValue({
				id: 'project-1',
			} as any);
			projectService.getProjectRelationsForUser.mockResolvedValue([]);
		});

		it('should allow owner to create global credential', async () => {
			// ARRANGE
			const payload = { ...credentialData, isGlobal: true };
			const savedEntities: any[] = [];
			let credentialEntityInput: any;
			credentialsRepository.create.mockImplementation((data) => {
				credentialEntityInput = data;
				return data as any;
			});
			// @ts-expect-error - Mocking manager for testing
			credentialsRepository.manager = {
				transaction: jest.fn().mockImplementation(async (callback) => {
					const mockManager = {
						save: jest.fn().mockImplementation((entity) => {
							savedEntities.push(entity);
							return Promise.resolve({ ...entity, id: 'new-cred-id' });
						}),
					};
					return await callback(mockManager);
				}),
			};

			// ACT
			await service.createUnmanagedCredential(payload, ownerUser);

			// ASSERT
			expect(credentialEntityInput.isGlobal).toBe(true);
			// First entity saved should be the credential with isGlobal
			expect(savedEntities[0]).toMatchObject({
				isGlobal: true,
			});
		});

		it('should prevent non-owner from creating global credential', async () => {
			// ARRANGE
			const payload = { ...credentialData, isGlobal: true };
			let savedCredential: any;
			// @ts-expect-error - Mocking manager for testing
			credentialsRepository.manager = {
				transaction: jest.fn().mockImplementation(async (callback) => {
					const mockManager = {
						save: jest.fn().mockImplementation((entity) => {
							savedCredential = entity;
							return Promise.resolve({ ...entity, id: 'new-cred-id' });
						}),
					};
					return await callback(mockManager);
				}),
			};

			// ACT
			await service.createUnmanagedCredential(payload, memberUser);

			// ASSERT
			// isGlobal should be undefined/not set because user lacks permission
			expect(savedCredential.isGlobal).toBeUndefined();
		});

		it('should create non-global credential by default', async () => {
			// ARRANGE
			const payload = { ...credentialData }; // no isGlobal field
			let savedCredential: any;
			// @ts-expect-error - Mocking manager for testing
			credentialsRepository.manager = {
				transaction: jest.fn().mockImplementation(async (callback) => {
					const mockManager = {
						save: jest.fn().mockImplementation((entity) => {
							savedCredential = entity;
							return Promise.resolve({ ...entity, id: 'new-cred-id' });
						}),
					};
					return await callback(mockManager);
				}),
			};

			// ACT
			await service.createUnmanagedCredential(payload, ownerUser);

			// ASSERT
			expect(savedCredential.isGlobal).toBeUndefined();
		});

		it('should ignore isGlobal when user lacks credential:shareGlobally scope', async () => {
			// ARRANGE
			const payload = { ...credentialData, isGlobal: true };
			let savedCredential: any;
			// @ts-expect-error - Mocking manager for testing
			credentialsRepository.manager = {
				transaction: jest.fn().mockImplementation(async (callback) => {
					const mockManager = {
						save: jest.fn().mockImplementation((entity) => {
							savedCredential = entity;
							return Promise.resolve({ ...entity, id: 'new-cred-id' });
						}),
					};
					return await callback(mockManager);
				}),
			};

			// ACT
			await service.createUnmanagedCredential(payload, memberUser);

			// ASSERT
			expect(savedCredential.isGlobal).toBeUndefined();
		});
	});
});

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

		it('should redact sensitive values in a fixed collection with multiple values', () => {
			const fixedCollectionCredType = {
				properties: [
					{
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						options: [
							{
								displayName: 'Header',
								name: 'values',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
						],
					},
				],
			} as unknown as ICredentialType;
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			const decryptedData = {
				headers: {
					values: [
						{
							name: 'Authorization',
							value: 'Bearer sensitiveSecret',
						},
						{
							name: 'Test',
							value: '123',
						},
					],
				},
			};
			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(fixedCollectionCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				headers: {
					values: [
						{ name: 'Authorization', value: CREDENTIAL_BLANKING_VALUE },
						{ name: 'Test', value: CREDENTIAL_BLANKING_VALUE },
					],
				},
			});
		});

		it('should redact sensitive values in a fixed collection with single value', () => {
			const fixedCollectionCredType = {
				properties: [
					{
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: { multipleValues: false },
						options: [
							{
								displayName: 'Header',
								name: 'values',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
						],
					},
				],
			} as unknown as ICredentialType;
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			const decryptedData = {
				headers: {
					values: {
						name: 'Authorization',
						value: 'Bearer sensitiveSecret',
					},
				},
			};
			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(fixedCollectionCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				headers: {
					values: { name: 'Authorization', value: CREDENTIAL_BLANKING_VALUE },
				},
			});
		});

		it('should redact sensitive values in a fixed collection with multiple options', () => {
			const fixedCollectionCredType = {
				properties: [
					{
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						options: [
							{
								displayName: 'Header',
								name: 'values1',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
							{
								displayName: 'Header',
								name: 'values2',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
						],
					},
				],
			} as unknown as ICredentialType;
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			const decryptedData = {
				headers: {
					values1: [
						{
							name: 'Authorization',
							value: 'Bearer sensitiveSecret',
						},
						{
							name: 'Test',
							value: '123',
						},
					],
					values2: [
						{
							name: 'Foo',
							value: 'Bar',
						},
						{
							name: 'Baz',
							value: 'Qux',
						},
					],
				},
			};
			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(fixedCollectionCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				headers: {
					values1: [
						{ name: 'Authorization', value: CREDENTIAL_BLANKING_VALUE },
						{ name: 'Test', value: CREDENTIAL_BLANKING_VALUE },
					],
					values2: [
						{ name: 'Foo', value: CREDENTIAL_BLANKING_VALUE },
						{ name: 'Baz', value: CREDENTIAL_BLANKING_VALUE },
					],
				},
			});
		});

		it('should redact sensitive values in a fixed collection with multiple options and a single value', () => {
			const fixedCollectionCredType = {
				properties: [
					{
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: { multipleValues: false },
						options: [
							{
								displayName: 'Header',
								name: 'values1',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
							{
								displayName: 'Header',
								name: 'values2',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
						],
					},
				],
			} as unknown as ICredentialType;
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			const decryptedData = {
				headers: {
					values2: {
						name: 'Authorization',
						value: 'Bearer sensitiveSecret',
					},
				},
			};
			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(fixedCollectionCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				headers: {
					values2: { name: 'Authorization', value: CREDENTIAL_BLANKING_VALUE },
				},
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
			ownershipService.addOwnedByAndSharedWith.mockImplementation((c: any) => c);
		});

		describe('returnAll = true (owner user)', () => {
			describe('with personal project filter', () => {
				it('should filter by credential:owner role when projectId is for a personal project', async () => {
					// ARRANGE
					const personalProject = { id: 'personal-proj', type: 'personal' } as any;
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProject.mockResolvedValue(personalProject);

					// ACT
					const result = await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { projectId: 'personal-proj' },
						},
					});

					// ASSERT
					expect(projectService.getProject).toHaveBeenCalledWith('personal-proj');
					expect(credentialsRepository.findMany).toHaveBeenCalledWith(
						expect.objectContaining({
							filter: expect.objectContaining({
								withRole: 'credential:owner',
								projectId: 'personal-proj',
							}),
						}),
					);
					expect(result).toHaveLength(1);
				});

				it('should not filter by role when projectId is for a team project', async () => {
					// ARRANGE
					const teamProject = { id: 'team-proj', type: 'team' } as any;
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProject.mockResolvedValue(teamProject);

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { projectId: 'team-proj' },
						},
					});

					// ASSERT
					expect(projectService.getProject).toHaveBeenCalledWith('team-proj');
					expect(credentialsRepository.findMany).toHaveBeenCalledWith(
						expect.objectContaining({
							filter: expect.not.objectContaining({
								withRole: 'credential:owner',
							}),
						}),
					);
				});

				it('should handle getProject throwing an error', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProject.mockRejectedValue(new Error('Project not found'));

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { projectId: 'nonexistent-proj' },
						},
					});

					// ASSERT - Should continue without filtering by role
					expect(credentialsRepository.findMany).toHaveBeenCalledWith(
						expect.objectContaining({
							filter: expect.not.objectContaining({
								withRole: 'credential:owner',
							}),
						}),
					);
				});
			});

			describe('with includeScopes', () => {
				it('should add scopes to credentials when includeScopes is true', async () => {
					// ARRANGE
					const projectRelations = [{ projectId: 'proj-1', role: 'project:owner' }] as any;
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:read', 'credential:update'] }) as any,
					);

					// ACT
					const result = await service.getMany(ownerUser, {
						includeScopes: true,
					});

					// ASSERT
					expect(projectService.getProjectRelationsForUser).toHaveBeenCalledWith(ownerUser);
					expect(roleService.addScopes).toHaveBeenCalledWith(
						regularCredential,
						ownerUser,
						projectRelations,
					);
					expect(result[0]).toHaveProperty('scopes');
				});

				it('should not add scopes when includeScopes is false', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					const result = await service.getMany(ownerUser, {
						includeScopes: false,
					});

					// ASSERT
					expect(projectService.getProjectRelationsForUser).not.toHaveBeenCalled();
					expect(roleService.addScopes).not.toHaveBeenCalled();
					expect(result[0]).not.toHaveProperty('scopes');
				});
			});

			describe('with includeData', () => {
				beforeEach(() => {
					projectService.getProjectRelationsForUser.mockResolvedValue([]);
					jest.spyOn(Credentials.prototype, 'getData').mockReturnValue({
						apiKey: 'secret-key',
						oauthTokenData: { token: 'secret-token' },
					});
					credentialTypes.getByName.mockReturnValue(credType);
				});

				it('should automatically set includeScopes to true when includeData is true', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);

					// ACT
					await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(projectService.getProjectRelationsForUser).toHaveBeenCalled();
				});

				it('should include decrypted data when user has credential:update scope', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);

					// ACT
					const result = await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0]).toHaveProperty('data');
					expect(result[0].data).toBeDefined();
				});

				it('should not include decrypted data when user lacks credential:update scope', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:read'] }) as any,
					);

					// ACT
					const result = await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0]).toHaveProperty('data');
					expect(result[0].data).toBeUndefined();
				});

				it('should replace oauthTokenData with true when present', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);
					jest.spyOn(Credentials.prototype, 'getData').mockReturnValue({
						apiKey: 'secret-key',
						oauthTokenData: { token: 'secret-token' },
					});

					// ACT
					const result = await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0].data).toBeDefined();
					expect((result[0].data as any)?.oauthTokenData).toBe(true);
				});

				it('should set includeData in listQueryOptions', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);

					// ACT
					await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(credentialsRepository.findMany).toHaveBeenCalledWith(
						expect.objectContaining({
							includeData: true,
						}),
					);
				});
			});

			describe('with shared project relations', () => {
				const sharedRelation = { credentialsId: 'cred-1', projectId: 'proj-1' } as any;

				it('should fetch all relations when filtering by shared.projectId', async () => {
					// ARRANGE
					const credWithShared = { ...regularCredential, shared: [] } as any;
					credentialsRepository.findMany.mockResolvedValue([credWithShared]);
					sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
						sharedRelation,
					]);

					// ACT
					const result = await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { shared: { projectId: 'proj-1' } },
						},
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
						'cred-1',
					]);
					expect(result[0].shared).toHaveLength(1);
				});

				it('should fetch all relations when onlySharedWithMe is true', async () => {
					// ARRANGE
					const credWithShared = { ...regularCredential, shared: [] } as any;
					credentialsRepository.findMany.mockResolvedValue([credWithShared]);
					sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
						sharedRelation,
					]);

					// ACT
					const result = await service.getMany(ownerUser, {
						onlySharedWithMe: true,
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
						'cred-1',
					]);
					expect(result[0].shared).toHaveLength(1);
				});

				it('should not fetch all relations when shared.projectId is not present', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { type: 'apiKey' },
						},
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).not.toHaveBeenCalled();
				});
			});

			describe('with custom select (non-default select)', () => {
				it('should skip addOwnedByAndSharedWith when select is custom', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							select: { id: true, name: true },
						},
					});

					// ASSERT
					expect(ownershipService.addOwnedByAndSharedWith).not.toHaveBeenCalled();
				});

				it('should skip fetching all relations when select is custom', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							select: { id: true, name: true },
							filter: { shared: { projectId: 'proj-1' } },
						},
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).not.toHaveBeenCalled();
				});
			});
		});

		describe('returnAll = false (member user)', () => {
			beforeEach(() => {
				credentialsFinderService.getCredentialIdsByUserAndRole.mockResolvedValue(['cred-1']);
			});

			it('should fetch credentials by user and role', async () => {
				// ARRANGE
				credentialsRepository.findMany.mockResolvedValue([regularCredential]);

				// ACT
				await service.getMany(memberUser, {});

				// ASSERT
				expect(credentialsFinderService.getCredentialIdsByUserAndRole).toHaveBeenCalledWith(
					[memberUser.id],
					{ scopes: ['credential:read'] },
				);
				expect(credentialsRepository.findMany).toHaveBeenCalledWith({}, ['cred-1']);
			});

			describe('with includeScopes', () => {
				it('should add scopes to credentials when includeScopes is true', async () => {
					// ARRANGE
					const projectRelations = [{ projectId: 'proj-1', role: 'project:editor' }] as any;
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:read'] }) as any,
					);

					// ACT
					const result = await service.getMany(memberUser, {
						includeScopes: true,
					});

					// ASSERT
					expect(projectService.getProjectRelationsForUser).toHaveBeenCalledWith(memberUser);
					expect(roleService.addScopes).toHaveBeenCalledWith(
						regularCredential,
						memberUser,
						projectRelations,
					);
					expect(result[0]).toHaveProperty('scopes');
				});
			});

			describe('with includeData', () => {
				beforeEach(() => {
					projectService.getProjectRelationsForUser.mockResolvedValue([]);
					jest.spyOn(Credentials.prototype, 'getData').mockReturnValue({
						apiKey: 'secret-key',
					});
					credentialTypes.getByName.mockReturnValue(credType);
				});

				it('should include decrypted data when user has credential:update scope', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);

					// ACT
					const result = await service.getMany(memberUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0]).toHaveProperty('data');
					expect(result[0].data).toBeDefined();
				});

				it('should not include decrypted data when user lacks credential:update scope', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:read'] }) as any,
					);

					// ACT
					const result = await service.getMany(memberUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0]).toHaveProperty('data');
					expect(result[0].data).toBeUndefined();
				});
			});

			describe('with shared project relations', () => {
				const sharedRelation = { credentialsId: 'cred-1', projectId: 'proj-1' } as any;

				it('should fetch all relations when filtering by shared.projectId', async () => {
					// ARRANGE
					const credWithShared = { ...regularCredential, shared: [] } as any;
					credentialsRepository.findMany.mockResolvedValue([credWithShared]);
					sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
						sharedRelation,
					]);

					// ACT
					const result = await service.getMany(memberUser, {
						listQueryOptions: {
							filter: { shared: { projectId: 'proj-1' } },
						},
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
						'cred-1',
					]);
					expect(result[0].shared).toHaveLength(1);
				});

				it('should fetch all relations when onlySharedWithMe is true', async () => {
					// ARRANGE
					const credWithShared = { ...regularCredential, shared: [] } as any;
					credentialsRepository.findMany.mockResolvedValue([credWithShared]);
					sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
						sharedRelation,
					]);

					// ACT
					const result = await service.getMany(memberUser, {
						onlySharedWithMe: true,
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
						'cred-1',
					]);
					expect(result[0].shared).toHaveLength(1);
				});
			});

			describe('with custom select', () => {
				it('should skip addOwnedByAndSharedWith when select is custom', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					await service.getMany(memberUser, {
						listQueryOptions: {
							select: { id: true, name: true },
						},
					});

					// ASSERT
					expect(ownershipService.addOwnedByAndSharedWith).not.toHaveBeenCalled();
				});
			});
		});

		describe('with onlySharedWithMe', () => {
			it('should filter by credential:user role when onlySharedWithMe is true', async () => {
				// ARRANGE
				const credWithShared = { ...regularCredential, shared: [] } as any;
				const sharedRelation = { credentialsId: 'cred-1', projectId: 'proj-1' } as any;
				credentialsFinderService.getCredentialIdsByUserAndRole.mockResolvedValue(['cred-1']);
				credentialsRepository.findMany.mockResolvedValue([credWithShared]);
				sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
					sharedRelation,
				]);

				// ACT
				await service.getMany(memberUser, {
					onlySharedWithMe: true,
				});

				// ASSERT
				expect(credentialsRepository.findMany).toHaveBeenCalledWith(
					expect.objectContaining({
						filter: expect.objectContaining({
							withRole: 'credential:user',
							user: memberUser,
						}),
					}),
					['cred-1'],
				);
				expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
					'cred-1',
				]);
			});

			it('should merge onlySharedWithMe with existing filters', async () => {
				// ARRANGE
				const credWithShared = { ...regularCredential, shared: [] } as any;
				const sharedRelation = { credentialsId: 'cred-1', projectId: 'proj-1' } as any;
				credentialsFinderService.getCredentialIdsByUserAndRole.mockResolvedValue(['cred-1']);
				credentialsRepository.findMany.mockResolvedValue([credWithShared]);
				sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
					sharedRelation,
				]);

				// ACT
				await service.getMany(memberUser, {
					listQueryOptions: {
						filter: { type: 'apiKey' },
					},
					onlySharedWithMe: true,
				});

				// ASSERT
				expect(credentialsRepository.findMany).toHaveBeenCalledWith(
					expect.objectContaining({
						filter: expect.objectContaining({
							type: 'apiKey',
							withRole: 'credential:user',
							user: memberUser,
						}),
					}),
					['cred-1'],
				);
			});
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

	describe('findAllCredentialIdsForWorkflow', () => {
		const workflowId = 'workflow-1';
		const ownerUser = mock<User>({ id: 'owner-id', role: GLOBAL_OWNER_ROLE });
		const memberUser = mock<User>({ id: 'member-id', role: GLOBAL_MEMBER_ROLE });

		it('should return all personal credentials when owner has global read permissions', async () => {
			// ARRANGE
			const personalCred1 = mock<CredentialsEntity>({ id: 'cred-1' });
			const personalCred2 = mock<CredentialsEntity>({ id: 'cred-2' });
			userRepository.findPersonalOwnerForWorkflow.mockResolvedValue(ownerUser);
			credentialsRepository.findAllPersonalCredentials.mockResolvedValue([
				personalCred1,
				personalCred2,
			]);

			// ACT
			const credentials = await service.findAllCredentialIdsForWorkflow(workflowId);

			// ASSERT
			expect(userRepository.findPersonalOwnerForWorkflow).toHaveBeenCalledWith(workflowId);
			expect(credentialsRepository.findAllPersonalCredentials).toHaveBeenCalled();
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([personalCred1, personalCred2]);
		});

		it('should return workflow credentials when owner lacks global read permissions', async () => {
			// ARRANGE
			const workflowCred1 = mock<CredentialsEntity>({ id: 'cred-1' });
			const workflowCred2 = mock<CredentialsEntity>({ id: 'cred-2' });
			userRepository.findPersonalOwnerForWorkflow.mockResolvedValue(memberUser);
			credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValue([
				workflowCred1,
				workflowCred2,
			]);

			// ACT
			const credentials = await service.findAllCredentialIdsForWorkflow(workflowId);

			// ASSERT
			expect(userRepository.findPersonalOwnerForWorkflow).toHaveBeenCalledWith(workflowId);
			expect(credentialsRepository.findAllCredentialsForWorkflow).toHaveBeenCalledWith(workflowId);
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([workflowCred1, workflowCred2]);
		});

		it('should return workflow credentials when user is not found', async () => {
			// ARRANGE
			const workflowCred = mock<CredentialsEntity>({ id: 'cred-1' });
			userRepository.findPersonalOwnerForWorkflow.mockResolvedValue(null);
			credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValue([workflowCred]);

			// ACT
			const credentials = await service.findAllCredentialIdsForWorkflow(workflowId);

			// ASSERT
			expect(credentialsRepository.findAllCredentialsForWorkflow).toHaveBeenCalledWith(workflowId);
			expect(credentials).toHaveLength(1);
		});
	});

	describe('findAllCredentialIdsForProject', () => {
		const projectId = 'project-1';
		const ownerUser = mock<User>({ id: 'owner-id', role: GLOBAL_OWNER_ROLE });
		const memberUser = mock<User>({ id: 'member-id', role: GLOBAL_MEMBER_ROLE });

		it('should return all personal credentials when project owner has global read permissions', async () => {
			// ARRANGE
			const personalCred1 = mock<CredentialsEntity>({ id: 'cred-1' });
			const personalCred2 = mock<CredentialsEntity>({ id: 'cred-2' });
			userRepository.findPersonalOwnerForProject.mockResolvedValue(ownerUser);
			credentialsRepository.findAllPersonalCredentials.mockResolvedValue([
				personalCred1,
				personalCred2,
			]);

			// ACT
			const credentials = await service.findAllCredentialIdsForProject(projectId);

			// ASSERT
			expect(userRepository.findPersonalOwnerForProject).toHaveBeenCalledWith(projectId);
			expect(credentialsRepository.findAllPersonalCredentials).toHaveBeenCalled();
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([personalCred1, personalCred2]);
		});

		it('should return project credentials when owner lacks global read permissions', async () => {
			// ARRANGE
			const projectCred1 = mock<CredentialsEntity>({ id: 'cred-1' });
			const projectCred2 = mock<CredentialsEntity>({ id: 'cred-2' });
			userRepository.findPersonalOwnerForProject.mockResolvedValue(memberUser);
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([
				projectCred1,
				projectCred2,
			]);

			// ACT
			const credentials = await service.findAllCredentialIdsForProject(projectId);

			// ASSERT
			expect(userRepository.findPersonalOwnerForProject).toHaveBeenCalledWith(projectId);
			expect(credentialsRepository.findAllCredentialsForProject).toHaveBeenCalledWith(projectId);
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([projectCred1, projectCred2]);
		});

		it('should return project credentials when user is not found', async () => {
			// ARRANGE
			const projectCred = mock<CredentialsEntity>({ id: 'cred-1' });
			userRepository.findPersonalOwnerForProject.mockResolvedValue(null);
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([projectCred]);

			// ACT
			const credentials = await service.findAllCredentialIdsForProject(projectId);

			// ASSERT
			expect(credentialsRepository.findAllCredentialsForProject).toHaveBeenCalledWith(projectId);
			expect(credentials).toHaveLength(1);
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
						save: jest.fn().mockImplementation(async (entity) => {
							savedEntities.push(entity);
							return { ...entity, id: 'new-cred-id' };
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

		it('should throw error when non-owner tries to create global credential', async () => {
			// ARRANGE
			const payload = { ...credentialData, isGlobal: true };

			// ACT & ASSERT
			await expect(service.createUnmanagedCredential(payload, memberUser)).rejects.toThrow(
				'You do not have permission to create globally shared credentials',
			);
		});

		it('should create non-global credential by default', async () => {
			// ARRANGE
			const payload = { ...credentialData }; // no isGlobal field
			let savedCredential: any;
			// @ts-expect-error - Mocking manager for testing
			credentialsRepository.manager = {
				transaction: jest.fn().mockImplementation(async (callback) => {
					const mockManager = {
						save: jest.fn().mockImplementation(async (entity) => {
							savedCredential = entity;
							return { ...entity, id: 'new-cred-id' };
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

		it('should allow member to create non-global credential', async () => {
			// ARRANGE
			const payload = { ...credentialData, isGlobal: false };
			let savedCredential: any;
			// @ts-expect-error - Mocking manager for testing
			credentialsRepository.manager = {
				transaction: jest.fn().mockImplementation(async (callback) => {
					const mockManager = {
						save: jest.fn().mockImplementation(async (entity) => {
							savedCredential = entity;
							return { ...entity, id: 'new-cred-id' };
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

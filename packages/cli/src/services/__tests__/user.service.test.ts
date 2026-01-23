import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Project } from '@n8n/db';
import {
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	ProjectRelation,
	ProjectRepository,
	Role,
	User,
	UserRepository,
} from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG, PROJECT_VIEWER_ROLE_SLUG } from '@n8n/permissions';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UrlService } from '@/services/url.service';
import { UserService } from '@/services/user.service';
import type { UserManagementMailer } from '@/user-management/email';

import type { PublicApiKeyService } from '../public-api-key.service';
import type { RoleService } from '../role.service';
import { JwtService } from '../jwt.service';
import { PostHogClient } from '@/posthog';

describe('UserService', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		host: 'localhost',
		path: '/',
		port: 5678,
		listen_address: '::',
		protocol: 'http',
		editorBaseUrl: '',
	});
	const urlService = new UrlService(globalConfig);
	const manager = mock<EntityManager>();
	const userRepository = mockInstance(UserRepository, {
		manager,
	});
	const projectRepository = mockInstance(ProjectRepository, {
		manager,
	});
	const roleService = mock<RoleService>();
	const mailer = mock<UserManagementMailer>();
	const publicApiKeyService = mock<PublicApiKeyService>();
	const jwtService = mockInstance(JwtService, {
		sign: jest.fn().mockReturnValue('mock-jwt-token'),
	});
	const postHog = mockInstance(PostHogClient, {
		getFeatureFlags: jest.fn().mockResolvedValue({}),
	});
	const userService = new UserService(
		mock(),
		userRepository,
		projectRepository,
		mailer,
		urlService,
		mock(),
		publicApiKeyService,
		roleService,
		globalConfig,
		jwtService,
		postHog,
	);

	const commonMockUser = Object.assign(new User(), {
		id: uuid(),
		password: 'passwordHash',
		role: GLOBAL_MEMBER_ROLE,
	});

	afterEach(() => {
		jest.clearAllMocks();
		// Restore default transaction implementation after each test (because some mock it)
		manager.transaction.mockImplementation(async (arg1: unknown, arg2?: unknown) => {
			const runInTransaction = (arg2 ?? arg1) as (entityManager: EntityManager) => Promise<unknown>;
			return await runInTransaction(mock<EntityManager>());
		});
	});

	describe('toPublic', () => {
		it('should remove sensitive properties', async () => {
			const mockUser = Object.assign(new User(), {
				id: uuid(),
				password: 'passwordHash',
				mfaEnabled: false,
				mfaSecret: 'test',
				mfaRecoveryCodes: ['test'],
				updatedAt: new Date(),
				authIdentities: [],
				role: GLOBAL_MEMBER_ROLE,
			});

			type MaybeSensitiveProperties = Partial<
				Pick<User, 'password' | 'updatedAt' | 'authIdentities' | 'mfaSecret' | 'mfaRecoveryCodes'>
			>;

			// to prevent typechecking from blocking assertions
			const publicUser: MaybeSensitiveProperties = await userService.toPublic(mockUser);

			expect(publicUser.password).toBeUndefined();
			expect(publicUser.updatedAt).toBeUndefined();
			expect(publicUser.authIdentities).toBeUndefined();
			expect(publicUser.mfaSecret).toBeUndefined();
			expect(publicUser.mfaRecoveryCodes).toBeUndefined();
		});

		it('should add scopes if requested', async () => {
			const scoped = await userService.toPublic(commonMockUser, { withScopes: true });
			const unscoped = await userService.toPublic(commonMockUser);

			expect(scoped.globalScopes).toEqual(GLOBAL_MEMBER_ROLE.scopes.map((s) => s.slug));
			expect(unscoped.globalScopes).toBeUndefined();
		});

		it('should add invite URL if requested', async () => {
			const firstUser = Object.assign(new User(), { id: uuid(), role: GLOBAL_MEMBER_ROLE });
			const secondUser = Object.assign(new User(), {
				id: uuid(),
				role: GLOBAL_MEMBER_ROLE,
				isPending: true,
			});

			const withoutUrl = await userService.toPublic(secondUser);
			const withUrl = await userService.toPublic(secondUser, {
				withInviteUrl: true,
				inviterId: firstUser.id,
			});

			expect(withoutUrl.inviteAcceptUrl).toBeUndefined();

			const url = new URL(withUrl.inviteAcceptUrl ?? '');

			expect(url.searchParams.get('inviterId')).toBe(firstUser.id);
			expect(url.searchParams.get('inviteeId')).toBe(secondUser.id);
		});
	});

	describe('inviteUrl visibility', () => {
		describe('when inviteLinksEmailOnly = false', () => {
			beforeEach(() => {
				globalConfig.userManagement.inviteLinksEmailOnly = false;
			});

			describe('toPublic', () => {
				it('should include inviteAcceptUrl if requested', async () => {
					const inviter = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const pendingUser = Object.assign(new User(), {
						id: uuid(),
						role: GLOBAL_MEMBER_ROLE,
						isPending: true,
					});

					const result = await userService.toPublic(pendingUser, {
						withInviteUrl: true,
						inviterId: inviter.id,
					});

					expect(result.inviteAcceptUrl).toBeDefined();
					const url = new URL(result.inviteAcceptUrl ?? '');
					expect(url.searchParams.get('inviterId')).toBe(inviter.id);
					expect(url.searchParams.get('inviteeId')).toBe(pendingUser.id);
				});

				it('should not include inviteAcceptUrl if not requested', async () => {
					const inviter = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const pendingUser = Object.assign(new User(), {
						id: uuid(),
						role: GLOBAL_MEMBER_ROLE,
						isPending: true,
					});

					const result = await userService.toPublic(pendingUser, {
						inviterId: inviter.id,
					});

					expect(result.inviteAcceptUrl).toBeUndefined();
				});
			});

			describe('inviteUsers', () => {
				it('should include inviteAcceptUrl if email was not sent', async () => {
					const owner = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const invitations = [{ email: 'test@example.com', role: GLOBAL_MEMBER_ROLE.slug }];

					roleService.checkRolesExist.mockResolvedValue();
					userRepository.findManyByEmail.mockResolvedValue([]);
					userRepository.createUserWithProject.mockImplementation(async (userData) => {
						return { user: { ...userData, id: uuid() } as User, project: mock<Project>() };
					});
					mailer.invite.mockResolvedValue({ emailSent: false });
					// Feature flag disabled - should use old mechanism
					postHog.getFeatureFlags.mockResolvedValue({});

					const result = await userService.inviteUsers(owner, invitations);

					expect(result.usersInvited[0].user.inviteAcceptUrl).toBeDefined();
					expect(result.usersInvited[0].user.inviteAcceptUrl).toContain('inviterId');
					expect(result.usersInvited[0].user.inviteAcceptUrl).toContain('inviteeId');
					expect(jwtService.sign).not.toHaveBeenCalled();
				});

				it('should use JWT token when feature flag is enabled', async () => {
					const owner = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const invitations = [{ email: 'test@example.com', role: GLOBAL_MEMBER_ROLE.slug }];

					roleService.checkRolesExist.mockResolvedValue();
					userRepository.findManyByEmail.mockResolvedValue([]);
					userRepository.createUserWithProject.mockImplementation(async (userData) => {
						return { user: { ...userData, id: uuid() } as User, project: mock<Project>() };
					});
					mailer.invite.mockResolvedValue({ emailSent: false });
					// Feature flag enabled - should use JWT tokens
					postHog.getFeatureFlags.mockResolvedValue({
						'061_tamper_proof_invite_links': true,
					});

					const result = await userService.inviteUsers(owner, invitations);

					expect(result.usersInvited[0].user.inviteAcceptUrl).toBeDefined();
					expect(result.usersInvited[0].user.inviteAcceptUrl).toContain('token=mock-jwt-token');
					expect(jwtService.sign).toHaveBeenCalled();
				});

				it('should not include inviteAcceptUrl if email was sent', async () => {
					const owner = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const invitations = [{ email: 'test@example.com', role: GLOBAL_MEMBER_ROLE.slug }];

					roleService.checkRolesExist.mockResolvedValue();
					userRepository.findManyByEmail.mockResolvedValue([]);
					userRepository.createUserWithProject.mockImplementation(async (userData) => {
						return { user: { ...userData, id: uuid() } as User, project: mock<Project>() };
					});
					mailer.invite.mockResolvedValue({ emailSent: true });

					const result = await userService.inviteUsers(owner, invitations);

					expect(result.usersInvited[0].user.inviteAcceptUrl).toBeUndefined();
				});
			});
		});

		describe('when inviteLinksEmailOnly = true', () => {
			beforeEach(() => {
				globalConfig.userManagement.inviteLinksEmailOnly = true;
			});

			describe('toPublic', () => {
				it('should not include inviteAcceptUrl if requested', async () => {
					const inviter = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const pendingUser = Object.assign(new User(), {
						id: uuid(),
						role: GLOBAL_MEMBER_ROLE,
						isPending: true,
					});

					const result = await userService.toPublic(pendingUser, {
						withInviteUrl: true,
						inviterId: inviter.id,
					});

					expect(result.inviteAcceptUrl).toBeUndefined();
				});

				it('should not include inviteAcceptUrl if not requested', async () => {
					const inviter = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const pendingUser = Object.assign(new User(), {
						id: uuid(),
						role: GLOBAL_MEMBER_ROLE,
						isPending: true,
					});

					const result = await userService.toPublic(pendingUser, {
						inviterId: inviter.id,
					});

					expect(result.inviteAcceptUrl).toBeUndefined();
				});
			});

			describe('inviteUsers', () => {
				it('should not include inviteAcceptUrl if email was not sent', async () => {
					const owner = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const invitations = [{ email: 'test@example.com', role: GLOBAL_MEMBER_ROLE.slug }];

					roleService.checkRolesExist.mockResolvedValue();
					userRepository.findManyByEmail.mockResolvedValue([]);
					userRepository.createUserWithProject.mockImplementation(async (userData) => {
						return { user: { ...userData, id: uuid() } as User, project: mock<Project>() };
					});
					mailer.invite.mockResolvedValue({ emailSent: false });

					const result = await userService.inviteUsers(owner, invitations);

					expect(result.usersInvited[0].user.inviteAcceptUrl).toBeUndefined();
				});

				it('should not include inviteAcceptUrl if email was sent', async () => {
					const owner = Object.assign(new User(), { id: uuid(), role: GLOBAL_ADMIN_ROLE });
					const invitations = [{ email: 'test@example.com', role: GLOBAL_MEMBER_ROLE.slug }];

					roleService.checkRolesExist.mockResolvedValue();
					userRepository.findManyByEmail.mockResolvedValue([]);
					userRepository.createUserWithProject.mockImplementation(async (userData) => {
						return { user: { ...userData, id: uuid() } as User, project: mock<Project>() };
					});
					mailer.invite.mockResolvedValue({ emailSent: true });

					const result = await userService.inviteUsers(owner, invitations);

					expect(result.usersInvited[0].user.inviteAcceptUrl).toBeUndefined();
				});
			});
		});
	});

	describe('update', () => {
		// We need to use `save` so that that the subscriber in
		// packages/@n8n/db/src/entities/Project.ts receives the full user.
		// With `update` it would only receive the updated fields, e.g. the `id`
		// would be missing.
		it('should use `save` instead of `update`', async () => {
			const user = new User();
			user.firstName = 'Not Nathan';
			user.lastName = 'Nathaniel';

			const userId = '1234';
			const data = {
				firstName: 'Nathan',
			};

			userRepository.findOneBy.mockResolvedValueOnce(user);

			await userService.update(userId, data);

			expect(userRepository.save).toHaveBeenCalledWith({ ...user, ...data }, { transaction: true });
			expect(userRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('inviteUsers', () => {
		it('should invite users', async () => {
			const owner = Object.assign(new User(), { id: uuid() });
			const invitations = [
				{ email: 'test1@example.com', role: GLOBAL_ADMIN_ROLE.slug },
				{ email: 'test2@example.com', role: GLOBAL_MEMBER_ROLE.slug },
				{ email: 'test3@example.com', role: 'custom:role' },
			];

			roleService.checkRolesExist.mockResolvedValue();
			userRepository.findManyByEmail.mockResolvedValue([]);
			userRepository.createUserWithProject.mockImplementation(async (userData) => {
				return { user: { ...userData, id: uuid() } as User, project: mock<Project>() };
			});

			await userService.inviteUsers(owner, invitations);

			expect(userRepository.createUserWithProject).toHaveBeenCalledTimes(3);
		});

		it('should fail if role do not exist', async () => {
			const owner = Object.assign(new User(), { id: uuid() });
			const invitations = [{ email: 'test1@example.com', role: 'nonexistent:role' }];

			roleService.checkRolesExist.mockRejectedValue(
				new BadRequestError('Role nonexistent:role does not exist'),
			);
			userRepository.findManyByEmail.mockResolvedValue([]);
			userRepository.createUserWithProject.mockImplementation(async (userData) => {
				return { user: { ...userData, id: uuid() } as User, project: mock<Project>() };
			});

			await expect(userService.inviteUsers(owner, invitations)).rejects.toThrowError(
				'Role nonexistent:role does not exist',
			);
		});
	});

	describe('changeUserRole', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			manager.transaction.mockImplementation(async (arg1: unknown, arg2?: unknown) => {
				const runInTransaction = (arg2 ?? arg1) as (
					entityManager: EntityManager,
				) => Promise<unknown>;
				return await runInTransaction(manager);
			});
		});

		it('throws an error if provided user role does not exist', async () => {
			const user = new User();
			user.role = new Role();
			user.role.slug = 'global:member';

			await expect(
				userService.changeUserRole(user, { newRoleName: 'global:invalid' }),
			).rejects.toThrowError('Role nonexistent:role does not exist');
		});

		it('updates the role of the given user', async () => {
			const user = new User();
			user.id = uuid();
			user.role = new Role();
			user.role.slug = 'global:member';
			roleService.checkRolesExist.mockResolvedValueOnce();

			await userService.changeUserRole(user, { newRoleName: 'global:admin' });

			expect(manager.update).toHaveBeenCalledWith(
				User,
				{ id: user.id },
				{ role: { slug: 'global:admin' } },
			);
			expect(publicApiKeyService.removeOwnerOnlyScopesFromApiKeys).not.toHaveBeenCalled();
			expect(publicApiKeyService.deleteAllApiKeysForUser).not.toHaveBeenCalled();
		});

		it('removes higher privilege scopes from API tokens of user who is demoted from admin', async () => {
			const user = new User();
			user.id = uuid();
			user.role = new Role();
			user.role.slug = 'global:admin';
			roleService.checkRolesExist.mockResolvedValueOnce();

			await userService.changeUserRole(user, { newRoleName: 'global:member' });

			expect(manager.update).toHaveBeenCalledWith(
				User,
				{ id: user.id },
				{ role: { slug: 'global:member' } },
			);
			expect(publicApiKeyService.removeOwnerOnlyScopesFromApiKeys).toHaveBeenCalled();
			expect(publicApiKeyService.deleteAllApiKeysForUser).not.toHaveBeenCalled();
		});

		it('removes project roles of user who is demoted to chat user from member', async () => {
			const user = new User();
			user.id = uuid();
			user.role = new Role();
			user.role.slug = 'global:member';
			roleService.checkRolesExist.mockResolvedValueOnce();

			const personalProject = new Project();
			personalProject.id = uuid();
			personalProject.type = 'personal';
			personalProject.creatorId = user.id;

			const projectId = uuid();
			manager.find.mockResolvedValueOnce([
				Object.assign(new ProjectRelation(), {
					userId: user.id,
					role: Object.assign(new Role(), { slug: PROJECT_VIEWER_ROLE_SLUG }),
					projectId,
				}),
			]);

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValueOnce(personalProject);

			await userService.changeUserRole(user, { newRoleName: 'global:chatUser' });

			expect(manager.delete).toHaveBeenCalledTimes(1);
			expect(manager.delete).toHaveBeenCalledWith(ProjectRelation, {
				userId: user.id,
				projectId,
			});

			expect(manager.update).toHaveBeenCalledWith(
				ProjectRelation,
				{
					userId: user.id,
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
					projectId: personalProject.id,
				},
				{ role: { slug: PROJECT_VIEWER_ROLE_SLUG } },
			);

			// Ensure all their API keys are revoked
			expect(publicApiKeyService.removeOwnerOnlyScopesFromApiKeys).not.toHaveBeenCalled();
			expect(publicApiKeyService.deleteAllApiKeysForUser).toHaveBeenCalledWith(user, manager);
		});

		it('assigns chat user project:viewer on their personal project when demoted from member', async () => {
			const user = new User();
			user.id = uuid();
			user.role = new Role();
			user.role.slug = 'global:member';
			roleService.checkRolesExist.mockResolvedValueOnce();

			const personalProject = new Project();
			personalProject.id = uuid();
			personalProject.type = 'personal';
			personalProject.creatorId = user.id;

			manager.find.mockResolvedValueOnce([]);
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValueOnce(personalProject);

			await userService.changeUserRole(user, { newRoleName: 'global:chatUser' });

			expect(manager.update).toHaveBeenCalledWith(
				ProjectRelation,
				{
					userId: user.id,
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
					projectId: personalProject.id,
				},
				{ role: { slug: PROJECT_VIEWER_ROLE_SLUG } },
			);

			// Ensure all their API keys are revoked
			expect(publicApiKeyService.removeOwnerOnlyScopesFromApiKeys).not.toHaveBeenCalled();
			expect(publicApiKeyService.deleteAllApiKeysForUser).toHaveBeenCalledWith(user, manager);
		});

		it('assigns chat user project:viewer on their personal project when demoted from admin', async () => {
			const user = new User();
			user.id = uuid();
			user.role = new Role();
			user.role.slug = 'global:admin';
			roleService.checkRolesExist.mockResolvedValueOnce();

			const personalProject = new Project();
			personalProject.id = uuid();
			personalProject.type = 'personal';
			personalProject.creatorId = user.id;

			manager.find.mockResolvedValueOnce([]);
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValueOnce(personalProject);

			await userService.changeUserRole(user, { newRoleName: 'global:chatUser' });

			expect(manager.update).toHaveBeenCalledWith(
				ProjectRelation,
				{
					userId: user.id,
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
					projectId: personalProject.id,
				},
				{ role: { slug: PROJECT_VIEWER_ROLE_SLUG } },
			);

			// Ensure all their API keys are revoked.
			expect(publicApiKeyService.removeOwnerOnlyScopesFromApiKeys).not.toHaveBeenCalled();
			expect(publicApiKeyService.deleteAllApiKeysForUser).toHaveBeenCalledWith(user, manager);
		});

		it('assigns chat user project:personalOwner when upgraded to member', async () => {
			const user = new User();
			user.id = uuid();
			user.role = new Role();
			user.role.slug = 'global:chatUser';
			roleService.checkRolesExist.mockResolvedValueOnce();

			const personalProject = new Project();
			personalProject.id = uuid();
			personalProject.type = 'personal';
			personalProject.creatorId = user.id;

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValueOnce(personalProject);

			await userService.changeUserRole(user, { newRoleName: 'global:member' });

			expect(manager.update).toHaveBeenCalledWith(
				ProjectRelation,
				{
					userId: user.id,
					role: { slug: PROJECT_VIEWER_ROLE_SLUG },
					projectId: personalProject.id,
				},
				{ role: { slug: PROJECT_OWNER_ROLE_SLUG } },
			);
		});
	});

	describe('getInvitationIdsFromPayload', () => {
		it('should extract inviterId and inviteeId from valid JWT token', async () => {
			const inviterId = uuid();
			const inviteeId = uuid();
			const token = 'valid-jwt-token';
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			jwtService.verify.mockReturnValue({
				inviterId,
				inviteeId,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);
			postHog.getFeatureFlags.mockResolvedValue({
				'061_tamper_proof_invite_links': true,
			});

			const result = await userService.getInvitationIdsFromPayload({ token });

			expect(result).toEqual({ inviterId, inviteeId });
			expect(jwtService.verify).toHaveBeenCalledWith(token);
		});

		it('should extract inviterId and inviteeId from legacy format (inviterId and inviteeId)', async () => {
			const inviterId = uuid();
			const inviteeId = uuid();
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);
			postHog.getFeatureFlags.mockResolvedValue({
				'061_tamper_proof_invite_links': false,
			});

			const result = await userService.getInvitationIdsFromPayload({ inviterId, inviteeId });

			expect(result).toEqual({ inviterId, inviteeId });
			expect(jwtService.verify).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError if JWT token verification fails', async () => {
			const token = 'invalid-jwt-token';
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			jwtService.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);

			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				'Invalid invite URL',
			);
		});

		it('should throw BadRequestError if JWT token payload is missing inviterId', async () => {
			const token = 'valid-jwt-token';
			const inviteeId = uuid();
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			jwtService.verify.mockReturnValue({
				inviteeId,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);

			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				'Invalid invite URL',
			);
		});

		it('should throw BadRequestError if JWT token payload is missing inviteeId', async () => {
			const token = 'valid-jwt-token';
			const inviterId = uuid();
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			jwtService.verify.mockReturnValue({
				inviterId,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);

			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				'Invalid invite URL',
			);
		});

		it('should throw BadRequestError if neither token nor inviterId/inviteeId are provided', async () => {
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);

			await expect(userService.getInvitationIdsFromPayload({})).rejects.toThrow(BadRequestError);
			await expect(userService.getInvitationIdsFromPayload({})).rejects.toThrow(
				'Invalid invite URL',
			);
		});

		it('should throw BadRequestError if only inviterId is provided (missing inviteeId)', async () => {
			const inviterId = uuid();
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);

			await expect(userService.getInvitationIdsFromPayload({ inviterId })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ inviterId })).rejects.toThrow(
				'Invalid invite URL',
			);
		});

		it('should throw BadRequestError if only inviteeId is provided (missing inviterId)', async () => {
			const inviteeId = uuid();
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);

			await expect(userService.getInvitationIdsFromPayload({ inviteeId })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ inviteeId })).rejects.toThrow(
				'Invalid invite URL',
			);
		});

		it('should throw BadRequestError when both token and inviterId/inviteeId are provided', async () => {
			const token = 'valid-jwt-token';
			const legacyInviterId = uuid();
			const legacyInviteeId = uuid();

			await expect(
				userService.getInvitationIdsFromPayload({
					token,
					inviterId: legacyInviterId,
					inviteeId: legacyInviteeId,
				}),
			).rejects.toThrow(BadRequestError);
			await expect(
				userService.getInvitationIdsFromPayload({
					token,
					inviterId: legacyInviterId,
					inviteeId: legacyInviteeId,
				}),
			).rejects.toThrow('Invalid invite URL');
		});

		it('should accept JWT token when feature flag is enabled for instance owner', async () => {
			const inviterId = uuid();
			const inviteeId = uuid();
			const token = 'valid-jwt-token';
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			jwtService.verify.mockReturnValue({
				inviterId,
				inviteeId,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);
			postHog.getFeatureFlags.mockResolvedValue({
				'061_tamper_proof_invite_links': true,
			});

			const result = await userService.getInvitationIdsFromPayload({ token });

			expect(result).toEqual({ inviterId, inviteeId });
			expect(jwtService.verify).toHaveBeenCalledWith(token);
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			});
			expect(postHog.getFeatureFlags).toHaveBeenCalledWith({
				id: instanceOwner.id,
				createdAt: instanceOwner.createdAt,
			});
		});

		it('should reject JWT token when feature flag is disabled for instance owner', async () => {
			const inviterId = uuid();
			const inviteeId = uuid();
			const token = 'valid-jwt-token';
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			jwtService.verify.mockReturnValue({
				inviterId,
				inviteeId,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);
			postHog.getFeatureFlags.mockResolvedValue({
				'061_tamper_proof_invite_links': false,
			});

			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				'Invalid invite URL',
			);
		});

		it('should accept legacy format when feature flag is disabled for instance owner', async () => {
			const inviterId = uuid();
			const inviteeId = uuid();
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);
			postHog.getFeatureFlags.mockResolvedValue({
				'061_tamper_proof_invite_links': false,
			});

			const result = await userService.getInvitationIdsFromPayload({ inviterId, inviteeId });

			expect(result).toEqual({ inviterId, inviteeId });
			expect(jwtService.verify).not.toHaveBeenCalled();
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			});
		});

		it('should accept legacy format when feature flag is enabled for instance owner', async () => {
			const inviterId = uuid();
			const inviteeId = uuid();
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);
			postHog.getFeatureFlags.mockResolvedValue({
				'061_tamper_proof_invite_links': true,
			});

			const result = await userService.getInvitationIdsFromPayload({ inviterId, inviteeId });

			expect(result).toEqual({ inviterId, inviteeId });
			expect(jwtService.verify).not.toHaveBeenCalled();
		});

		it('should throw error when instance owner is not found', async () => {
			const inviterId = uuid();
			const inviteeId = uuid();
			const token = 'valid-jwt-token';

			jwtService.verify.mockReturnValue({
				inviterId,
				inviteeId,
			});

			userRepository.findOne.mockResolvedValue(null);

			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				'Instance owner not found',
			);
		});

		it('should throw error when feature flag is enabled but no token and only one ID provided', async () => {
			const inviterId = uuid();
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);
			postHog.getFeatureFlags.mockResolvedValue({
				'061_tamper_proof_invite_links': true,
			});

			await expect(userService.getInvitationIdsFromPayload({ inviterId })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ inviterId })).rejects.toThrow(
				'Invalid invite URL',
			);
		});

		it('should throw error when feature flag is disabled but no inviterId/inviteeId provided', async () => {
			const inviterId = uuid();
			const inviteeId = uuid();
			const token = 'valid-jwt-token';
			const instanceOwner = Object.assign(new User(), {
				id: uuid(),
				createdAt: new Date(),
				role: GLOBAL_OWNER_ROLE,
			});

			jwtService.verify.mockReturnValue({
				inviterId,
				inviteeId,
			});

			userRepository.findOne.mockResolvedValue(instanceOwner);
			postHog.getFeatureFlags.mockResolvedValue({
				'061_tamper_proof_invite_links': false,
			});

			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				BadRequestError,
			);
			await expect(userService.getInvitationIdsFromPayload({ token })).rejects.toThrow(
				'Invalid invite URL',
			);
		});
	});

	describe('findSsoIdentity', () => {
		it('should return undefined when user has no SSO identity', async () => {
			const userId = uuid();
			userRepository.findOne.mockResolvedValue(
				Object.assign(new User(), {
					id: userId,
					authIdentities: [{ providerType: 'email' }],
				}),
			);

			const result = await userService.findSsoIdentity(userId);

			expect(result).toBeUndefined();
		});

		it('should return SSO identity when user has LDAP identity', async () => {
			const userId = uuid();
			const ldapIdentity = { providerType: 'ldap', providerId: 'ldap-id' };
			userRepository.findOne.mockResolvedValue(
				Object.assign(new User(), {
					id: userId,
					authIdentities: [ldapIdentity],
				}),
			);

			const result = await userService.findSsoIdentity(userId);

			expect(result).toEqual(ldapIdentity);
		});

		it('should return SSO identity when user has both email and SSO identity', async () => {
			const userId = uuid();
			const samlIdentity = { providerType: 'saml', providerId: 'saml-id' };
			userRepository.findOne.mockResolvedValue(
				Object.assign(new User(), {
					id: userId,
					authIdentities: [{ providerType: 'email' }, samlIdentity],
				}),
			);

			const result = await userService.findSsoIdentity(userId);

			expect(result).toEqual(samlIdentity);
		});
	});
});

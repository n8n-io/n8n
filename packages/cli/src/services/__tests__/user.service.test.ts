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
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UrlService } from '@/services/url.service';
import { UserService } from '@/services/user.service';
import type { UserManagementMailer } from '@/user-management/email';

import type { OwnershipService } from '../ownership.service';
import type { ProjectService } from '../project.service.ee';
import type { PublicApiKeyService } from '../public-api-key.service';
import type { RoleService } from '../role.service';
import { JwtService } from '../jwt.service';

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
	const ownershipService = mock<OwnershipService>();
	const roleService = mock<RoleService>();
	const mailer = mock<UserManagementMailer>();
	const publicApiKeyService = mock<PublicApiKeyService>();
	const projectService = mock<ProjectService>();
	const jwtService = mockInstance(JwtService, {
		sign: jest.fn().mockReturnValue('mock-jwt-token'),
	});
	const userService = new UserService(
		mock(),
		userRepository,
		projectRepository,
		mailer,
		urlService,
		mock(),
		ownershipService,
		publicApiKeyService,
		roleService,
		globalConfig,
		jwtService,
		projectService,
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
	});

	describe('inviteUrl visibility', () => {
		describe('when inviteLinksEmailOnly = false', () => {
			beforeEach(() => {
				globalConfig.userManagement.inviteLinksEmailOnly = false;
			});

			describe('toPublic', () => {
				it('should not include inviteAcceptUrl', async () => {
					const pendingUser = Object.assign(new User(), {
						id: uuid(),
						role: GLOBAL_MEMBER_ROLE,
						isPending: true,
					});

					const result = await userService.toPublic(pendingUser);

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
				it('should not include inviteAcceptUrl', async () => {
					const pendingUser = Object.assign(new User(), {
						id: uuid(),
						role: GLOBAL_MEMBER_ROLE,
						isPending: true,
					});

					const result = await userService.toPublic(pendingUser);

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

		it('invalidates the project-owner cache after role change', async () => {
			const user = new User();
			user.id = uuid();
			user.role = new Role();
			user.role.slug = 'global:member';
			roleService.checkRolesExist.mockResolvedValueOnce();

			await userService.changeUserRole(user, { newRoleName: 'global:admin' });

			expect(ownershipService.invalidateProjectOwnerCacheByUserId).toHaveBeenCalledWith(user.id);
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

			const result = await userService.getInvitationIdsFromPayload(token);

			expect(result).toEqual({ inviterId, inviteeId });
			expect(jwtService.verify).toHaveBeenCalledWith(token);
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			});
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

			await expect(userService.getInvitationIdsFromPayload(token)).rejects.toThrow(BadRequestError);
			await expect(userService.getInvitationIdsFromPayload(token)).rejects.toThrow(
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

			await expect(userService.getInvitationIdsFromPayload(token)).rejects.toThrow(BadRequestError);
			await expect(userService.getInvitationIdsFromPayload(token)).rejects.toThrow(
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

			await expect(userService.getInvitationIdsFromPayload(token)).rejects.toThrow(BadRequestError);
			await expect(userService.getInvitationIdsFromPayload(token)).rejects.toThrow(
				'Invalid invite URL',
			);
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

			await expect(userService.getInvitationIdsFromPayload(token)).rejects.toThrow(BadRequestError);
			await expect(userService.getInvitationIdsFromPayload(token)).rejects.toThrow(
				'Instance owner not found',
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

	describe('assertGetUsersAccess', () => {
		it('should allow project admin to list all users', async () => {
			const member = Object.assign(new User(), { role: GLOBAL_MEMBER_ROLE });
			projectService.getProjectIdsWithScope.mockResolvedValueOnce(['project-1']);

			await expect(userService.assertGetUsersAccess(member)).resolves.toBeUndefined();

			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(member, [
				'project:update',
			]);
		});

		it('should allow non-admin members to list users by projectId', async () => {
			const member = Object.assign(new User(), { role: GLOBAL_MEMBER_ROLE });
			projectService.getProjectWithScope.mockResolvedValueOnce(mock<Project>());

			await expect(userService.assertGetUsersAccess(member, 'project-1')).resolves.toBeUndefined();

			expect(projectService.getProjectWithScope).toHaveBeenCalledWith(member, 'project-1', [
				'project:list',
			]);
		});

		it('should throw ForbiddenError for member without project admin scope', async () => {
			const member = Object.assign(new User(), { role: GLOBAL_MEMBER_ROLE });
			projectService.getProjectIdsWithScope.mockResolvedValueOnce([]);

			await expect(userService.assertGetUsersAccess(member)).rejects.toThrow(ForbiddenError);
		});

		it('should throw NotFoundError when filtering by unknown projectId', async () => {
			const member = Object.assign(new User(), { role: GLOBAL_MEMBER_ROLE });
			projectService.getProjectWithScope.mockResolvedValueOnce(null);

			await expect(userService.assertGetUsersAccess(member, 'unknown-project')).rejects.toThrow(
				NotFoundError,
			);
		});
	});
});

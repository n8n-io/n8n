import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project } from '@n8n/db';
import { GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE, Role, User, UserRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UrlService } from '@/services/url.service';
import { UserService } from '@/services/user.service';
import type { UserManagementMailer } from '@/user-management/email';

import type { RoleService } from '../role.service';
import { type PublicApiKeyService } from '../public-api-key.service';

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
	const roleService = mock<RoleService>();
	const mailer = mock<UserManagementMailer>();
	const publicApiKeyService = mock<PublicApiKeyService>();
	const userService = new UserService(
		mock(),
		userRepository,
		mailer,
		urlService,
		mock(),
		publicApiKeyService,
		roleService,
		globalConfig,
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

					const result = await userService.inviteUsers(owner, invitations);

					expect(result.usersInvited[0].user.inviteAcceptUrl).toBeDefined();
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
		});
	});
});

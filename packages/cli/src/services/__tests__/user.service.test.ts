import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project } from '@n8n/db';
import { GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE, User, UserRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UrlService } from '@/services/url.service';
import { UserService } from '@/services/user.service';

import type { RoleService } from '../role.service';

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
	const userRepository = mockInstance(UserRepository, {
		manager: mock<EntityManager>({
			transaction: async (cb) =>
				typeof cb === 'function' ? await cb(mock<EntityManager>()) : await Promise.resolve(),
		}),
	});
	const roleService = mock<RoleService>();
	const userService = new UserService(
		mock(),
		userRepository,
		mock(),
		urlService,
		mock(),
		mock(),
		roleService,
	);

	const commonMockUser = Object.assign(new User(), {
		id: uuid(),
		password: 'passwordHash',
		role: GLOBAL_MEMBER_ROLE,
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
});

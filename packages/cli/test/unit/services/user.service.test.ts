import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { AuthUser } from '@db/entities/AuthUser';
import { AuthUserRepository } from '@db/repositories/authUser.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { UserService } from '@/services/user.service';
import { UrlService } from '@/services/url.service';
import { mockInstance } from '../../shared/mocking';

describe('UserService', () => {
	const urlService = new UrlService();
	const authUserRepository = mockInstance(AuthUserRepository);
	const userRepository = mockInstance(UserRepository);
	const userService = new UserService(
		mock(),
		authUserRepository,
		userRepository,
		mock(),
		urlService,
	);

	const commonMockUser = Object.assign(new AuthUser(), {
		id: uuid(),
		password: 'passwordHash',
	});

	describe('toPublic', () => {
		it('should remove sensitive properties', async () => {
			const mockUser = Object.assign(new AuthUser(), {
				id: uuid(),
				password: 'passwordHash',
				mfaEnabled: false,
				mfaSecret: 'test',
				mfaRecoveryCodes: ['test'],
				updatedAt: new Date(),
				authIdentities: [],
			});

			type MaybeSensitiveProperties = Partial<
				Pick<AuthUser, 'password' | 'updatedAt' | 'authIdentities'>
			>;

			// to prevent typechecking from blocking assertions
			const publicUser: MaybeSensitiveProperties = await userService.toPublic(mockUser);

			expect(publicUser.password).toBeUndefined();
			expect(publicUser.updatedAt).toBeUndefined();
			expect(publicUser.authIdentities).toBeUndefined();
		});

		it('should add scopes if requested', async () => {
			const scoped = await userService.toPublic(commonMockUser, { withScopes: true });
			const unscoped = await userService.toPublic(commonMockUser);

			expect(scoped.globalScopes).toEqual([]);
			expect(unscoped.globalScopes).toBeUndefined();
		});

		it('should add invite URL if requested', async () => {
			const firstUser = Object.assign(new AuthUser(), { id: uuid() });
			const secondUser = Object.assign(new AuthUser(), { id: uuid(), isPending: true });

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
		// packages/cli/src/databases/entities/Project.ts receives the full user.
		// With `update` it would only receive the updated fields, e.g. the `id`
		// would be missing.
		it('should use `save` instead of `update`', async () => {
			const user = new AuthUser();
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
});

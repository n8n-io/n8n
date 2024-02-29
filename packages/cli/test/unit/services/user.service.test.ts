import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { AuthUser } from '@db/entities/AuthUser';
import { UserService } from '@/services/user.service';
import { UrlService } from '@/services/url.service';

describe('UserService', () => {
	const urlService = new UrlService();
	const userService = new UserService(mock(), mock(), mock(), mock(), urlService);

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
				// @ts-expect-error
				Pick<User, 'password' | 'mfaSecret' | 'mfaRecoveryCodes' | 'updatedAt' | 'authIdentities'>
			>;

			// to prevent typechecking from blocking assertions
			const publicUser: MaybeSensitiveProperties = await userService.toPublic(mockUser);

			expect(publicUser.password).toBeUndefined();
			expect(publicUser.mfaSecret).toBeUndefined();
			expect(publicUser.mfaRecoveryCodes).toBeUndefined();
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
});

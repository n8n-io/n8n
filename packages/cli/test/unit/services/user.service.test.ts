import Container from 'typedi';
import jwt from 'jsonwebtoken';
import { Logger } from '@/Logger';
import config from '@/config';
import { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import { UserService } from '@/services/user.service';
import { mockInstance } from '../../shared/mocking';
import { RoleService } from '@/services/role.service';
import { v4 as uuid } from 'uuid';

describe('UserService', () => {
	config.set('userManagement.jwtSecret', 'random-secret');

	mockInstance(Logger);
	mockInstance(RoleService);

	const userRepository = mockInstance(UserRepository);
	const userService = Container.get(UserService);

	const commonMockUser = Object.assign(new User(), {
		id: uuid(),
		password: 'passwordHash',
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
			});

			type MaybeSensitiveProperties = Partial<
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
			const firstUser = Object.assign(new User(), { id: uuid() });
			const secondUser = Object.assign(new User(), { id: uuid(), isPending: true });

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

	describe('generatePasswordResetToken', () => {
		it('should generate valid password-reset tokens', () => {
			const token = userService.generatePasswordResetToken(commonMockUser);

			const decoded = jwt.decode(token) as jwt.JwtPayload;

			if (!decoded.exp) fail('Token does not contain expiry');
			if (!decoded.iat) fail('Token does not contain issued-at');

			expect(decoded.sub).toEqual(commonMockUser.id);
			expect(decoded.exp - decoded.iat).toEqual(1200); // Expires in 20 minutes
			expect(decoded.passwordSha).toEqual(
				'31513c5a9e3c5afe5c06d5675ace74e8bc3fadd9744ab5d89c311f2a62ccbd39',
			);
		});
	});

	describe('resolvePasswordResetToken', () => {
		it('should not return a user if the token in invalid', async () => {
			const user = await userService.resolvePasswordResetToken('invalid-token');

			expect(user).toBeUndefined();
		});

		it('should not return a user if the token in expired', async () => {
			const token = userService.generatePasswordResetToken(commonMockUser, '-1h');

			const user = await userService.resolvePasswordResetToken(token);

			expect(user).toBeUndefined();
		});

		it('should not return a user if the user does not exist in the DB', async () => {
			userRepository.findOne.mockResolvedValueOnce(null);
			const token = userService.generatePasswordResetToken(commonMockUser);

			const user = await userService.resolvePasswordResetToken(token);

			expect(user).toBeUndefined();
		});

		it('should not return a user if the password sha does not match', async () => {
			const token = userService.generatePasswordResetToken(commonMockUser);
			const updatedUser = Object.create(commonMockUser);
			updatedUser.password = 'something-else';
			userRepository.findOne.mockResolvedValueOnce(updatedUser);

			const user = await userService.resolvePasswordResetToken(token);

			expect(user).toBeUndefined();
		});

		it('should not return the user if all checks pass', async () => {
			const token = userService.generatePasswordResetToken(commonMockUser);
			userRepository.findOne.mockResolvedValueOnce(commonMockUser);

			const user = await userService.resolvePasswordResetToken(token);

			expect(user).toEqual(commonMockUser);
		});
	});
});

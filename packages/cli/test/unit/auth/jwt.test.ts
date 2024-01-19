import { Container } from 'typedi';
import { v4 as uuid } from 'uuid';

import config from '@/config';
import { JwtService } from '@/services/jwt.service';
import { License } from '@/License';
import { User } from '@db/entities/User';
import { issueJWT } from '@/auth/jwt';

import { mockInstance } from '../../shared/mocking';

// TODO: is the the right level of testing?
// Should I mock more or less?
// Should I write an integration test that checks that a user is actually logged out?
describe('jwt.issueJWT', () => {
	const jwtService = Container.get(JwtService);

	describe('when not setting userManagement.jwtSessionDuration', () => {
		beforeEach(() => {
			// TODO: Why do I need to mock the License but not for example the JwtService 🤷
			mockInstance(License);
		});

		it('should default to expire in 168 hours', () => {
			const defaultInSeconds = 7 * 24 * 60 * 60;
			// TODO: is this the right way to create a mock user?
			const mockUser = Object.assign(new User(), {
				id: uuid(),
				password: 'passwordHash',
				mfaEnabled: false,
				mfaSecret: 'test',
				mfaRecoveryCodes: ['test'],
				updatedAt: new Date(),
				authIdentities: [],
			});
			const { token, expiresInSeconds } = issueJWT(mockUser);

			expect(expiresInSeconds).toBe(defaultInSeconds);
			const decodedToken = jwtService.verify(token);
			expect(decodedToken.exp).toBeDefined();
			expect(decodedToken.iat).toBeDefined();
			expect(decodedToken.exp! - decodedToken.iat!).toBe(defaultInSeconds);
		});
	});

	describe('when setting userManagement.jwtSessionDuration', () => {
		let oldDuration: number;
		let testDuration = 1;

		beforeEach(() => {
			mockInstance(License);
			oldDuration = config.get('userManagement.jwtSessionDurationHours');
			config.set('userManagement.jwtSessionDurationHours', testDuration);
		});

		afterEach(() => {
			config.set('userManagement.jwtSessionDuration', oldDuration);
		});

		it('should apply it to tokens', () => {
			const mockUser = Object.assign(new User(), {
				id: uuid(),
				password: 'passwordHash',
				mfaEnabled: false,
				mfaSecret: 'test',
				mfaRecoveryCodes: ['test'],
				updatedAt: new Date(),
				authIdentities: [],
			});
			const { token, expiresInSeconds } = issueJWT(mockUser);

			expect(expiresInSeconds).toBe(testDuration * 60 * 60);
			const decodedToken = jwtService.verify(token);
			expect(decodedToken.exp).toBeDefined();
			expect(decodedToken.iat).toBeDefined();
			expect(decodedToken.exp! - decodedToken.iat!).toBe(testDuration * 60 * 60);
		});
	});
});

import { Container } from 'typedi';
import { mock } from 'jest-mock-extended';

import config from '@/config';
import { JwtService } from '@/services/jwt.service';
import { License } from '@/License';
import { Time } from '@/constants';
import { issueJWT } from '@/auth/jwt';

import { mockInstance } from '../../shared/mocking';

import type { User } from '@db/entities/User';

mockInstance(License);

describe('jwt.issueJWT', () => {
	const jwtService = Container.get(JwtService);

	describe('when not setting userManagement.jwtSessionDuration', () => {
		it('should default to expire in 7 days', () => {
			const defaultInSeconds = 7 * Time.days.toSeconds;
			const mockUser = mock<User>({ password: 'passwordHash' });
			const { token, expiresIn } = issueJWT(mockUser);

			expect(expiresIn).toBe(defaultInSeconds);
			const decodedToken = jwtService.verify(token);
			if (decodedToken.exp === undefined || decodedToken.iat === undefined) {
				fail('Expected exp and iat to be defined');
			}

			expect(decodedToken.exp - decodedToken.iat).toBe(defaultInSeconds);
		});
	});

	describe('when setting userManagement.jwtSessionDuration', () => {
		const oldDuration = config.get('userManagement.jwtSessionDurationHours');
		const testDurationHours = 1;
		const testDurationSeconds = testDurationHours * Time.hours.toSeconds;

		beforeEach(() => {
			mockInstance(License);
			config.set('userManagement.jwtSessionDurationHours', testDurationHours);
		});

		afterEach(() => {
			config.set('userManagement.jwtSessionDuration', oldDuration);
		});

		it('should apply it to tokens', () => {
			const mockUser = mock<User>({ password: 'passwordHash' });
			const { token, expiresIn } = issueJWT(mockUser);

			expect(expiresIn).toBe(testDurationSeconds);
			const decodedToken = jwtService.verify(token);
			if (decodedToken.exp === undefined || decodedToken.iat === undefined) {
				fail('Expected exp and iat to be defined on decodedToken');
			}
			expect(decodedToken.exp - decodedToken.iat).toBe(testDurationSeconds);
		});
	});
});

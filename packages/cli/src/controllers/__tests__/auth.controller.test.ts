import type { LoginRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import * as auth from '@/auth';
import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { EventService } from '@/events/event.service';
import { LdapService } from '@/ldap.ee/ldap.service.ee';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import { PostHogClient } from '@/posthog';
import { UserService } from '@/services/user.service';

import { AuthController } from '../auth.controller';

jest.mock('@/auth');

const mockedAuth = auth as jest.Mocked<typeof auth>;

describe('AuthController', () => {
	mockInstance(Logger);
	mockInstance(EventService);
	mockInstance(AuthService);
	mockInstance(MfaService);
	mockInstance(UserService);
	mockInstance(UserRepository);
	mockInstance(PostHogClient);
	mockInstance(License);
	const ldapService = mockInstance(LdapService);
	const controller = Container.get(AuthController);
	const userService = Container.get(UserService);
	const authService = Container.get(AuthService);
	const eventsService = Container.get(EventService);
	const postHog = Container.get(PostHogClient);

	describe('login', () => {
		it('should not validate email in "emailOrLdapLoginId" if LDAP is enabled', async () => {
			// Arrange

			const browserId = '1';

			const member = mock<User>({
				id: '123',
				role: { slug: 'global:member' },
				mfaEnabled: false,
			});

			const body = mock<LoginRequestDto>({
				emailOrLdapLoginId: 'non email',
				password: 'password',
			});

			const req = mock<AuthenticatedRequest>({
				user: member,
				body,
				browserId,
			});

			const res = mock<Response>();

			mockedAuth.handleEmailLogin.mockResolvedValue(member);

			ldapService.handleLdapLogin.mockResolvedValue(member);

			config.set('userManagement.authenticationMethod', 'ldap');

			// Act

			await controller.login(req, res, body);

			// Assert

			expect(mockedAuth.handleEmailLogin).toHaveBeenCalledWith(
				body.emailOrLdapLoginId,
				body.password,
			);

			expect(ldapService.handleLdapLogin).toHaveBeenCalledWith(
				body.emailOrLdapLoginId,
				body.password,
			);

			expect(authService.issueCookie).toHaveBeenCalledWith(res, member, false, browserId);
			expect(eventsService.emit).toHaveBeenCalledWith('user-logged-in', {
				user: member,
				authenticationMethod: 'ldap',
			});

			expect(userService.toPublic).toHaveBeenCalledWith(member, {
				mfaAuthenticated: false,
				posthog: postHog,
				withScopes: true,
			});
		});
	});
});

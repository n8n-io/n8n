import type { LoginRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import * as auth from '@/auth';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { EventService } from '@/events/event.service';
import { LdapService } from '@/modules/ldap.ee/ldap.service.ee';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import { PostHogClient } from '@/posthog';
import { UserService } from '@/services/user.service';

import { AuthController } from '../auth.controller';
import { AuthError } from '@/errors/response-errors/auth.error';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { AuthlessRequest } from '@/requests';
import * as ssoHelpers from '@/sso.ee/sso-helpers';
import { ResolveSignupTokenQueryDto } from '@n8n/api-types';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

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
	const authHandlerRegistry = mockInstance(AuthHandlerRegistry);
	const controller = Container.get(AuthController);
	const userService = Container.get(UserService);
	const authService = Container.get(AuthService);
	const eventsService = Container.get(EventService);
	const postHog = Container.get(PostHogClient);

	describe('login', () => {
		beforeEach(() => {
			jest.resetAllMocks();
			// Setup auth handler registry to return ldapService for 'ldap'
			authHandlerRegistry.get.mockImplementation((method: string) => {
				if (method === 'ldap') {
					return ldapService;
				}
				return undefined;
			});
		});

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

			ldapService.handleLogin.mockResolvedValue(member);

			config.set('userManagement.authenticationMethod', 'ldap');

			// Act

			await controller.login(req, res, body);

			// Assert

			expect(mockedAuth.handleEmailLogin).toHaveBeenCalledWith(
				body.emailOrLdapLoginId,
				body.password,
			);

			expect(ldapService.handleLogin).toHaveBeenCalledWith(body.emailOrLdapLoginId, body.password);

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

		it('should not allow members to login with email if "OIDC" is the authentication method', async () => {
			const member = mock<User>({
				id: '123',
				role: { slug: 'global:member' },
				mfaEnabled: false,
			});

			const body = mock<LoginRequestDto>({
				emailOrLdapLoginId: 'user@example.com',
				password: 'password',
			});

			const req = mock<AuthenticatedRequest>({
				user: member,
				body,
				browserId: '1',
			});

			const res = mock<Response>();

			mockedAuth.handleEmailLogin.mockResolvedValue(member);
			config.set('userManagement.authenticationMethod', 'oidc');

			// Act

			await expect(controller.login(req, res, body)).rejects.toThrowError(
				new AuthError('SSO is enabled, please log in with SSO'),
			);

			// Assert

			expect(mockedAuth.handleEmailLogin).toHaveBeenCalledWith(
				body.emailOrLdapLoginId,
				body.password,
			);
			expect(authService.issueCookie).not.toHaveBeenCalled();
		});

		it('should allow owners to login with email if "OIDC" is the authentication method', async () => {
			config.set('userManagement.authenticationMethod', 'oidc');

			const member = mock<User>({
				id: '123',
				role: { slug: 'global:owner' },
				mfaEnabled: false,
			});

			const body = mock<LoginRequestDto>({
				emailOrLdapLoginId: 'user@example.com',
				password: 'password',
			});

			const req = mock<AuthenticatedRequest>({
				user: member,
				body,
				browserId: '1',
			});

			const res = mock<Response>();

			mockedAuth.handleEmailLogin.mockResolvedValue(member); // Act

			await controller.login(req, res, body);

			// Assert

			expect(mockedAuth.handleEmailLogin).toHaveBeenCalledWith(
				body.emailOrLdapLoginId,
				body.password,
			);
			expect(authService.issueCookie).toHaveBeenCalledWith(res, member, false, '1');
		});
	});

	describe('resolveSignupToken', () => {
		const logger: Logger = mockInstance(Logger);
		const mfaService: MfaService = mockInstance(MfaService);
		const authService: AuthService = mockInstance(AuthService);
		const userService: UserService = mockInstance(UserService);
		const license: License = mockInstance(License);
		const userRepository: UserRepository = mockInstance(UserRepository);
		const postHog: PostHogClient = mockInstance(PostHogClient);
		const eventService: EventService = mockInstance(EventService);

		it('throws a BadRequestError if SSO is enabled', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(true);
			const id = uuidv4();

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			const payload = new ResolveSignupTokenQueryDto({
				inviterId: id,
				inviteeId: id,
			});

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			await expect(authController.resolveSignupToken(req, res, payload)).rejects.toThrow(
				new BadRequestError(
					'Invite links are not supported on this system, please use single sign on instead.',
				),
			);
		});

		it('throws a ForbiddenError if the users quota is reached', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			const id = uuidv4();

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			const payload = new ResolveSignupTokenQueryDto({
				inviterId: id,
				inviteeId: id,
			});

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId: id,
				inviteeId: id,
			});
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(false);

			await expect(authController.resolveSignupToken(req, res, payload)).rejects.toThrow(
				new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED),
			);
		});

		it('throws a BadRequestError if the users are not found', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			const id = uuidv4();

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			const payload = new ResolveSignupTokenQueryDto({
				inviterId: id,
				inviteeId: id,
			});

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId: id,
				inviteeId: id,
			});
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(userRepository, 'findManyByIds').mockResolvedValue([]);

			await expect(authController.resolveSignupToken(req, res, payload)).rejects.toThrow(
				new BadRequestError('Invalid invite URL'),
			);
		});

		it('throws a BadRequestError if the invitee already has a password', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			const id = uuidv4();

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			const payload = new ResolveSignupTokenQueryDto({
				inviterId: id,
				inviteeId: id,
			});

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId: id,
				inviteeId: id,
			});
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(userRepository, 'findManyByIds').mockResolvedValue([
				mock<User>({
					id,
					password: 'Password123!',
				}),
				mock<User>({
					id,
					password: null,
				}),
			]);

			await expect(authController.resolveSignupToken(req, res, payload)).rejects.toThrow(
				new BadRequestError('The invitation was likely either deleted or already claimed'),
			);
		});

		it('throws a BadRequestError if the inviter does not exist or is not set up', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			const id = uuidv4();

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			const payload = new ResolveSignupTokenQueryDto({
				inviterId: id,
				inviteeId: id,
			});

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId: id,
				inviteeId: id,
			});
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(userRepository, 'findManyByIds').mockResolvedValue([
				mock<User>({
					id,
					email: undefined,
					password: null,
				}),
				mock<User>({
					id,
					email: undefined,
					password: null,
				}),
			]);

			await expect(authController.resolveSignupToken(req, res, payload)).rejects.toThrow(
				new BadRequestError('Invalid request'),
			);
		});

		it('returns the inviter if the invitation is valid', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			const id = uuidv4();

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			const payload = new ResolveSignupTokenQueryDto({
				inviterId: id,
				inviteeId: id,
			});

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId: id,
				inviteeId: id,
			});
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(userRepository, 'findManyByIds').mockResolvedValue([
				mock<User>({
					id,
					email: 'inviter@example.com',
					firstName: 'Inviter first name',
					lastName: 'Inviter last name',
					password: null,
				}),
				mock<User>({
					id,
					email: 'invitee@example.com',
					firstName: 'Invitee first name',
					lastName: 'Invitee last name',
					password: null,
				}),
			]);

			await expect(authController.resolveSignupToken(req, res, payload)).resolves.toEqual({
				inviter: {
					firstName: 'Inviter first name',
					lastName: 'Inviter last name',
				},
			});
		});

		it('validates JWT token and returns inviter if token is valid', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			const inviterId = uuidv4();
			const inviteeId = uuidv4();
			const token = 'valid-jwt-token';

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			// Use type assertion to bypass zod-class validation for all-optional schemas
			// Validation is handled in the service layer
			const payload = { token } as ResolveSignupTokenQueryDto;

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId,
				inviteeId,
			});
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(userRepository, 'findManyByIds').mockResolvedValue([
				mock<User>({
					id: inviterId,
					email: 'inviter@example.com',
					firstName: 'Inviter first name',
					lastName: 'Inviter last name',
					password: null,
				}),
				mock<User>({
					id: inviteeId,
					email: 'invitee@example.com',
					firstName: 'Invitee first name',
					lastName: 'Invitee last name',
					password: null,
				}),
			]);

			await expect(authController.resolveSignupToken(req, res, payload)).resolves.toEqual({
				inviter: {
					firstName: 'Inviter first name',
					lastName: 'Inviter last name',
				},
			});

			expect(userService.getInvitationIdsFromPayload).toHaveBeenCalledWith(payload);
		});

		it('throws BadRequestError if JWT token is invalid', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			const token = 'invalid-jwt-token';

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			// Use type assertion to bypass zod-class validation for all-optional schemas
			// Validation is handled in the service layer
			const payload = { token } as ResolveSignupTokenQueryDto;

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest
				.spyOn(userService, 'getInvitationIdsFromPayload')
				.mockRejectedValue(new BadRequestError('Invalid invite URL'));

			await expect(authController.resolveSignupToken(req, res, payload)).rejects.toThrow(
				new BadRequestError('Invalid invite URL'),
			);
		});

		it('throws BadRequestError if JWT token payload is missing inviterId or inviteeId', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			const token = 'valid-jwt-token';

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			// Use type assertion to bypass zod-class validation for all-optional schemas
			// Validation is handled in the service layer
			const payload = { token } as ResolveSignupTokenQueryDto;

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest
				.spyOn(userService, 'getInvitationIdsFromPayload')
				.mockRejectedValue(new BadRequestError('Invalid invite URL'));

			await expect(authController.resolveSignupToken(req, res, payload)).rejects.toThrow(
				new BadRequestError('Invalid invite URL'),
			);
		});

		it('throws BadRequestError if neither token nor inviterId/inviteeId are provided', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

			const authController = new AuthController(
				logger,
				authService,
				mfaService,
				userService,
				license,
				userRepository,
				eventService,
				authHandlerRegistry,
				postHog,
			);

			// Create empty payload to test validation when neither token nor IDs are provided
			// Use type assertion to bypass zod-class validation for all-optional schemas
			// Validation is handled in the service layer
			const payload = {} as ResolveSignupTokenQueryDto;

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			jest
				.spyOn(userService, 'getInvitationIdsFromPayload')
				.mockRejectedValue(new BadRequestError('Invalid invite URL'));

			await expect(authController.resolveSignupToken(req, res, payload)).rejects.toThrow(
				new BadRequestError('Invalid invite URL'),
			);
		});
	});
});

import { EventService } from '@/events/event.service';
import { mockInstance } from '@n8n/backend-test-utils';
import { PostHogClient } from '@/posthog';
import { ExternalHooks } from '@/external-hooks';
import { AuthService } from '@/auth/auth.service';
import { UserService } from '@/services/user.service';
import { License } from '@/license';
import { PasswordUtility } from '@/services/password.utility';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import * as ssoHelpers from '@/sso.ee/sso-helpers';
import { InvitationController } from '../invitation.controller';
import { InviteUsersRequestDto } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE, GLOBAL_ADMIN_ROLE } from '@n8n/db';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import config from '@/config';

describe('InvitationController', () => {
	const logger: Logger = mockInstance(Logger);
	const externalHooks: ExternalHooks = mockInstance(ExternalHooks);
	const authService: AuthService = mockInstance(AuthService);
	const userService: UserService = mockInstance(UserService);
	const license: License = mockInstance(License);
	const passwordUtility: PasswordUtility = mockInstance(PasswordUtility);
	const userRepository: UserRepository = mockInstance(UserRepository);
	const postHog: PostHogClient = mockInstance(PostHogClient);
	const eventService: EventService = mockInstance(EventService);

	describe('inviteUser', () => {
		it('throws a BadRequestError if SSO is enabled', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(true);

			const invitationController = new InvitationController(
				logger,
				externalHooks,
				authService,
				userService,
				license,
				passwordUtility,
				userRepository,
				postHog,
				eventService,
			);

			const user = mock<User>({
				id: '123',
				email: 'valid@email.com',
				password: 'password',
				authIdentities: [],
				role: GLOBAL_OWNER_ROLE,
				mfaEnabled: false,
			});

			const payload = new InviteUsersRequestDto({
				email: 'valid@email.com',
				role: 'global:member',
			});

			const req = mock<AuthenticatedRequest>({ user });
			const res = mock<Response>();

			await expect(invitationController.inviteUser(req, res, payload)).rejects.toThrow(
				new BadRequestError(
					'SSO is enabled, so users are managed by the Identity Provider and cannot be added through invites',
				),
			);
		});

		it('throws a ForbiddenError if the user limit quota has been reached', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(false);

			const invitationController = new InvitationController(
				logger,
				externalHooks,
				authService,
				userService,
				license,
				passwordUtility,
				userRepository,
				postHog,
				eventService,
			);

			const user = mock<User>({
				id: '123',
				email: 'valid@email.com',
			});

			const payload = new InviteUsersRequestDto({
				email: 'valid@email.com',
				role: 'global:member',
			});

			const req = mock<AuthenticatedRequest>({ user });
			const res = mock<Response>();

			await expect(invitationController.inviteUser(req, res, payload)).rejects.toThrow(
				new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED),
			);
		});

		it('throws a BadRequestError if the owner account is not set up', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(config, 'getEnv').mockReturnValue(false);

			const invitationController = new InvitationController(
				logger,
				externalHooks,
				authService,
				userService,
				license,
				passwordUtility,
				userRepository,
				postHog,
				eventService,
			);

			const user = mock<User>({
				id: '123',
				email: 'valid@email.com',
			});

			const payload = new InviteUsersRequestDto({
				email: 'valid@email.com',
				role: 'global:member',
			});

			const req = mock<AuthenticatedRequest>({ user });
			const res = mock<Response>();

			await expect(invitationController.inviteUser(req, res, payload)).rejects.toThrow(
				new BadRequestError('You must set up your own account before inviting others'),
			);
		});

		it('throws a ForbiddenError if the user is an admin but advanced permissions is not licensed', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(config, 'getEnv').mockReturnValue(true);
			jest.spyOn(license, 'isAdvancedPermissionsLicensed').mockReturnValue(false);

			const invitationController = new InvitationController(
				logger,
				externalHooks,
				authService,
				userService,
				license,
				passwordUtility,
				userRepository,
				postHog,
				eventService,
			);

			const user = mock<User>({
				id: '123',
				email: 'valid@email.com',
				role: GLOBAL_ADMIN_ROLE,
			});

			const payload = new InviteUsersRequestDto(
				{
					email: 'valid@email.com',
					role: 'global:admin',
				},
				{
					email: 'valid@email.com',
					role: 'global:admin',
				},
			);

			const req = mock<AuthenticatedRequest>({ user });
			const res = mock<Response>();

			await expect(invitationController.inviteUser(req, res, payload)).rejects.toThrow(
				new ForbiddenError(
					'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
				),
			);
		});

		it('invites users successfully', async () => {
			const inviteUsersResult = {
				usersInvited: [
					{
						user: {
							id: '123',
							email: 'valid@email.com',
							emailSent: false,
							role: 'global:member',
							inviteAcceptUrl: 'https://n8n.io/signup?inviterId=123&inviteeId=123',
						},
						error: '',
					},
				],
				usersCreated: ['123'],
			};
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(config, 'getEnv').mockReturnValue(true);
			jest.spyOn(license, 'isAdvancedPermissionsLicensed').mockReturnValue(true);
			jest.spyOn(userService, 'inviteUsers').mockResolvedValue(inviteUsersResult);
			const invitationController = new InvitationController(
				logger,
				externalHooks,
				authService,
				userService,
				license,
				passwordUtility,
				userRepository,
				postHog,
				eventService,
			);

			const user = mock<User>({
				id: '123',
				email: 'valid@email.com',
				role: GLOBAL_MEMBER_ROLE,
			});

			const payload = new InviteUsersRequestDto({
				email: 'valid@email.com',
				role: 'global:member',
			});

			const req = mock<AuthenticatedRequest>({ user });
			const res = mock<Response>();

			expect(await invitationController.inviteUser(req, res, payload)).toEqual(
				inviteUsersResult.usersInvited,
			);

			expect(userService.inviteUsers).toHaveBeenCalledWith(user, [
				{
					email: 'valid@email.com',
					role: 'global:member',
				},
			]);

			expect(externalHooks.run).toHaveBeenCalledWith('user.invited', [
				inviteUsersResult.usersCreated,
			]);
		});
	});
});

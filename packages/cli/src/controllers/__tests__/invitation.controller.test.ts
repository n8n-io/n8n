import { Logger } from '@n8n/backend-common';
import * as ssoHelpers from '@/sso.ee/sso-helpers';
import { InvitationController } from '../invitation.controller';
import type { AcceptInvitationRequestDto } from '@n8n/api-types';
import { InviteUsersRequestDto } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE, GLOBAL_ADMIN_ROLE } from '@n8n/db';
import type { User, PublicUser, AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';

import config from '@/config';
import type { AuthlessRequest } from '@/requests';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '@/auth/auth.service';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { PostHogClient } from '@/posthog';
import { OwnershipService } from '@/services/ownership.service';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';

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
	const ownershipService: OwnershipService = mockInstance(OwnershipService);

	function defaultInvitationController() {
		return new InvitationController(
			logger,
			externalHooks,
			authService,
			userService,
			license,
			passwordUtility,
			userRepository,
			postHog,
			eventService,
			ownershipService,
		);
	}

	describe('inviteUser', () => {
		it('throws a BadRequestError if SSO is enabled', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(true);
			vi.mocked(ownershipService.hasInstanceOwner).mockReturnValue(Promise.resolve(true));

			const invitationController = defaultInvitationController();

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

			const promise = invitationController.inviteUser(req, res, payload);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow(
				'SSO is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
		});

		it('throws a ForbiddenError if the user limit quota has been reached', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			vi.mocked(license.isWithinUsersLimit).mockReturnValue(false);
			vi.mocked(ownershipService.hasInstanceOwner).mockReturnValue(Promise.resolve(true));

			const invitationController = defaultInvitationController();

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

			const promise = invitationController.inviteUser(req, res, payload);
			await expect(promise).rejects.toThrow(ForbiddenError);
			await expect(promise).rejects.toThrow(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		});

		it('throws a BadRequestError if the owner account is not set up', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			vi.mocked(license.isWithinUsersLimit).mockReturnValue(true);
			vi.spyOn(config, 'getEnv').mockReturnValue(false);
			vi.mocked(ownershipService.hasInstanceOwner).mockReturnValue(Promise.resolve(false));

			const invitationController = defaultInvitationController();

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

			const promise = invitationController.inviteUser(req, res, payload);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow(
				'You must set up your own account before inviting others',
			);
		});

		it('throws a ForbiddenError if the user is an admin but advanced permissions is not licensed', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			vi.mocked(license.isWithinUsersLimit).mockReturnValue(true);
			vi.spyOn(config, 'getEnv').mockReturnValue(true);
			vi.mocked(license.isAdvancedPermissionsLicensed).mockReturnValue(false);
			vi.mocked(ownershipService.hasInstanceOwner).mockReturnValue(Promise.resolve(true));

			const invitationController = defaultInvitationController();

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

			const promise = invitationController.inviteUser(req, res, payload);
			await expect(promise).rejects.toThrow(ForbiddenError);
			await expect(promise).rejects.toThrow(
				'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
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
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			vi.mocked(license.isWithinUsersLimit).mockReturnValue(true);
			vi.spyOn(config, 'getEnv').mockReturnValue(true);
			vi.mocked(license.isAdvancedPermissionsLicensed).mockReturnValue(true);
			vi.mocked(userService.inviteUsers).mockResolvedValue(inviteUsersResult);
			vi.mocked(ownershipService.hasInstanceOwner).mockReturnValue(Promise.resolve(true));

			const invitationController = defaultInvitationController();

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

	describe('acceptInvitationWithToken', () => {
		it('throws a BadRequestError if SSO is enabled', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(true);

			const invitationController = defaultInvitationController();

			const payload = {
				token: 'valid-jwt-token',
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			} as AcceptInvitationRequestDto;

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			const promise = invitationController.acceptInvitationWithToken(req, res, payload);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow(
				'Invite links are not supported on this system, please use single sign on instead.',
			);
		});

		it('throws a BadRequestError if token is missing', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

			const invitationController = defaultInvitationController();

			const payload = {
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			} as AcceptInvitationRequestDto;

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			const promise = invitationController.acceptInvitationWithToken(req, res, payload);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('Token is required');
		});

		it('accepts the invitation successfully with JWT token', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

			const token = 'valid-jwt-token';
			const inviterId = uuidv4();
			const inviteeId = uuidv4();
			const inviter = mock<User>({
				id: inviterId,
				email: 'valid@email.com',
				role: GLOBAL_OWNER_ROLE,
			});
			const invitee = mock<User>({
				id: inviteeId,
				email: 'valid@email.com',
				password: null,
				role: GLOBAL_MEMBER_ROLE,
			});

			vi.mocked(userService.getInvitationIdsFromPayload).mockResolvedValue({
				inviterId,
				inviteeId,
			});
			vi.mocked(userRepository.find).mockResolvedValue([inviter, invitee]);
			vi.mocked(passwordUtility.hash).mockResolvedValue('Password123!');
			vi.mocked(userRepository.save).mockResolvedValue(invitee);
			vi.mocked(authService.issueCookie).mockResolvedValue(invitee as never);
			vi.mocked(eventService.emit).mockResolvedValue(invitee as never);
			vi.mocked(userService.toPublic).mockResolvedValue(invitee as unknown as PublicUser);
			vi.mocked(externalHooks.run).mockResolvedValue(invitee as never);

			const invitationController = defaultInvitationController();

			const payload = {
				token,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			} as AcceptInvitationRequestDto;

			const req = mock<AuthlessRequest>({
				body: payload,
				browserId: 'browser-id',
			});
			const res = mock<Response>();

			expect(await invitationController.acceptInvitationWithToken(req, res, payload)).toEqual(
				invitee as unknown as PublicUser,
			);

			expect(userService.getInvitationIdsFromPayload).toHaveBeenCalledWith(token);
			expect(userRepository.find).toHaveBeenCalledWith({
				where: [{ id: inviterId }, { id: inviteeId }],
				relations: ['role'],
			});
			expect(passwordUtility.hash).toHaveBeenCalledWith('Password123!');
			expect(userRepository.save).toHaveBeenCalled();
			expect(authService.issueCookie).toHaveBeenCalledWith(res, invitee, false, 'browser-id');
			expect(eventService.emit).toHaveBeenCalledWith('user-signed-up', {
				user: invitee,
				userType: 'email',
				wasDisabledLdapUser: false,
			});
		});

		it('throws a BadRequestError if users are not found', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

			const token = 'valid-jwt-token';
			const inviterId = uuidv4();
			const inviteeId = uuidv4();

			vi.mocked(userService.getInvitationIdsFromPayload).mockResolvedValue({
				inviterId,
				inviteeId,
			});
			vi.mocked(userRepository.find).mockResolvedValue([]);

			const invitationController = defaultInvitationController();

			const payload = {
				token,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			} as AcceptInvitationRequestDto;

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			const promise = invitationController.acceptInvitationWithToken(req, res, payload);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('Invalid payload or URL');
		});

		it('throws a BadRequestError if invitee already has a password', async () => {
			vi.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

			const token = 'valid-jwt-token';
			const inviterId = uuidv4();
			const inviteeId = uuidv4();
			const inviter = mock<User>({
				id: inviterId,
				email: 'valid@email.com',
				role: GLOBAL_OWNER_ROLE,
			});
			const invitee = mock<User>({
				id: inviteeId,
				email: 'valid@email.com',
				password: 'Password123!',
				role: GLOBAL_MEMBER_ROLE,
			});

			vi.mocked(userService.getInvitationIdsFromPayload).mockResolvedValue({
				inviterId,
				inviteeId,
			});
			vi.mocked(userRepository.find).mockResolvedValue([inviter, invitee]);

			const invitationController = defaultInvitationController();

			const payload = {
				token,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			} as AcceptInvitationRequestDto;

			const req = mock<AuthlessRequest>({
				body: payload,
			});
			const res = mock<Response>();

			const promise = invitationController.acceptInvitationWithToken(req, res, payload);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('This invite has been accepted already');
		});
	});
});

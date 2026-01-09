import { EventService } from '@/events/event.service';
import { mockInstance } from '@n8n/backend-test-utils';
import { PostHogClient } from '@/posthog';
import { ExternalHooks } from '@/external-hooks';
import { AuthService } from '@/auth/auth.service';
import { UserService } from '@/services/user.service';
import { License } from '@/license';
import { PasswordUtility } from '@/services/password.utility';
import type { User, PublicUser } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import * as ssoHelpers from '@/sso.ee/sso-helpers';
import { InvitationController } from '../invitation.controller';
import { AcceptInvitationRequestDto, InviteUsersRequestDto } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE, GLOBAL_ADMIN_ROLE } from '@n8n/db';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import config from '@/config';
import type { AuthlessRequest } from '@/requests';
import { v4 as uuidv4 } from 'uuid';
import { OwnershipService } from '@/services/ownership.service';

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
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(true);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

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

			await expect(invitationController.inviteUser(req, res, payload)).rejects.toThrow(
				new BadRequestError(
					'SSO is enabled, so users are managed by the Identity Provider and cannot be added through invites',
				),
			);
		});

		it('throws a ForbiddenError if the user limit quota has been reached', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(false);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

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

			await expect(invitationController.inviteUser(req, res, payload)).rejects.toThrow(
				new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED),
			);
		});

		it('throws a BadRequestError if the owner account is not set up', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(config, 'getEnv').mockReturnValue(false);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(false));

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

			await expect(invitationController.inviteUser(req, res, payload)).rejects.toThrow(
				new BadRequestError('You must set up your own account before inviting others'),
			);
		});

		it('throws a ForbiddenError if the user is an admin but advanced permissions is not licensed', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(license, 'isWithinUsersLimit').mockReturnValue(true);
			jest.spyOn(config, 'getEnv').mockReturnValue(true);
			jest.spyOn(license, 'isAdvancedPermissionsLicensed').mockReturnValue(false);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

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
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

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

	describe('acceptInvitation', () => {
		it('throws a BadRequestError if SSO is enabled', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(true);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

			const inviterId = uuidv4();
			const inviteeId = uuidv4();

			const invitationController = defaultInvitationController();

			const payload = new AcceptInvitationRequestDto({
				inviterId,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			});

			const req = mock<AuthlessRequest<{ id: string }>>({
				body: payload,
				params: { id: inviteeId },
			});
			const res = mock<Response>();

			await expect(
				invitationController.acceptInvitation(req, res, payload, inviteeId),
			).rejects.toThrow(
				new BadRequestError(
					'Invite links are not supported on this system, please use single sign on instead.',
				),
			);
		});

		it('throws a BadRequestError if the inviter ID and invitee ID are not found in the database', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

			const inviterId = uuidv4();
			const inviteeId = uuidv4();

			const invitationController = defaultInvitationController();

			const payload = new AcceptInvitationRequestDto({
				inviterId,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			});

			const req = mock<AuthlessRequest<{ id: string }>>({
				body: payload,
				params: { id: inviteeId },
			});
			const res = mock<Response>();

			jest.spyOn(userRepository, 'find').mockResolvedValue([]);

			await expect(
				invitationController.acceptInvitation(req, res, payload, inviteeId),
			).rejects.toThrow(new BadRequestError('Invalid payload or URL'));

			expect(userRepository.find).toHaveBeenCalledWith({
				where: [{ id: inviterId }, { id: inviteeId }],
				relations: ['role'],
			});
		});

		it('throws a BadRequestError if the invitee already has a password', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

			const inviteeId = uuidv4();
			const invitee = mock<User>({
				id: inviteeId,
				email: 'valid@email.com',
				password: 'Password123!',
				role: GLOBAL_MEMBER_ROLE,
			});
			const inviterId = uuidv4();
			const inviter = mock<User>({
				id: inviterId,
				email: 'valid@email.com',
				role: GLOBAL_OWNER_ROLE,
			});

			jest.spyOn(userRepository, 'find').mockResolvedValue([inviter, invitee]);

			const invitationController = defaultInvitationController();

			const payload = new AcceptInvitationRequestDto({
				inviterId,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			});

			const req = mock<AuthlessRequest<{ id: string }>>({
				body: payload,
				params: { id: inviteeId },
			});

			const res = mock<Response>();

			await expect(
				invitationController.acceptInvitation(req, res, payload, inviteeId),
			).rejects.toThrow(new BadRequestError('This invite has been accepted already'));
		});

		it('accepts the invitation successfully', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

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

			jest.spyOn(userRepository, 'find').mockResolvedValue([inviter, invitee]);
			jest.spyOn(passwordUtility, 'hash').mockResolvedValue('Password123!');
			jest.spyOn(userRepository, 'save').mockResolvedValue(invitee);
			jest.spyOn(authService, 'issueCookie').mockResolvedValue(invitee as never);
			jest.spyOn(eventService, 'emit').mockResolvedValue(invitee as never);
			jest.spyOn(userService, 'toPublic').mockResolvedValue(invitee as unknown as PublicUser);
			jest.spyOn(externalHooks, 'run').mockResolvedValue(invitee as never);

			const invitationController = defaultInvitationController();

			const payload = new AcceptInvitationRequestDto({
				inviterId,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			});

			const req = mock<AuthlessRequest<{ id: string }>>({
				body: payload,
				params: { id: inviteeId },
			});
			const res = mock<Response>();

			expect(await invitationController.acceptInvitation(req, res, payload, inviteeId)).toEqual(
				invitee as unknown as PublicUser,
			);
		});

		it('accepts the invitation successfully with legacy inviterId and inviteeId from URL', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

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

			jest.spyOn(userRepository, 'find').mockResolvedValue([inviter, invitee]);
			jest.spyOn(passwordUtility, 'hash').mockResolvedValue('Password123!');
			jest.spyOn(userRepository, 'save').mockResolvedValue(invitee);
			jest.spyOn(authService, 'issueCookie').mockResolvedValue(invitee as never);
			jest.spyOn(eventService, 'emit').mockResolvedValue(invitee as never);
			jest.spyOn(userService, 'toPublic').mockResolvedValue(invitee as unknown as PublicUser);
			jest.spyOn(externalHooks, 'run').mockResolvedValue(invitee as never);

			const invitationController = defaultInvitationController();

			const payload = new AcceptInvitationRequestDto({
				inviterId,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			});

			const req = mock<AuthlessRequest<{ id: string }>>({
				body: payload,
				params: { id: inviteeId },
			});
			const res = mock<Response>();

			expect(await invitationController.acceptInvitation(req, res, payload, inviteeId)).toEqual(
				invitee as unknown as PublicUser,
			);
		});

		it('throws a BadRequestError if inviterId or inviteeId is missing in legacy format', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);
			jest.spyOn(ownershipService, 'hasInstanceOwner').mockReturnValue(Promise.resolve(true));

			const invitationController = defaultInvitationController();

			const payload = {
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			} as AcceptInvitationRequestDto;

			const req = mock<AuthlessRequest<{ id: string }>>({
				body: payload,
				params: { id: uuidv4() },
			});
			const res = mock<Response>();

			await expect(
				invitationController.acceptInvitation(req, res, payload, req.params.id),
			).rejects.toThrow(new BadRequestError('InviterId and inviteeId are required'));
		});
	});

	describe('acceptInvitationWithToken', () => {
		it('throws a BadRequestError if SSO is enabled', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(true);

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

			await expect(
				invitationController.acceptInvitationWithToken(req, res, payload),
			).rejects.toThrow(
				new BadRequestError(
					'Invite links are not supported on this system, please use single sign on instead.',
				),
			);
		});

		it('throws a BadRequestError if token is missing', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

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

			await expect(
				invitationController.acceptInvitationWithToken(req, res, payload),
			).rejects.toThrow(new BadRequestError('Token is required'));
		});

		it('accepts the invitation successfully with JWT token', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

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

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId,
				inviteeId,
			});
			jest.spyOn(userRepository, 'find').mockResolvedValue([inviter, invitee]);
			jest.spyOn(passwordUtility, 'hash').mockResolvedValue('Password123!');
			jest.spyOn(userRepository, 'save').mockResolvedValue(invitee);
			jest.spyOn(authService, 'issueCookie').mockResolvedValue(invitee as never);
			jest.spyOn(eventService, 'emit').mockResolvedValue(invitee as never);
			jest.spyOn(userService, 'toPublic').mockResolvedValue(invitee as unknown as PublicUser);
			jest.spyOn(externalHooks, 'run').mockResolvedValue(invitee as never);

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

			expect(userService.getInvitationIdsFromPayload).toHaveBeenCalledWith({
				token,
			});
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
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

			const token = 'valid-jwt-token';
			const inviterId = uuidv4();
			const inviteeId = uuidv4();

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId,
				inviteeId,
			});
			jest.spyOn(userRepository, 'find').mockResolvedValue([]);

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

			await expect(
				invitationController.acceptInvitationWithToken(req, res, payload),
			).rejects.toThrow(new BadRequestError('Invalid payload or URL'));
		});

		it('throws a BadRequestError if invitee already has a password', async () => {
			jest.spyOn(ssoHelpers, 'isSsoCurrentAuthenticationMethod').mockReturnValue(false);

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

			jest.spyOn(userService, 'getInvitationIdsFromPayload').mockResolvedValue({
				inviterId,
				inviteeId,
			});
			jest.spyOn(userRepository, 'find').mockResolvedValue([inviter, invitee]);

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

			await expect(
				invitationController.acceptInvitationWithToken(req, res, payload),
			).rejects.toThrow(new BadRequestError('This invite has been accepted already'));
		});
	});
});

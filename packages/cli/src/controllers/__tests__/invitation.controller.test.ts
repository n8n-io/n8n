import type { AcceptInvitationRequestDto } from '@n8n/api-types';
import { InviteUsersRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { UserRepository, GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import type { User, PublicUser, AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { PostHogClient } from '@/posthog';
import type { AuthlessRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import * as ssoHelpers from '@/sso.ee/sso-helpers';

import { InvitationController } from '../invitation.controller';

describe('InvitationController', () => {
	const logger: Logger = mockInstance(Logger);
	const externalHooks: ExternalHooks = mockInstance(ExternalHooks);
	const authService: AuthService = mockInstance(AuthService);
	const userService: UserService = mockInstance(UserService);
	const passwordUtility: PasswordUtility = mockInstance(PasswordUtility);
	const userRepository: UserRepository = mockInstance(UserRepository);
	const postHog: PostHogClient = mockInstance(PostHogClient);
	const eventService: EventService = mockInstance(EventService);

	function defaultInvitationController() {
		return new InvitationController(
			logger,
			externalHooks,
			authService,
			userService,
			passwordUtility,
			userRepository,
			postHog,
			eventService,
		);
	}

	describe('inviteUser', () => {
		it('delegates to userService.inviteUser with the authenticated user and payload', async () => {
			const usersInvited = [{ user: { id: '123', email: 'valid@email.com' }, error: '' }];
			vi.mocked(userService.inviteUser).mockResolvedValue(usersInvited as never);

			const invitationController = defaultInvitationController();
			const user = mock<User>({ id: '123', email: 'valid@email.com' });
			const payload = new InviteUsersRequestDto({
				email: 'valid@email.com',
				role: 'global:member',
			});
			const req = mock<AuthenticatedRequest>({ user });
			const res = mock<Response>();

			expect(await invitationController.inviteUser(req, res, payload)).toEqual(usersInvited);
			expect(userService.inviteUser).toHaveBeenCalledWith(user, payload);
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

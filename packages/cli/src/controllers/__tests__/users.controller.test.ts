import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { UserRequest } from '@/requests';

import { UsersController } from '../users.controller';

describe('UsersController', () => {
	const eventService = mock<EventService>();
	const userRepository = mock<UserRepository>();
	const projectService = mock<ProjectService>();
	const jwtService = mock<JwtService>();
	const urlService = mock<UrlService>();

	const controller = new UsersController(
		mock(),
		mock(),
		mock(),
		mock(),
		userRepository,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		projectService,
		eventService,
		mock(),
		jwtService,
		urlService,
	);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('changeGlobalRole', () => {
		it('should emit event user-changed-role', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123' },
			});
			userRepository.findOne.mockResolvedValue(mock<User>({ id: '456' }));
			projectService.getUserOwnedOrAdminProjects.mockResolvedValue([]);

			await controller.changeGlobalRole(
				request,
				mock(),
				mock({ newRoleName: 'global:member' }),
				'456',
			);

			expect(eventService.emit).toHaveBeenCalledWith('user-changed-role', {
				userId: '123',
				targetUserId: '456',
				targetUserNewRole: 'global:member',
				publicApi: false,
			});
		});
	});

	describe('generateInviteLink', () => {
		const inviterId = 'inviter-123';
		const inviteeId = 'invitee-456';

		const request = () =>
			mock<UserRequest.PasswordResetLink>({
				user: { id: inviterId },
				params: { id: inviteeId },
			});

		it('signs a link carrying the caller as inviter', async () => {
			userRepository.findOne.mockResolvedValue(mock<User>({ id: inviteeId, isPending: true }));
			jwtService.sign.mockReturnValue('jwt-token-123');
			urlService.getInstanceBaseUrl.mockReturnValue('https://example.com');

			const result = await controller.generateInviteLink(request());

			expect(jwtService.sign).toHaveBeenCalledWith({ inviterId, inviteeId }, { expiresIn: '90d' });
			expect(result).toEqual({ link: 'https://example.com/signup?token=jwt-token-123' });
		});

		test.each([
			[
				'the user does not exist',
				null,
				NotFoundError,
				'User to generate invite link for not found',
			],
			[
				'the user already accepted',
				mock<User>({ id: inviteeId, isPending: false }),
				BadRequestError,
				'User has already accepted an invitation',
			],
		])('refuses to sign when %s', async (_name, found, error, message) => {
			userRepository.findOne.mockResolvedValue(found);

			await expect(controller.generateInviteLink(request())).rejects.toThrow(new error(message));
			expect(jwtService.sign).not.toHaveBeenCalled();
		});
	});
});

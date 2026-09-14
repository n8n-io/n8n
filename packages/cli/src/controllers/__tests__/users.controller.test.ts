import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { UserRequest } from '@/requests';
import type { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';
import type { UserService } from '@/services/user.service';

import { UsersController } from '../users.controller';

describe('UsersController', () => {
	const userRepository = mock<UserRepository>();
	const userService = mock<UserService>();
	const jwtService = mock<JwtService>();
	const urlService = mock<UrlService>();

	const controller = new UsersController(
		userRepository,
		mock(),
		userService,
		jwtService,
		urlService,
	);

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	describe('changeGlobalRole', () => {
		it('delegates to userService.changeGlobalRole', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123' },
			});
			const payload = mock({ newRoleName: 'global:member' });
			userService.changeGlobalRole.mockResolvedValue({ success: true });

			await expect(controller.changeGlobalRole(request, mock(), payload, '456')).resolves.toEqual({
				success: true,
			});

			expect(userService.changeGlobalRole).toHaveBeenCalledWith(request.user, '456', payload);
		});
	});

	describe('deleteUser', () => {
		it('delegates to userService.deleteUser', async () => {
			const request = mock<UserRequest.Delete>({
				user: { id: '123' },
				params: { id: '456' },
				query: { transferId: 'project-1' },
			});
			userService.deleteUser.mockResolvedValue({ success: true });

			await expect(controller.deleteUser(request)).resolves.toEqual({ success: true });
			expect(userService.deleteUser).toHaveBeenCalledWith(request.user, '456', 'project-1');
		});
	});

	describe('generateInviteLink', () => {
		it('should generate invite link with JWT token', async () => {
			const inviterId = 'inviter-123';
			const inviteeId = 'invitee-456';
			const mockToken = 'jwt-token-123';
			const baseUrl = 'https://example.com';

			const request = mock<AuthenticatedRequest<{ id: string }, {}, {}, {}>>({
				user: { id: inviterId },
				params: { id: inviteeId },
			});

			const targetUser = mock<User>({
				id: inviteeId,
			});

			userRepository.findOne.mockResolvedValue(targetUser);
			jwtService.sign.mockReturnValue(mockToken);
			urlService.getInstanceBaseUrl.mockReturnValue(baseUrl);

			const result = await controller.generateInviteLink(request, mock<Response>());

			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { id: inviteeId },
			});
			expect(jwtService.sign).toHaveBeenCalledWith(
				{
					inviterId,
					inviteeId,
				},
				{
					expiresIn: '90d',
				},
			);
			expect(urlService.getInstanceBaseUrl).toHaveBeenCalled();
			expect(result).toEqual({
				link: `${baseUrl}/signup?token=${mockToken}`,
			});
		});

		it('should throw NotFoundError when target user does not exist', async () => {
			const inviterId = 'inviter-123';
			const inviteeId = 'invitee-456';

			const request = mock<AuthenticatedRequest<{ id: string }, {}, {}, {}>>({
				user: { id: inviterId },
				params: { id: inviteeId },
			});

			userRepository.findOne.mockResolvedValue(null);

			await expect(controller.generateInviteLink(request, mock<Response>())).rejects.toThrow(
				NotFoundError,
			);
			await expect(controller.generateInviteLink(request, mock<Response>())).rejects.toThrow(
				'User to generate invite link for not found',
			);

			expect(userRepository.findOne).toHaveBeenCalledTimes(2);
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { id: inviteeId },
			});
			expect(jwtService.sign).not.toHaveBeenCalled();
			expect(urlService.getInstanceBaseUrl).not.toHaveBeenCalled();
		});

		it('should use correct inviterId from authenticated user', async () => {
			const inviterId = 'different-inviter-789';
			const inviteeId = 'invitee-456';
			const mockToken = 'jwt-token-456';
			const baseUrl = 'https://test.example.com';

			const request = mock<AuthenticatedRequest<{ id: string }, {}, {}, {}>>({
				user: { id: inviterId },
				params: { id: inviteeId },
			});

			userRepository.findOne.mockResolvedValue(mock<User>({ id: inviteeId }));
			jwtService.sign.mockReturnValue(mockToken);
			urlService.getInstanceBaseUrl.mockReturnValue(baseUrl);

			await controller.generateInviteLink(request, mock<Response>());

			expect(jwtService.sign).toHaveBeenCalledWith(
				{
					inviterId,
					inviteeId,
				},
				{
					expiresIn: '90d',
				},
			);
		});
	});
});

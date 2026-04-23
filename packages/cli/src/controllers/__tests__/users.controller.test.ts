import type { UsersListFilterDto } from '@n8n/api-types';
import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import type { EventService } from '@/events/event.service';
import type { JwtService } from '@/services/jwt.service';
import type { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import type { ProjectService } from '@/services/project.service.ee';
import type { UrlService } from '@/services/url.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { UsersController } from '../users.controller';

describe('UsersController', () => {
	const eventService = mock<EventService>();
	const userRepository = mock<UserRepository>();
	const jwtService = mock<JwtService>();
	const urlService = mock<UrlService>();
	const provisioningService = mock<ProvisioningService>();
	const projectService = mock<ProjectService>();

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
		eventService,
		mock(),
		jwtService,
		urlService,
		projectService,
		provisioningService,
	);

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	describe('changeGlobalRole', () => {
		it('should emit event user-changed-role', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123' },
			});
			userRepository.findOne.mockResolvedValue(mock<User>({ id: '456' }));
			provisioningService.isInstanceRoleManaged.mockResolvedValue(false);

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

	describe('listUsers', () => {
		const mockQueryBuilder = () => mock({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });

		it('should allow global:owner to list users without checking project scopes', async () => {
			userRepository.buildUserQuery.mockReturnValue(mockQueryBuilder() as never);
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ role: { slug: 'global:owner', scopes: [] } }),
			});

			await expect(
				controller.listUsers(
					req,
					mock<Response>(),
					mock<UsersListFilterDto>({ filter: undefined, select: undefined }),
				),
			).resolves.toBeDefined();

			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});

		it('should allow user with project:update scope to list all users without projectId filter', async () => {
			userRepository.buildUserQuery.mockReturnValue(mockQueryBuilder() as never);
			projectService.getProjectIdsWithScope.mockResolvedValue(['project-1']);
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ role: { slug: 'global:member', scopes: [] } }),
			});

			await expect(
				controller.listUsers(
					req,
					mock<Response>(),
					mock<UsersListFilterDto>({ filter: undefined, select: undefined }),
				),
			).resolves.toBeDefined();

			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(req.user, [
				'project:update',
			]);
		});

		it('should throw ForbiddenError when member has no project:update scope and no projectId filter', async () => {
			projectService.getProjectIdsWithScope.mockResolvedValue([]);
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ role: { slug: 'global:member' } }),
			});

			await expect(
				controller.listUsers(
					req,
					mock<Response>(),
					mock<UsersListFilterDto>({ filter: undefined }),
				),
			).rejects.toThrow(ForbiddenError);

			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(req.user, [
				'project:update',
			]);
		});

		it('should throw NotFoundError when filtering by an unknown projectId', async () => {
			projectService.getProjectWithScope.mockResolvedValue(null);
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ role: { slug: 'global:member' } }),
			});

			await expect(
				controller.listUsers(
					req,
					mock<Response>(),
					mock<UsersListFilterDto>({ filter: { projectId: 'unknown-project-id' } }),
				),
			).rejects.toThrow(NotFoundError);
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

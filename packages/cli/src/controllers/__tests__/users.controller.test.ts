import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { UserService } from '@/services/user.service';
import type {
	BulkInviteUsersRequestDto,
	BulkUpdateRolesRequestDto,
	BulkStatusUpdateRequestDto,
	BulkDeleteUsersRequestDto,
	BulkOperationResponseDto,
} from '@n8n/api-types';

import { UsersController } from '../users.controller';

describe('UsersController', () => {
	const eventService = mock<EventService>();
	const userRepository = mock<UserRepository>();
	const projectService = mock<ProjectService>();
	const userService = mock<UserService>();
	const controller = new UsersController(
		mock(),
		mock(),
		mock(),
		mock(),
		userRepository,
		mock(),
		userService,
		mock(),
		mock(),
		mock(),
		projectService,
		eventService,
		mock(),
	);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('changeGlobalRole', () => {
		it('should emit event user-changed-role', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123' },
			});
			userRepository.findOneBy.mockResolvedValue(mock<User>({ id: '456' }));
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

	describe('bulkInviteUsers', () => {
		it('should handle bulk user invitations successfully', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123', role: 'global:owner' },
			});
			const payload: BulkInviteUsersRequestDto = {
				invitations: [
					{ email: 'user1@example.com', role: 'global:member' },
					{ email: 'user2@example.com', role: 'global:admin' },
				],
			};
			const mockResponse: BulkOperationResponseDto = {
				success: [
					{ userId: 'user1-id', message: 'User user1@example.com invited successfully' },
					{ userId: 'user2-id', message: 'User user2@example.com invited successfully' },
				],
				errors: [],
				totalProcessed: 2,
			};

			userService.bulkInviteUsers.mockResolvedValue(mockResponse);

			const result = await controller.bulkInviteUsers(request, mock(), payload);

			expect(userService.bulkInviteUsers).toHaveBeenCalledWith(request.user, payload);
			expect(result).toEqual(mockResponse);
		});

		it('should handle partial failures in bulk invitations', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123', role: 'global:owner' },
			});
			const payload: BulkInviteUsersRequestDto = {
				invitations: [
					{ email: 'user1@example.com', role: 'global:member' },
					{ email: 'invalid-email', role: 'global:member' },
				],
			};
			const mockResponse: BulkOperationResponseDto = {
				success: [{ userId: 'user1-id', message: 'User user1@example.com invited successfully' }],
				errors: [{ email: 'invalid-email', error: 'Invalid email format' }],
				totalProcessed: 2,
			};

			userService.bulkInviteUsers.mockResolvedValue(mockResponse);

			const result = await controller.bulkInviteUsers(request, mock(), payload);

			expect(result).toEqual(mockResponse);
		});
	});

	describe('bulkUpdateRoles', () => {
		it('should handle bulk role updates successfully', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123', role: 'global:owner' },
			});
			const payload: BulkUpdateRolesRequestDto = {
				userRoleUpdates: [
					{ userId: 'user1-id', newRole: 'global:admin' },
					{ userId: 'user2-id', newRole: 'global:member' },
				],
			};
			const mockResponse: BulkOperationResponseDto = {
				success: [
					{ userId: 'user1-id', message: 'Role updated to global:admin' },
					{ userId: 'user2-id', message: 'Role updated to global:member' },
				],
				errors: [],
				totalProcessed: 2,
			};

			userService.bulkUpdateRoles.mockResolvedValue(mockResponse);

			const result = await controller.bulkUpdateRoles(request, mock(), payload);

			expect(userService.bulkUpdateRoles).toHaveBeenCalledWith(request.user, payload);
			expect(result).toEqual(mockResponse);
		});
	});

	describe('bulkUpdateStatus', () => {
		it('should handle bulk status updates successfully', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123', role: 'global:owner' },
			});
			const payload: BulkStatusUpdateRequestDto = {
				userIds: ['user1-id', 'user2-id'],
				disabled: true,
			};
			const mockResponse: BulkOperationResponseDto = {
				success: [
					{ userId: 'user1-id', message: 'User disabled successfully' },
					{ userId: 'user2-id', message: 'User disabled successfully' },
				],
				errors: [],
				totalProcessed: 2,
			};

			userService.bulkUpdateStatus.mockResolvedValue(mockResponse);

			const result = await controller.bulkUpdateStatus(request, mock(), payload);

			expect(userService.bulkUpdateStatus).toHaveBeenCalledWith(request.user, payload);
			expect(result).toEqual(mockResponse);
		});
	});

	describe('bulkDeleteUsers', () => {
		it('should handle bulk user deletions successfully', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123', role: 'global:owner' },
			});
			const payload: BulkDeleteUsersRequestDto = {
				userIds: ['user1-id', 'user2-id'],
				transferToUserId: 'transfer-user-id',
			};
			const mockResponse: BulkOperationResponseDto = {
				success: [
					{ userId: 'user1-id', message: 'User deletion scheduled for processing' },
					{ userId: 'user2-id', message: 'User deletion scheduled for processing' },
				],
				errors: [],
				totalProcessed: 2,
			};

			userService.bulkDeleteUsers.mockResolvedValue(mockResponse);

			const result = await controller.bulkDeleteUsers(request, mock(), payload);

			expect(userService.bulkDeleteUsers).toHaveBeenCalledWith(request.user, payload);
			expect(result).toEqual(mockResponse);
		});

		it('should handle errors during bulk deletion', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123', role: 'global:owner' },
			});
			const payload: BulkDeleteUsersRequestDto = {
				userIds: ['user1-id', 'owner-id'],
			};
			const mockResponse: BulkOperationResponseDto = {
				success: [{ userId: 'user1-id', message: 'User deletion scheduled for processing' }],
				errors: [{ userId: 'owner-id', error: 'Cannot delete global owner' }],
				totalProcessed: 2,
			};

			userService.bulkDeleteUsers.mockResolvedValue(mockResponse);

			const result = await controller.bulkDeleteUsers(request, mock(), payload);

			expect(result).toEqual(mockResponse);
		});
	});
});

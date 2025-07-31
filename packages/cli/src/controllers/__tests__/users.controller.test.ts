import type {
	BulkInviteUsersRequestDto,
	BulkUpdateRolesRequestDto,
	BulkStatusUpdateRequestDto,
	BulkDeleteUsersRequestDto,
	BulkOperationResponseDto,
	UserAnalyticsQueryDto,
	UserMetricsResponseDto,
	SystemUserAnalyticsResponseDto,
	UserEngagementAnalyticsDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { UserAnalyticsService } from '@/services/user-analytics.service';
import type { UserService } from '@/services/user.service';

import { UsersController } from '../users.controller';

describe('UsersController', () => {
	const eventService = mock<EventService>();
	const userRepository = mock<UserRepository>();
	const projectService = mock<ProjectService>();
	const userService = mock<UserService>();
	const userAnalyticsService = mock<UserAnalyticsService>();
	const controller = new UsersController(
		mock(),
		mock(),
		mock(),
		mock(),
		userRepository,
		mock(),
		userService,
		userAnalyticsService,
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

	describe('getUserAnalytics', () => {
		it('should return user analytics for own user', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: 'user-123', role: 'global:member' },
			});
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};
			const mockAnalytics: UserMetricsResponseDto = {
				userId: 'user-123',
				totalLogins: 10,
				totalWorkflowsCreated: 5,
				totalWorkflowExecutions: 25,
				totalCredentialsCreated: 3,
				lastLoginAt: '2024-01-15T10:00:00.000Z',
				lastActiveAt: '2024-01-15T10:00:00.000Z',
				avgSessionDuration: 45,
				mostActiveTimeOfDay: 14,
				mostActiveDayOfWeek: 2,
			};

			userAnalyticsService.getUserMetrics.mockResolvedValue(mockAnalytics);

			const result = await controller.getUserAnalytics(request, mock(), 'user-123', query);

			expect(userAnalyticsService.getUserMetrics).toHaveBeenCalledWith('user-123', query);
			expect(result).toEqual(mockAnalytics);
		});

		it('should allow admin to access other user analytics', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};
			const mockAnalytics: UserMetricsResponseDto = {
				userId: 'user-456',
				totalLogins: 15,
				totalWorkflowsCreated: 8,
				totalWorkflowExecutions: 40,
				totalCredentialsCreated: 5,
				lastLoginAt: '2024-01-15T10:00:00.000Z',
				lastActiveAt: '2024-01-15T10:00:00.000Z',
				avgSessionDuration: 60,
				mostActiveTimeOfDay: 9,
				mostActiveDayOfWeek: 1,
			};

			userAnalyticsService.getUserMetrics.mockResolvedValue(mockAnalytics);

			const result = await controller.getUserAnalytics(request, mock(), 'user-456', query);

			expect(result).toEqual(mockAnalytics);
		});

		it('should deny access to other user analytics for non-admin', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: 'user-123', role: 'global:member' },
			});
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};

			await expect(controller.getUserAnalytics(request, mock(), 'user-456', query)).rejects.toThrow(
				ForbiddenError,
			);
		});
	});

	describe('getSystemUserAnalytics', () => {
		it('should return system analytics for admin', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};
			const mockSystemAnalytics: SystemUserAnalyticsResponseDto = {
				totalUsers: 100,
				activeUsers: { today: 15, thisWeek: 45, thisMonth: 80 },
				newUsers: { today: 2, thisWeek: 8, thisMonth: 12 },
				userActivity: [],
				topUsers: [],
			};

			userAnalyticsService.getSystemUserAnalytics.mockResolvedValue(mockSystemAnalytics);

			const result = await controller.getSystemUserAnalytics(request, mock(), query);

			expect(userAnalyticsService.getSystemUserAnalytics).toHaveBeenCalledWith(query);
			expect(result).toEqual(mockSystemAnalytics);
		});

		it('should deny access to system analytics for non-admin', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: 'user-123', role: 'global:member' },
			});
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};

			await expect(controller.getSystemUserAnalytics(request, mock(), query)).rejects.toThrow(
				ForbiddenError,
			);
		});
	});

	describe('getUserEngagement', () => {
		it('should return engagement analytics for own user', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: 'user-123', role: 'global:member' },
			});
			const mockEngagement: UserEngagementAnalyticsDto = {
				userId: 'user-123',
				engagementScore: 85,
				featureUsage: { workflows: 10, credentials: 5 },
				workflowComplexity: {
					averageNodes: 5,
					mostUsedNodes: ['HTTP Request', 'Set'],
					executionSuccessRate: 0.95,
				},
				collaborationMetrics: {
					sharedWorkflows: 3,
					sharedCredentials: 2,
					projectMembership: 2,
				},
				retentionMetrics: {
					daysSinceFirstLogin: 30,
					daysSinceLastLogin: 1,
					longestInactivePeriod: 5,
					averageSessionsPerWeek: 4.5,
				},
			};

			userAnalyticsService.getUserEngagementAnalytics.mockResolvedValue(mockEngagement);

			const result = await controller.getUserEngagement(request, mock(), 'user-123');

			expect(userAnalyticsService.getUserEngagementAnalytics).toHaveBeenCalledWith('user-123');
			expect(result).toEqual(mockEngagement);
		});

		it('should allow owner to access other user engagement', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: 'owner-123', role: 'global:owner' },
			});
			const mockEngagement: UserEngagementAnalyticsDto = {
				userId: 'user-456',
				engagementScore: 70,
				featureUsage: { workflows: 5, credentials: 2 },
				workflowComplexity: {
					averageNodes: 3,
					mostUsedNodes: ['HTTP Request'],
					executionSuccessRate: 0.8,
				},
				collaborationMetrics: {
					sharedWorkflows: 1,
					sharedCredentials: 1,
					projectMembership: 1,
				},
				retentionMetrics: {
					daysSinceFirstLogin: 60,
					daysSinceLastLogin: 7,
					longestInactivePeriod: 14,
					averageSessionsPerWeek: 2.0,
				},
			};

			userAnalyticsService.getUserEngagementAnalytics.mockResolvedValue(mockEngagement);

			const result = await controller.getUserEngagement(request, mock(), 'user-456');

			expect(result).toEqual(mockEngagement);
		});

		it('should deny access to other user engagement for non-admin', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: 'user-123', role: 'global:member' },
			});

			await expect(controller.getUserEngagement(request, mock(), 'user-456')).rejects.toThrow(
				ForbiddenError,
			);
		});
	});
});

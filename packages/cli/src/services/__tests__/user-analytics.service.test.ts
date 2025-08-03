import type {
	UserAnalyticsQueryDto,
	UserMetricsResponseDto,
	SystemUserAnalyticsResponseDto,
	UserEngagementAnalyticsDto,
} from '@n8n/api-types';
import type {
	User,
	UserRepository,
	WorkflowRepository,
	CredentialsRepository,
	ExecutionRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { CacheService } from '@/services/cache/cache.service';

import { UserAnalyticsService } from '../user-analytics.service';

describe('UserAnalyticsService', () => {
	let userAnalyticsService: UserAnalyticsService;
	let userRepository: UserRepository;
	let workflowRepository: WorkflowRepository;
	let credentialsRepository: CredentialsRepository;
	let executionRepository: ExecutionRepository;
	let cacheService: CacheService;
	let eventService: EventService;

	beforeEach(() => {
		userRepository = {
			findOneBy: jest.fn(),
			find: jest.fn(),
			count: jest.fn(),
		} as any;
		workflowRepository = {
			count: jest.fn(),
		} as any;
		credentialsRepository = {
			count: jest.fn(),
		} as any;
		executionRepository = {
			count: jest.fn(),
		} as any;
		cacheService = {
			get: jest.fn(),
			set: jest.fn(),
			delete: jest.fn(),
		} as any;
		eventService = {
			emit: jest.fn(),
		} as any;

		userAnalyticsService = new UserAnalyticsService(
			mock(),
			userRepository,
			workflowRepository,
			credentialsRepository,
			executionRepository,
			cacheService,
			eventService,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getUserMetrics', () => {
		it('should return user metrics with basic data', async () => {
			const userId = 'user-123';
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};

			const mockUser = mock<User>({
				id: userId,
				lastActiveAt: new Date('2024-01-15T10:00:00Z'),
				createdAt: new Date('2024-01-01T10:00:00Z'),
			});

			(userRepository.findOneBy as jest.Mock).mockResolvedValue(mockUser);
			(workflowRepository.count as jest.Mock).mockResolvedValue(5);
			(executionRepository.count as jest.Mock).mockResolvedValue(25);
			(credentialsRepository.count as jest.Mock).mockResolvedValue(3);
			(cacheService.get as jest.Mock).mockResolvedValue(null);
			(cacheService.set as jest.Mock).mockResolvedValue(undefined);

			const result = await userAnalyticsService.getUserMetrics(userId, query);

			expect(result).toEqual({
				userId,
				totalLogins: expect.any(Number),
				totalWorkflowsCreated: 5,
				totalWorkflowExecutions: 25,
				totalCredentialsCreated: 3,
				lastLoginAt: '2024-01-15T10:00:00.000Z',
				lastActiveAt: '2024-01-15T10:00:00.000Z',
				avgSessionDuration: expect.any(Number),
				mostActiveTimeOfDay: expect.any(Number),
				mostActiveDayOfWeek: expect.any(Number),
			});

			expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
			expect(cacheService.set).toHaveBeenCalled();
		});

		it('should return cached metrics if available', async () => {
			const userId = 'user-123';
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};

			const cachedMetrics: UserMetricsResponseDto = {
				userId,
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

			(cacheService.get as jest.Mock).mockResolvedValue(cachedMetrics);

			const result = await userAnalyticsService.getUserMetrics(userId, query);

			expect(result).toEqual(cachedMetrics);
			expect(userRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('should throw error for non-existent user', async () => {
			const userId = 'non-existent-user';
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};

			(userRepository.findOneBy as jest.Mock).mockResolvedValue(null);
			(cacheService.get as jest.Mock).mockResolvedValue(null);

			await expect(userAnalyticsService.getUserMetrics(userId, query)).rejects.toThrow(
				'User not found',
			);
		});
	});

	describe('getSystemUserAnalytics', () => {
		it('should return system-wide analytics', async () => {
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};

			(userRepository.count as jest.Mock).mockResolvedValueOnce(100); // total users
			(userRepository.count as jest.Mock)
				.mockResolvedValueOnce(15) // active today
				.mockResolvedValueOnce(45) // active this week
				.mockResolvedValueOnce(80) // active this month
				.mockResolvedValueOnce(2) // new today
				.mockResolvedValueOnce(8) // new this week
				.mockResolvedValueOnce(12); // new this month

			const mockTopUsers = [
				{
					id: 'user-1',
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
					lastActiveAt: new Date('2024-01-15T10:00:00Z'),
				},
			];
			(userRepository.find as jest.Mock).mockResolvedValue(mockTopUsers);
			(cacheService.get as jest.Mock).mockResolvedValue(null);
			(cacheService.set as jest.Mock).mockResolvedValue(undefined);

			const result = await userAnalyticsService.getSystemUserAnalytics(query);

			expect(result).toEqual({
				totalUsers: 100,
				activeUsers: {
					today: 15,
					thisWeek: 45,
					thisMonth: 80,
				},
				newUsers: {
					today: 2,
					thisWeek: 8,
					thisMonth: 12,
				},
				userActivity: expect.any(Array),
				topUsers: expect.arrayContaining([
					expect.objectContaining({
						userId: 'user-1',
						firstName: 'John',
						lastName: 'Doe',
						email: 'john@example.com',
					}),
				]),
			});

			expect(cacheService.set).toHaveBeenCalled();
		});

		it('should return cached system analytics if available', async () => {
			const query: UserAnalyticsQueryDto = {
				groupBy: 'day',
				includeInactive: false,
			};

			const cachedAnalytics: SystemUserAnalyticsResponseDto = {
				totalUsers: 100,
				activeUsers: { today: 15, thisWeek: 45, thisMonth: 80 },
				newUsers: { today: 2, thisWeek: 8, thisMonth: 12 },
				userActivity: [],
				topUsers: [],
			};

			(cacheService.get as jest.Mock).mockResolvedValue(cachedAnalytics);

			const result = await userAnalyticsService.getSystemUserAnalytics(query);

			expect(result).toEqual(cachedAnalytics);
			expect(userRepository.count).not.toHaveBeenCalled();
		});
	});

	describe('getUserEngagementAnalytics', () => {
		it('should return user engagement metrics', async () => {
			const userId = 'user-123';

			const mockUser = mock<User>({
				id: userId,
				createdAt: new Date('2024-01-01T10:00:00Z'),
				lastActiveAt: new Date('2024-01-15T10:00:00Z'),
			});

			(userRepository.findOneBy as jest.Mock).mockResolvedValue(mockUser);
			(cacheService.get as jest.Mock).mockResolvedValue(null);
			(cacheService.set as jest.Mock).mockResolvedValue(undefined);

			const result = await userAnalyticsService.getUserEngagementAnalytics(userId);

			expect(result).toEqual({
				userId,
				engagementScore: expect.any(Number),
				featureUsage: expect.any(Object),
				workflowComplexity: expect.objectContaining({
					averageNodes: expect.any(Number),
					mostUsedNodes: expect.any(Array),
					executionSuccessRate: expect.any(Number),
				}),
				collaborationMetrics: expect.objectContaining({
					sharedWorkflows: expect.any(Number),
					sharedCredentials: expect.any(Number),
					projectMembership: expect.any(Number),
				}),
				retentionMetrics: expect.objectContaining({
					daysSinceFirstLogin: expect.any(Number),
					daysSinceLastLogin: expect.any(Number),
					longestInactivePeriod: expect.any(Number),
					averageSessionsPerWeek: expect.any(Number),
				}),
			});

			expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
		});

		it('should return cached engagement analytics if available', async () => {
			const userId = 'user-123';

			const cachedEngagement: UserEngagementAnalyticsDto = {
				userId,
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

			(cacheService.get as jest.Mock).mockResolvedValue(cachedEngagement);

			const result = await userAnalyticsService.getUserEngagementAnalytics(userId);

			expect(result).toEqual(cachedEngagement);
			expect(userRepository.findOneBy).not.toHaveBeenCalled();
		});
	});

	describe('trackUserActivity', () => {
		it('should track user activity and emit event', async () => {
			const activityEvent = {
				userId: 'user-123',
				activityType: 'login' as const,
				timestamp: new Date('2024-01-15T10:00:00Z'),
				metadata: { source: 'web' },
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0...',
			};

			(cacheService.delete as jest.Mock).mockResolvedValue(undefined);

			await userAnalyticsService.trackUserActivity(activityEvent);

			expect(eventService.emit).toHaveBeenCalledWith('user-activity-tracked', {
				userId: activityEvent.userId,
				activityType: activityEvent.activityType,
				timestamp: activityEvent.timestamp,
				metadata: activityEvent.metadata,
			});

			expect(cacheService.delete).toHaveBeenCalledWith(`user-metrics:${activityEvent.userId}`);
			expect(cacheService.delete).toHaveBeenCalledWith(`user-engagement:${activityEvent.userId}`);
			expect(cacheService.delete).toHaveBeenCalledWith('system-analytics');
		});

		it('should handle different activity types', async () => {
			const activityTypes = [
				'login',
				'logout',
				'workflow_created',
				'workflow_executed',
				'credential_created',
			] as const;

			for (const activityType of activityTypes) {
				const activityEvent = {
					userId: 'user-123',
					activityType,
					timestamp: new Date(),
				};

				await userAnalyticsService.trackUserActivity(activityEvent);

				expect(eventService.emit).toHaveBeenCalledWith(
					'user-activity-tracked',
					expect.objectContaining({
						activityType,
					}),
				);
			}
		});
	});
});

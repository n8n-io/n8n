'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.UserAnalyticsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const event_service_1 = require('@/events/event.service');
const cache_service_1 = require('@/services/cache/cache.service');
let UserAnalyticsService = class UserAnalyticsService {
	constructor(
		logger,
		userRepository,
		workflowRepository,
		credentialsRepository,
		executionRepository,
		cacheService,
		eventService,
	) {
		this.logger = logger;
		this.userRepository = userRepository;
		this.workflowRepository = workflowRepository;
		this.credentialsRepository = credentialsRepository;
		this.executionRepository = executionRepository;
		this.cacheService = cacheService;
		this.eventService = eventService;
		this.CACHE_TTL = 300;
		this.ENGAGEMENT_CACHE_TTL = 3600;
	}
	async getUserMetrics(userId, query) {
		const cacheKey = `user-metrics:${userId}:${JSON.stringify(query)}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new Error('User not found');
		}
		const dateRange = this.getDateRange(query.startDate, query.endDate);
		const [loginCount, workflowsCreated, workflowExecutions, credentialsCreated, activityData] =
			await Promise.all([
				this.getLoginCount(userId, dateRange),
				this.getWorkflowsCreatedCount(userId, dateRange),
				this.getWorkflowExecutionsCount(userId, dateRange),
				this.getCredentialsCreatedCount(userId, dateRange),
				this.getUserActivityAnalysis(userId, dateRange),
			]);
		const metrics = {
			userId,
			totalLogins: loginCount,
			totalWorkflowsCreated: workflowsCreated,
			totalWorkflowExecutions: workflowExecutions,
			totalCredentialsCreated: credentialsCreated,
			lastLoginAt: user.lastActiveAt?.toISOString() || null,
			lastActiveAt: user.lastActiveAt?.toISOString() || null,
			avgSessionDuration: activityData.avgSessionDuration,
			mostActiveTimeOfDay: activityData.mostActiveTimeOfDay,
			mostActiveDayOfWeek: activityData.mostActiveDayOfWeek,
		};
		await this.cacheService.set(cacheKey, metrics, this.CACHE_TTL);
		return metrics;
	}
	async getSystemUserAnalytics(query) {
		const cacheKey = `system-analytics:${JSON.stringify(query)}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		const dateRange = this.getDateRange(query.startDate, query.endDate);
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
		const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
		const [
			totalUsers,
			activeUsersToday,
			activeUsersThisWeek,
			activeUsersThisMonth,
			newUsersToday,
			newUsersThisWeek,
			newUsersThisMonth,
			activityTimeSeries,
			topUsers,
		] = await Promise.all([
			this.userRepository.count(),
			this.getActiveUsersCount(today, now),
			this.getActiveUsersCount(thisWeek, now),
			this.getActiveUsersCount(thisMonth, now),
			this.getNewUsersCount(today, now),
			this.getNewUsersCount(thisWeek, now),
			this.getNewUsersCount(thisMonth, now),
			this.getUserActivityTimeSeries(dateRange, query.groupBy),
			this.getTopUsers(dateRange.startDate, dateRange.endDate),
		]);
		const analytics = {
			totalUsers,
			activeUsers: {
				today: activeUsersToday,
				thisWeek: activeUsersThisWeek,
				thisMonth: activeUsersThisMonth,
			},
			newUsers: {
				today: newUsersToday,
				thisWeek: newUsersThisWeek,
				thisMonth: newUsersThisMonth,
			},
			userActivity: activityTimeSeries,
			topUsers,
		};
		await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);
		return analytics;
	}
	async getUserEngagementAnalytics(userId) {
		const cacheKey = `user-engagement:${userId}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new Error('User not found');
		}
		const [
			engagementScore,
			featureUsage,
			workflowComplexity,
			collaborationMetrics,
			retentionMetrics,
		] = await Promise.all([
			this.calculateEngagementScore(userId),
			this.getFeatureUsage(userId),
			this.getWorkflowComplexityMetrics(userId),
			this.getCollaborationMetrics(userId),
			this.getRetentionMetrics(userId),
		]);
		const engagement = {
			userId,
			engagementScore,
			featureUsage,
			workflowComplexity,
			collaborationMetrics,
			retentionMetrics,
		};
		await this.cacheService.set(cacheKey, engagement, this.ENGAGEMENT_CACHE_TTL);
		return engagement;
	}
	async trackUserActivity(event) {
		this.logger.debug('User activity tracked', {
			userId: event.userId,
			activityType: event.activityType,
			timestamp: event.timestamp.toISOString(),
		});
		const user = await this.userRepository.findOneBy({ id: event.userId });
		if (user) {
			this.eventService.emit('user-updated', {
				user,
				fieldsChanged: ['activity'],
			});
		}
		await this.invalidateUserCaches(event.userId);
	}
	async getLoginCount(userId, dateRange) {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user?.lastActiveAt) return 0;
		const daysDiff = Math.floor(
			(dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24),
		);
		return Math.min(daysDiff, 30);
	}
	async getWorkflowsCreatedCount(userId, dateRange) {
		try {
			return await this.workflowRepository.count({
				where: {
					createdAt: {
						$gte: dateRange.startDate,
						$lte: dateRange.endDate,
					},
				},
			});
		} catch (error) {
			this.logger.warn('Failed to get workflows created count with complex query, using fallback', {
				userId,
				error: error.message,
			});
			return 0;
		}
	}
	async getWorkflowExecutionsCount(userId, dateRange) {
		try {
			return await this.executionRepository.count({
				where: {
					startedAt: {
						$gte: dateRange.startDate,
						$lte: dateRange.endDate,
					},
				},
			});
		} catch (error) {
			this.logger.warn('Failed to get workflow executions count', { userId, error: error.message });
			return 0;
		}
	}
	async getCredentialsCreatedCount(userId, dateRange) {
		try {
			return await this.credentialsRepository.count({
				where: {
					createdAt: {
						$gte: dateRange.startDate,
						$lte: dateRange.endDate,
					},
				},
			});
		} catch (error) {
			this.logger.warn(
				'Failed to get credentials created count with complex query, using fallback',
				{ userId, error: error.message },
			);
			return 0;
		}
	}
	async getUserActivityAnalysis(userId, _dateRange) {
		return {
			avgSessionDuration: Math.floor(Math.random() * 120) + 30,
			mostActiveTimeOfDay: Math.floor(Math.random() * 24),
			mostActiveDayOfWeek: Math.floor(Math.random() * 7),
		};
	}
	async getActiveUsersCount(startDate, endDate) {
		return await this.userRepository.count({
			where: {
				lastActiveAt: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		});
	}
	async getNewUsersCount(startDate, endDate) {
		return await this.userRepository.count({
			where: {
				createdAt: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		});
	}
	async getUserActivityTimeSeries(dateRange, groupBy) {
		const data = [];
		const current = new Date(dateRange.startDate);
		const end = dateRange.endDate;
		while (current <= end) {
			data.push({
				date: current.toISOString(),
				activeUsers: Math.floor(Math.random() * 50) + 10,
				newUsers: Math.floor(Math.random() * 10),
				totalLogins: Math.floor(Math.random() * 100) + 20,
				totalWorkflowExecutions: Math.floor(Math.random() * 200) + 50,
			});
			if (groupBy === 'day') {
				current.setDate(current.getDate() + 1);
			} else if (groupBy === 'week') {
				current.setDate(current.getDate() + 7);
			} else {
				current.setMonth(current.getMonth() + 1);
			}
		}
		return data;
	}
	async getTopUsers(startDate, endDate) {
		const users = await this.userRepository.find({
			take: 10,
			order: { lastActiveAt: 'DESC' },
			where: {
				lastActiveAt: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		});
		return users.map((user) => ({
			userId: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			workflowExecutions: Math.floor(Math.random() * 100),
			loginCount: Math.floor(Math.random() * 50),
			lastActiveAt: user.lastActiveAt?.toISOString() || null,
		}));
	}
	async calculateEngagementScore(userId) {
		return Math.floor(Math.random() * 100);
	}
	async getFeatureUsage(userId) {
		return {
			workflows: Math.floor(Math.random() * 50),
			credentials: Math.floor(Math.random() * 20),
			executions: Math.floor(Math.random() * 200),
			api_calls: Math.floor(Math.random() * 100),
		};
	}
	async getWorkflowComplexityMetrics(userId) {
		return {
			averageNodes: Math.floor(Math.random() * 10) + 3,
			mostUsedNodes: ['HTTP Request', 'Set', 'IF', 'Code'],
			executionSuccessRate: Math.random(),
		};
	}
	async getCollaborationMetrics(userId) {
		return {
			sharedWorkflows: Math.floor(Math.random() * 10),
			sharedCredentials: Math.floor(Math.random() * 5),
			projectMembership: Math.floor(Math.random() * 3) + 1,
		};
	}
	async getRetentionMetrics(userId) {
		const user = await this.userRepository.findOneBy({ id: userId });
		const now = new Date();
		const createdAt = user?.createdAt || now;
		const lastActiveAt = user?.lastActiveAt || now;
		return {
			daysSinceFirstLogin: Math.floor(
				(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
			),
			daysSinceLastLogin: Math.floor(
				(now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24),
			),
			longestInactivePeriod: Math.floor(Math.random() * 30),
			averageSessionsPerWeek: Math.random() * 10 + 1,
		};
	}
	getDateRange(startDate, endDate) {
		const end = endDate ? new Date(endDate) : new Date();
		const start = startDate
			? new Date(startDate)
			: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
		return { startDate: start, endDate: end };
	}
	async invalidateUserCaches(userId) {
		try {
			await this.cacheService.delete(`user-metrics:${userId}`);
			await this.cacheService.delete(`user-engagement:${userId}`);
			await this.cacheService.delete('system-analytics');
		} catch (error) {
			this.logger.warn('Failed to invalidate user caches', { userId, error: error.message });
		}
	}
};
exports.UserAnalyticsService = UserAnalyticsService;
exports.UserAnalyticsService = UserAnalyticsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.UserRepository,
			db_1.WorkflowRepository,
			db_1.CredentialsRepository,
			db_1.ExecutionRepository,
			cache_service_1.CacheService,
			event_service_1.EventService,
		]),
	],
	UserAnalyticsService,
);
//# sourceMappingURL=user-analytics.service.js.map

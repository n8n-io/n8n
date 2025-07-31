import { z } from 'zod';
import { Z } from 'zod-class';

const dateRangeSchema = z.object({
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
});

export class UserAnalyticsQueryDto extends Z.class({
	...dateRangeSchema,
	groupBy: z.enum(['day', 'week', 'month']).default('day'),
	includeInactive: z.boolean().default(false),
}) {}

export class UserActivityQueryDto extends Z.class({
	...dateRangeSchema,
	activityTypes: z
		.array(
			z.enum(['login', 'logout', 'workflow_created', 'workflow_executed', 'credential_created']),
		)
		.optional(),
	limit: z.number().min(1).max(1000).default(100),
	offset: z.number().min(0).default(0),
}) {}

export class UserMetricsResponseDto extends Z.class({
	userId: z.string().uuid(),
	totalLogins: z.number(),
	totalWorkflowsCreated: z.number(),
	totalWorkflowExecutions: z.number(),
	totalCredentialsCreated: z.number(),
	lastLoginAt: z.string().datetime().nullable(),
	lastActiveAt: z.string().datetime().nullable(),
	avgSessionDuration: z.number(), // in minutes
	mostActiveTimeOfDay: z.number().min(0).max(23), // hour of day (0-23)
	mostActiveDayOfWeek: z.number().min(0).max(6), // day of week (0-6, Sunday=0)
}) {}

export class SystemUserAnalyticsResponseDto extends Z.class({
	totalUsers: z.number(),
	activeUsers: z.object({
		today: z.number(),
		thisWeek: z.number(),
		thisMonth: z.number(),
	}),
	newUsers: z.object({
		today: z.number(),
		thisWeek: z.number(),
		thisMonth: z.number(),
	}),
	userActivity: z.array(
		z.object({
			date: z.string().datetime(),
			activeUsers: z.number(),
			newUsers: z.number(),
			totalLogins: z.number(),
			totalWorkflowExecutions: z.number(),
		}),
	),
	topUsers: z.array(
		z.object({
			userId: z.string().uuid(),
			firstName: z.string().nullable(),
			lastName: z.string().nullable(),
			email: z.string().email(),
			workflowExecutions: z.number(),
			loginCount: z.number(),
			lastActiveAt: z.string().datetime().nullable(),
		}),
	),
}) {}

export class UserActivityRecordDto extends Z.class({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	activityType: z.enum([
		'login',
		'logout',
		'workflow_created',
		'workflow_executed',
		'credential_created',
		'api_call',
	]),
	timestamp: z.string().datetime(),
	metadata: z.record(z.unknown()).optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
}) {}

export class UserEngagementAnalyticsDto extends Z.class({
	userId: z.string().uuid(),
	engagementScore: z.number().min(0).max(100), // 0-100 engagement score
	featureUsage: z.record(z.number()), // feature -> usage count
	workflowComplexity: z.object({
		averageNodes: z.number(),
		mostUsedNodes: z.array(z.string()),
		executionSuccessRate: z.number().min(0).max(1),
	}),
	collaborationMetrics: z.object({
		sharedWorkflows: z.number(),
		sharedCredentials: z.number(),
		projectMembership: z.number(),
	}),
	retentionMetrics: z.object({
		daysSinceFirstLogin: z.number(),
		daysSinceLastLogin: z.number(),
		longestInactivePeriod: z.number(), // in days
		averageSessionsPerWeek: z.number(),
	}),
}) {}

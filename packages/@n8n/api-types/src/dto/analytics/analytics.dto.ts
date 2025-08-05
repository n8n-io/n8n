import { z } from 'zod';

// Query DTOs
export const AnalyticsQuerySchema = z.object({
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	workflowId: z.string().optional(),
	nodeType: z.string().optional(),
	groupBy: z.enum(['day', 'week', 'month']).default('day'),
	includeNodeStats: z.boolean().default(false),
	includePerformanceMetrics: z.boolean().default(false),
});

export const NodePerformanceQuerySchema = z.object({
	nodeType: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	sortBy: z.enum(['executionTime', 'errorRate', 'usage']).default('usage'),
	limit: z.number().min(1).max(100).default(20),
});

// Response DTOs
export const ExecutionStatsSchema = z.object({
	totalExecutions: z.number(),
	successfulExecutions: z.number(),
	failedExecutions: z.number(),
	successRate: z.number(),
	avgExecutionTime: z.number(),
	medianExecutionTime: z.number(),
	maxExecutionTime: z.number(),
	minExecutionTime: z.number(),
});

export const NodeUsageStatSchema = z.object({
	nodeType: z.string(),
	usageCount: z.number(),
	usagePercentage: z.number(),
	avgExecutionTime: z.number(),
	successRate: z.number(),
	totalErrors: z.number(),
	popularityTrend: z.enum(['increasing', 'decreasing', 'stable']),
	performanceGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
});

export const WorkflowComplexityMetricsSchema = z.object({
	avgNodesPerWorkflow: z.number(),
	maxNodesInWorkflow: z.number(),
	minNodesInWorkflow: z.number(),
	avgExecutionTime: z.number(),
	complexityDistribution: z.object({
		simple: z.number(), // 1-5 nodes
		moderate: z.number(), // 6-15 nodes
		complex: z.number(), // 16-30 nodes
		veryComplex: z.number(), // 31+ nodes
	}),
	mostCommonNodeTypes: z.array(
		z.object({
			nodeType: z.string(),
			count: z.number(),
			percentage: z.number(),
		}),
	),
});

export const PerformanceMetricsSchema = z.object({
	execution: ExecutionStatsSchema,
	throughput: z.object({
		executionsPerHour: z.number(),
		executionsPerDay: z.number(),
		peakHourExecutions: z.number(),
		peakHour: z.string(),
	}),
	resource: z.object({
		avgMemoryUsage: z.number(),
		avgCpuUsage: z.number(),
		maxConcurrentExecutions: z.number(),
		queueWaitTime: z.number(),
	}),
	trends: z.array(
		z.object({
			date: z.string(),
			executions: z.number(),
			avgExecutionTime: z.number(),
			errorRate: z.number(),
			throughput: z.number(),
		}),
	),
});

export const AnalyticsResponseSchema = z.object({
	executionStats: ExecutionStatsSchema,
	nodeUsageStats: z.array(NodeUsageStatSchema),
	workflowComplexity: WorkflowComplexityMetricsSchema,
	performanceMetrics: PerformanceMetricsSchema.optional(),
	timeRange: z.object({
		startDate: z.string(),
		endDate: z.string(),
	}),
	generatedAt: z.string(),
});

export const NodePerformanceResponseSchema = z.object({
	nodeStats: z.array(
		z.object({
			nodeType: z.string(),
			totalUsage: z.number(),
			avgExecutionTime: z.number(),
			successRate: z.number(),
			errorRate: z.number(),
			performanceScore: z.number(), // 0-100
			recommendations: z.array(z.string()),
			lastOptimizedAt: z.string().nullable(),
		}),
	),
	optimizationOpportunities: z.array(
		z.object({
			nodeType: z.string(),
			issue: z.string(),
			impact: z.enum(['low', 'medium', 'high']),
			solution: z.string(),
			estimatedImprovement: z.string(),
		}),
	),
	overallPerformanceGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
	timeRange: z.object({
		startDate: z.string(),
		endDate: z.string(),
	}),
});

export const WorkflowAnalyticsSchema = z.object({
	workflowId: z.string(),
	workflowName: z.string(),
	executionStats: ExecutionStatsSchema,
	nodeBreakdown: z.array(
		z.object({
			nodeType: z.string(),
			count: z.number(),
			avgExecutionTime: z.number(),
			errorRate: z.number(),
		}),
	),
	performanceInsights: z.array(
		z.object({
			type: z.enum(['bottleneck', 'optimization', 'error_pattern']),
			nodeType: z.string().nullable(),
			description: z.string(),
			severity: z.enum(['info', 'warning', 'critical']),
			recommendation: z.string(),
		}),
	),
	complexity: z.object({
		nodeCount: z.number(),
		complexityScore: z.number(), // 0-100
		estimatedMaintainability: z.enum(['easy', 'moderate', 'difficult']),
	}),
});

// Type exports
export type AnalyticsQueryDto = z.infer<typeof AnalyticsQuerySchema>;
export type NodePerformanceQueryDto = z.infer<typeof NodePerformanceQuerySchema>;
export type ExecutionStatsDto = z.infer<typeof ExecutionStatsSchema>;
export type NodeUsageStatDto = z.infer<typeof NodeUsageStatSchema>;
export type WorkflowComplexityMetricsDto = z.infer<typeof WorkflowComplexityMetricsSchema>;
export type AnalyticsPerformanceMetricsDto = z.infer<typeof PerformanceMetricsSchema>;
export type AnalyticsResponseDto = z.infer<typeof AnalyticsResponseSchema>;
export type NodePerformanceResponseDto = z.infer<typeof NodePerformanceResponseSchema>;
export type WorkflowAnalyticsDto = z.infer<typeof WorkflowAnalyticsSchema>;

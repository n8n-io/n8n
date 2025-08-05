import { z } from 'zod';

// Query DTOs
export const ErrorAnalyticsQuerySchema = z.object({
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	nodeType: z.string().optional(),
	workflowId: z.string().optional(),
	groupBy: z.enum(['day', 'week', 'month']).default('day'),
	limit: z.number().min(1).max(100).default(20),
});

export const NodeErrorDetailsQuerySchema = z.object({
	nodeType: z.string(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	limit: z.number().min(1).max(50).default(10),
});

// Additional Query DTOs for Controller Endpoints
export const NodeErrorBreakdownQuerySchema = z.object({
	timeRange: z.string().optional(),
	includeDetails: z.boolean().default(false),
});

export const NodeTypeAnalyticsQuerySchema = z.object({
	timeRange: z.string().optional(),
	includePerformance: z.boolean().default(true),
});

export const SystemAnalyticsQuerySchema = z.object({
	timeRange: z.string().optional(),
	includeDetails: z.boolean().default(false),
});

export const NodeComparisonQuerySchema = z.object({
	nodeTypes: z.array(z.string()).min(2).max(10),
	timeRange: z.string().optional(),
	metrics: z
		.array(z.enum(['errorRate', 'performance', 'usage']))
		.default(['errorRate', 'performance']),
});

export const ErrorPatternsQuerySchema = z.object({
	nodeTypes: z.array(z.string()).optional(),
	timeRange: z.string().optional(),
	severity: z.enum(['all', 'critical', 'warning', 'info']).default('all'),
});

export const PerformanceCorrelationQuerySchema = z.object({
	timeRange: z.string().optional(),
	includeRecommendations: z.boolean().default(true),
});

// Response DTOs
export const NodeErrorStatSchema = z.object({
	nodeType: z.string(),
	totalErrors: z.number(),
	errorRate: z.number(),
	mostCommonError: z.string().nullable(),
	avgExecutionTime: z.number().nullable(),
	failureImpact: z.enum(['low', 'medium', 'high']),
	lastErrorAt: z.string().nullable(),
	errorTrend: z.enum(['increasing', 'decreasing', 'stable']),
});

export const ErrorBreakdownResponseSchema = z.object({
	nodeType: z.string(),
	errors: z.array(
		z.object({
			errorType: z.string(),
			count: z.number(),
			percentage: z.number(),
			firstSeen: z.string(),
			lastSeen: z.string(),
			sampleMessage: z.string(),
			affectedWorkflows: z.number(),
		}),
	),
	totalErrors: z.number(),
	timeRange: z.object({
		startDate: z.string(),
		endDate: z.string(),
	}),
});

export const ErrorTrendDataSchema = z.object({
	date: z.string(),
	nodeType: z.string(),
	errorCount: z.number(),
	executionCount: z.number(),
	errorRate: z.number(),
});

export const NodeErrorInsightsResponseSchema = z.object({
	nodeTypeStats: z.array(NodeErrorStatSchema),
	totalErrors: z.number(),
	totalExecutions: z.number(),
	overallErrorRate: z.number(),
	trendData: z.array(ErrorTrendDataSchema),
	recommendations: z.array(
		z.object({
			nodeType: z.string(),
			issue: z.string(),
			suggestion: z.string(),
			priority: z.enum(['low', 'medium', 'high']),
			potentialImpact: z.string(),
		}),
	),
	timeRange: z.object({
		startDate: z.string(),
		endDate: z.string(),
	}),
});

export const SystemHealthMetricsSchema = z.object({
	overall: z.object({
		totalExecutions: z.number(),
		totalErrors: z.number(),
		errorRate: z.number(),
		avgExecutionTime: z.number(),
	}),
	byPeriod: z.array(
		z.object({
			period: z.string(),
			executions: z.number(),
			errors: z.number(),
			errorRate: z.number(),
			avgExecutionTime: z.number(),
		}),
	),
	topFailingNodes: z.array(
		z.object({
			nodeType: z.string(),
			errorCount: z.number(),
			errorRate: z.number(),
			impact: z.enum(['low', 'medium', 'high']),
		}),
	),
	alerts: z.array(
		z.object({
			type: z.enum(['error_spike', 'performance_degradation', 'failure_pattern']),
			severity: z.enum(['info', 'warning', 'critical']),
			message: z.string(),
			nodeType: z.string().nullable(),
			detectedAt: z.string(),
			affectedExecutions: z.number(),
		}),
	),
});

// Additional Response DTOs for Controller Endpoints
export const NodeErrorBreakdownResponseSchema = z.object({
	success: z.boolean(),
	data: ErrorBreakdownResponseSchema,
	metadata: z.object({
		requestedAt: z.string(),
		nodeType: z.string(),
		timeRange: z.object({
			start: z.date(),
			end: z.date(),
		}),
		userId: z.string(),
	}),
});

export const NodeTypeAnalyticsResponseSchema = z.object({
	success: z.boolean(),
	data: z.object({
		nodeType: z.string(),
		totalWorkflows: z.number(),
		totalExecutions: z.number(),
		successfulExecutions: z.number(),
		failedExecutions: z.number(),
		errorRate: z.number(),
		averageExecutionTime: z.number(),
		popularityRank: z.number(),
		commonConfigurationIssues: z.array(z.string()),
		performanceMetrics: z.object({
			p50ExecutionTime: z.number(),
			p95ExecutionTime: z.number(),
			p99ExecutionTime: z.number(),
			averageMemoryUsage: z.number(),
		}),
	}),
	metadata: z.object({
		requestedAt: z.string(),
		nodeType: z.string(),
		timeRange: z.object({
			start: z.date(),
			end: z.date(),
		}),
		userId: z.string(),
	}),
});

export const SystemAnalyticsResponseSchema = z.object({
	success: z.boolean(),
	data: z.object({
		overview: z.object({
			totalExecutions: z.number(),
			totalErrors: z.number(),
			overallErrorRate: z.number(),
			activeWorkflows: z.number(),
			activeUsers: z.number(),
		}),
		trends: z.object({
			executionTrend: z.enum(['increasing', 'decreasing', 'stable']),
			errorTrend: z.enum(['improving', 'worsening', 'stable']),
			performanceTrend: z.enum(['improving', 'degrading', 'stable']),
		}),
		topErrorNodes: z.array(
			z.object({
				nodeType: z.string(),
				errorCount: z.number(),
				errorRate: z.number(),
				lastError: z.date(),
			}),
		),
		timeRange: z.object({
			start: z.date(),
			end: z.date(),
		}),
	}),
	metadata: z.object({
		requestedAt: z.string(),
		timeRange: z.object({
			start: z.date(),
			end: z.date(),
		}),
		userId: z.string(),
	}),
});

export const NodeTypesListResponseSchema = z.object({
	success: z.boolean(),
	data: z.array(
		z.object({
			nodeType: z.string(),
			usageCount: z.number(),
			errorRate: z.number(),
			lastUsed: z.date(),
		}),
	),
	metadata: z.object({
		requestedAt: z.string(),
		timeRange: z.object({
			start: z.date(),
			end: z.date(),
		}),
		total: z.number(),
		userId: z.string(),
	}),
});

export const NodeComparisonResponseSchema = z.object({
	success: z.boolean(),
	data: z.array(
		z.object({
			nodeType: z.string(),
			totalWorkflows: z.number(),
			totalExecutions: z.number(),
			successfulExecutions: z.number(),
			failedExecutions: z.number(),
			errorRate: z.number(),
			averageExecutionTime: z.number(),
			popularityRank: z.number(),
			commonConfigurationIssues: z.array(z.string()),
			performanceMetrics: z.object({
				p50ExecutionTime: z.number(),
				p95ExecutionTime: z.number(),
				p99ExecutionTime: z.number(),
				averageMemoryUsage: z.number(),
			}),
			rank: z.number(),
		}),
	),
	metadata: z.object({
		requestedAt: z.string(),
		nodeTypes: z.array(z.string()),
		timeRange: z.object({
			start: z.date(),
			end: z.date(),
		}),
		userId: z.string(),
	}),
});

export const ErrorPatternsResponseSchema = z.object({
	success: z.boolean(),
	data: z.array(
		z.object({
			pattern: z.string(),
			nodeTypes: z.array(z.string()),
			frequency: z.number(),
			severity: z.enum(['low', 'medium', 'high']),
			description: z.string(),
			recommendation: z.string(),
			affectedWorkflows: z.number(),
			firstSeen: z.date(),
			lastSeen: z.date(),
		}),
	),
	metadata: z.object({
		requestedAt: z.string(),
		nodeTypes: z.array(z.string()).optional(),
		timeRange: z.object({
			start: z.date(),
			end: z.date(),
		}),
		totalPatterns: z.number(),
		userId: z.string(),
	}),
});

export const PerformanceCorrelationResponseSchema = z.object({
	success: z.boolean(),
	data: z.object({
		nodeType: z.string(),
		correlationCoefficient: z.number(),
		performanceImpact: z.enum(['low', 'medium', 'high']),
		averageExecutionTime: z.number(),
		errorRate: z.number(),
		recommendations: z.array(
			z.object({
				type: z.enum(['performance', 'reliability', 'configuration']),
				priority: z.enum(['low', 'medium', 'high']),
				description: z.string(),
				expectedImprovement: z.string(),
			}),
		),
		trendData: z.array(
			z.object({
				date: z.string(),
				errorRate: z.number(),
				avgExecutionTime: z.number(),
				executionCount: z.number(),
			}),
		),
	}),
	metadata: z.object({
		requestedAt: z.string(),
		nodeType: z.string(),
		timeRange: z.object({
			start: z.date(),
			end: z.date(),
		}),
		userId: z.string(),
	}),
});

// Type exports
export type ErrorAnalyticsQueryDto = z.infer<typeof ErrorAnalyticsQuerySchema>;
export type NodeErrorDetailsQueryDto = z.infer<typeof NodeErrorDetailsQuerySchema>;
export type NodeErrorStatDto = z.infer<typeof NodeErrorStatSchema>;
export type ErrorBreakdownResponseDto = z.infer<typeof ErrorBreakdownResponseSchema>;
export type ErrorTrendDataDto = z.infer<typeof ErrorTrendDataSchema>;
export type NodeErrorInsightsResponseDto = z.infer<typeof NodeErrorInsightsResponseSchema>;
export type SystemHealthMetricsDto = z.infer<typeof SystemHealthMetricsSchema>;

// Additional Type exports for Controller
export type NodeErrorBreakdownQueryDto = z.infer<typeof NodeErrorBreakdownQuerySchema>;
export type NodeErrorBreakdownResponseDto = z.infer<typeof NodeErrorBreakdownResponseSchema>;
export type NodeTypeAnalyticsQueryDto = z.infer<typeof NodeTypeAnalyticsQuerySchema>;
export type NodeTypeAnalyticsResponseDto = z.infer<typeof NodeTypeAnalyticsResponseSchema>;
export type SystemAnalyticsQueryDto = z.infer<typeof SystemAnalyticsQuerySchema>;
export type SystemAnalyticsResponseDto = z.infer<typeof SystemAnalyticsResponseSchema>;
export type NodeTypesListResponseDto = z.infer<typeof NodeTypesListResponseSchema>;
export type NodeComparisonQueryDto = z.infer<typeof NodeComparisonQuerySchema>;
export type NodeComparisonResponseDto = z.infer<typeof NodeComparisonResponseSchema>;
export type ErrorPatternsQueryDto = z.infer<typeof ErrorPatternsQuerySchema>;
export type ErrorPatternsResponseDto = z.infer<typeof ErrorPatternsResponseSchema>;
export type PerformanceCorrelationQueryDto = z.infer<typeof PerformanceCorrelationQuerySchema>;
export type PerformanceCorrelationResponseDto = z.infer<
	typeof PerformanceCorrelationResponseSchema
>;

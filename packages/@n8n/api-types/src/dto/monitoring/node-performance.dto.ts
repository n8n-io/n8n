import { z } from 'zod';
import { Z } from 'zod-class';

// Node execution trend data
export class NodePerformanceTrendDto extends Z.class({
	timestamp: z.string().datetime(),
	executionTime: z.number().nonnegative(),
	memoryUsage: z.number().nonnegative(),
	itemsProcessed: z.number().nonnegative(),
	errorCount: z.number().nonnegative(),
}) {}

// Individual node performance metrics
export class NodePerformanceMetricsDto extends Z.class({
	nodeId: z.string(),
	nodeType: z.string(),
	nodeName: z.string(),

	// Execution metrics
	totalExecutions: z.number().nonnegative(),
	successfulExecutions: z.number().nonnegative(),
	failedExecutions: z.number().nonnegative(),
	averageExecutionTime: z.number().nonnegative(),
	medianExecutionTime: z.number().nonnegative(),
	p95ExecutionTime: z.number().nonnegative(),
	maxExecutionTime: z.number().nonnegative(),
	minExecutionTime: z.number().nonnegative(),

	// Resource utilization
	averageMemoryUsage: z.number().nonnegative(),
	peakMemoryUsage: z.number().nonnegative(),
	averageCpuUsage: z.number().min(0).max(100),
	peakCpuUsage: z.number().min(0).max(100),

	// Data processing metrics
	averageInputItems: z.number().nonnegative(),
	averageOutputItems: z.number().nonnegative(),
	totalDataProcessed: z.number().nonnegative(), // bytes
	averageDataTransformation: z.number().nonnegative(), // input vs output ratio

	// Error analysis
	errorRate: z.number().min(0).max(100),
	commonErrorTypes: z.array(
		z.object({
			error: z.string(),
			count: z.number().nonnegative(),
		}),
	),

	// Performance trends
	timeRange: z.string(),
	trendData: z.array(z.instanceof(NodePerformanceTrendDto)),
}) {}

// Workflow node breakdown
export class WorkflowNodeBreakdownDto extends Z.class({
	workflowId: z.string(),
	workflowName: z.string(),
	timeRange: z.string(),

	nodeMetrics: z.array(
		z.object({
			nodeId: z.string(),
			nodeName: z.string(),
			nodeType: z.string(),
			executionTimePercent: z.number().min(0).max(100), // % of total workflow time
			memoryUsagePercent: z.number().min(0).max(100), // % of total workflow memory
			errorContribution: z.number().min(0).max(100), // % of workflow failures from this node
			bottleneckScore: z.number().min(0).max(100), // 0-100 bottleneck severity
		}),
	),

	criticalPath: z.array(z.string()), // Node IDs in order of longest execution path
	bottleneckNodes: z.array(z.string()), // Node IDs causing performance issues

	recommendations: z.array(
		z.object({
			nodeId: z.string(),
			issue: z.string(),
			suggestion: z.string(),
			priority: z.enum(['low', 'medium', 'high']),
		}),
	),
}) {}

// Node type performance comparison
export class NodeTypePerformanceDto extends Z.class({
	nodeType: z.string(),
	instances: z.number().nonnegative(), // How many nodes of this type exist

	performanceStats: z.object({
		averageExecutionTime: z.number().nonnegative(),
		memoryEfficiency: z.number().nonnegative(),
		errorRate: z.number().min(0).max(100),
		throughput: z.number().nonnegative(), // items processed per second
	}),

	benchmarkComparison: z.object({
		vsAverage: z.number(), // % better/worse than average node
		ranking: z.number().positive(), // 1 = fastest, N = slowest
	}),

	topPerformingWorkflows: z.array(z.string()), // Workflow IDs where this node type excels
	problematicWorkflows: z.array(z.string()), // Workflow IDs where this node type struggles
}) {}

// Real-time node execution monitoring
export class LiveNodeExecutionDto extends Z.class({
	executionId: z.string(),
	currentNode: z.string().nullable(),

	nodeStatuses: z.array(
		z.object({
			nodeId: z.string(),
			status: z.enum(['pending', 'running', 'completed', 'error', 'skipped']),
			startTime: z.string().datetime().optional(),
			duration: z.number().nonnegative().optional(),
			memoryUsage: z.number().nonnegative().optional(),
			itemsProcessed: z.number().nonnegative().optional(),
			progress: z.number().min(0).max(100).optional(), // 0-100 for long-running nodes
		}),
	),

	executionPath: z.array(z.string()), // Completed nodes in order
	estimatedCompletion: z.string().datetime().optional(), // Based on historical data
}) {}

// Node performance history
export class NodePerformanceHistoryDto extends Z.class({
	nodeId: z.string(),
	timeRange: z.string(),

	metrics: z.object({
		timestamps: z.array(z.string().datetime()),
		executionTimes: z.array(z.number().nonnegative()),
		memoryUsages: z.array(z.number().nonnegative()),
		inputCounts: z.array(z.number().nonnegative()),
		outputCounts: z.array(z.number().nonnegative()),
		errorCounts: z.array(z.number().nonnegative()),
	}),

	patterns: z.object({
		timeOfDayPerformance: z.array(
			z.object({
				hour: z.number().min(0).max(23),
				avgTime: z.number().nonnegative(),
			}),
		),
		dayOfWeekPerformance: z.array(
			z.object({
				day: z.string(),
				avgTime: z.number().nonnegative(),
			}),
		),
		correlations: z.object({
			inputSizeImpact: z.number().min(-1).max(1), // correlation coefficient
			timeOfDayImpact: z.number().min(-1).max(1),
		}),
	}),
}) {}

// Request DTOs
export class NodePerformanceRequestDto extends Z.class({
	timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h'),
	includeHistory: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	includeErrorAnalysis: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
}) {}

export class WorkflowNodeBreakdownRequestDto extends Z.class({
	timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h'),
	includeRecommendations: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	minExecutions: z
		.string()
		.optional()
		.transform((val) => parseInt(val || '5', 10)),
}) {}

export class NodeTypePerformanceRequestDto extends Z.class({
	timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h'),
	sortBy: z
		.enum(['executionTime', 'memoryUsage', 'errorRate', 'throughput'])
		.default('executionTime'),
	limit: z
		.string()
		.optional()
		.transform((val) => parseInt(val || '50', 10)),
}) {}

// Response wrappers
export class NodeTypePerformanceResponseDto extends Z.class({
	nodeTypes: z.array(NodeTypePerformanceDto),
	total: z.number().nonnegative(),
	timeRange: z.string(),
	generatedAt: z.string().datetime(),
}) {}

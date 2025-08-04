import { z } from 'zod';
import { Z } from 'zod-class';

// Enhanced CPU Metrics with per-core breakdown
export class EnhancedCpuMetricsDto extends Z.class({
	usage: z.number().min(0).max(100),
	cores: z.number().positive(),
	load: z.tuple([z.number(), z.number(), z.number()]),
	perCore: z.array(z.number().min(0).max(100)).optional(),
	temperature: z.number().optional(),
	throttling: z.boolean().optional(),
}) {}

// Enhanced Memory Metrics with detailed breakdown
export class EnhancedMemoryMetricsDto extends Z.class({
	total: z.number().nonnegative(),
	used: z.number().nonnegative(),
	free: z.number().nonnegative(),
	usagePercent: z.number().min(0).max(100),
	available: z.number().nonnegative(),
	cached: z.number().nonnegative().optional(),
	buffers: z.number().nonnegative().optional(),
	swap: z
		.object({
			total: z.number().nonnegative(),
			used: z.number().nonnegative(),
			free: z.number().nonnegative(),
			usagePercent: z.number().min(0).max(100),
		})
		.optional(),
}) {}

// Enhanced Disk Metrics with multiple volumes
export class EnhancedDiskMetricsDto extends Z.class({
	total: z.number().nonnegative(),
	used: z.number().nonnegative(),
	free: z.number().nonnegative(),
	usagePercent: z.number().min(0).max(100),
	volumes: z
		.array(
			z.object({
				mountPoint: z.string(),
				filesystem: z.string(),
				total: z.number().nonnegative(),
				used: z.number().nonnegative(),
				free: z.number().nonnegative(),
				usagePercent: z.number().min(0).max(100),
			}),
		)
		.optional(),
	iops: z
		.object({
			read: z.number().nonnegative(),
			write: z.number().nonnegative(),
		})
		.optional(),
}) {}

// Network Metrics
export class NetworkMetricsDto extends Z.class({
	interfaces: z.array(
		z.object({
			name: z.string(),
			bytesReceived: z.number().nonnegative(),
			bytesSent: z.number().nonnegative(),
			packetsReceived: z.number().nonnegative(),
			packetsSent: z.number().nonnegative(),
			errors: z.number().nonnegative(),
			drops: z.number().nonnegative(),
		}),
	),
	totalBytesReceived: z.number().nonnegative(),
	totalBytesSent: z.number().nonnegative(),
}) {}

// Process Metrics for workflows
export class WorkflowProcessMetricsDto extends Z.class({
	workflowId: z.string(),
	workflowName: z.string().optional(),
	executionId: z.string().optional(),
	pid: z.number().optional(),
	memory: z.number().nonnegative(),
	cpu: z.number().min(0).max(100),
	uptime: z.number().nonnegative(),
	status: z.enum(['running', 'waiting', 'completed', 'error', 'canceled']),
	executionTime: z.number().nonnegative().optional(),
	nodeExecutions: z.number().nonnegative().optional(),
}) {}

// Resource Alert Definition
export class ResourceAlertDto extends Z.class({
	id: z.string(),
	type: z.enum(['cpu', 'memory', 'disk', 'workflow', 'system']),
	severity: z.enum(['info', 'warning', 'critical']),
	message: z.string(),
	threshold: z.number(),
	currentValue: z.number(),
	resourcePath: z.string().optional(),
	workflowId: z.string().optional(),
	timestamp: z.string().datetime(),
	resolved: z.boolean().default(false),
	resolvedAt: z.string().datetime().optional(),
}) {}

// System Health Status
export class SystemHealthDto extends Z.class({
	healthy: z.boolean(),
	overallScore: z.number().min(0).max(100),
	components: z.object({
		cpu: z.object({
			healthy: z.boolean(),
			score: z.number().min(0).max(100),
			issues: z.array(z.string()),
		}),
		memory: z.object({
			healthy: z.boolean(),
			score: z.number().min(0).max(100),
			issues: z.array(z.string()),
		}),
		disk: z.object({
			healthy: z.boolean(),
			score: z.number().min(0).max(100),
			issues: z.array(z.string()),
		}),
		network: z
			.object({
				healthy: z.boolean(),
				score: z.number().min(0).max(100),
				issues: z.array(z.string()),
			})
			.optional(),
		workflows: z.object({
			healthy: z.boolean(),
			score: z.number().min(0).max(100),
			issues: z.array(z.string()),
		}),
	}),
	recommendations: z.array(z.string()),
	alerts: z.array(ResourceAlertDto),
}) {}

// Enhanced System Metrics
export class EnhancedSystemMetricsDto extends Z.class({
	cpu: z.instanceof(EnhancedCpuMetricsDto),
	memory: z.instanceof(EnhancedMemoryMetricsDto),
	disk: z.instanceof(EnhancedDiskMetricsDto),
	network: z.instanceof(NetworkMetricsDto).optional(),
	uptime: z.number().nonnegative(),
	platform: z.string(),
	architecture: z.string(),
	nodeVersion: z.string(),
}) {}

// Enhanced System Resources Response
export class EnhancedSystemResourcesDto extends Z.class({
	timestamp: z.string().datetime(),
	system: z.instanceof(EnhancedSystemMetricsDto),
	processes: z.object({
		main: z.object({
			pid: z.number(),
			memory: z.number().nonnegative(),
			cpu: z.number().min(0).max(100),
			uptime: z.number().nonnegative(),
		}),
		workers: z
			.array(
				z.object({
					pid: z.number(),
					memory: z.number().nonnegative(),
					cpu: z.number().min(0).max(100),
					type: z.enum(['worker', 'task-runner']),
					uptime: z.number().nonnegative(),
				}),
			)
			.optional(),
	}),
	workflows: z.array(WorkflowProcessMetricsDto).optional(),
	queue: z
		.object({
			waiting: z.number().nonnegative(),
			active: z.number().nonnegative(),
			completed: z.number().nonnegative(),
			failed: z.number().nonnegative(),
			delayed: z.number().nonnegative().optional(),
			paused: z.number().nonnegative().optional(),
		})
		.optional(),
	health: z.instanceof(SystemHealthDto),
}) {}

// Monitoring Configuration
export class MonitoringConfigDto extends Z.class({
	enabled: z.boolean().default(true),
	interval: z.number().positive().default(30000),
	retentionPeriod: z
		.number()
		.positive()
		.default(7 * 24 * 60 * 60 * 1000), // 7 days
	alerts: z.object({
		enabled: z.boolean().default(true),
		thresholds: z.object({
			cpu: z.object({
				warning: z.number().min(0).max(100).default(80),
				critical: z.number().min(0).max(100).default(90),
			}),
			memory: z.object({
				warning: z.number().min(0).max(100).default(85),
				critical: z.number().min(0).max(100).default(95),
			}),
			disk: z.object({
				warning: z.number().min(0).max(100).default(85),
				critical: z.number().min(0).max(100).default(95),
			}),
			workflow: z.object({
				maxExecutionTime: z.number().positive().default(300000), // 5 minutes
				maxMemoryUsage: z
					.number()
					.positive()
					.default(512 * 1024 * 1024), // 512MB
			}),
		}),
		notifications: z.object({
			email: z.boolean().default(false),
			webhook: z.boolean().default(false),
			webhookUrl: z.string().url().optional(),
		}),
	}),
	metrics: z.object({
		prometheus: z.boolean().default(true),
		detailed: z.boolean().default(false),
		includeWorkflowMetrics: z.boolean().default(true),
		includeSystemMetrics: z.boolean().default(true),
	}),
}) {}

// Request DTOs
export class SystemMonitoringRequestDto extends Z.class({
	includeWorkers: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	includeQueue: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	includeWorkflows: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	includeNetworking: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	includeDetailed: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
}) {}

export class AlertsQueryDto extends Z.class({
	severity: z.enum(['info', 'warning', 'critical']).optional(),
	type: z.enum(['cpu', 'memory', 'disk', 'workflow', 'system']).optional(),
	resolved: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	limit: z
		.string()
		.optional()
		.transform((val) => parseInt(val ?? '50', 10)),
	offset: z
		.string()
		.optional()
		.transform((val) => parseInt(val ?? '0', 10)),
	workflowId: z.string().optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
}) {}

export class WorkflowMetricsQueryDto extends Z.class({
	workflowId: z.string().optional(),
	timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h'),
	includeExecutions: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	includeResources: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	limit: z
		.string()
		.optional()
		.transform((val) => parseInt(val ?? '100', 10)),
}) {}

// Historical Data DTOs
export class SystemMetricsHistoryDto extends Z.class({
	timestamps: z.array(z.string().datetime()),
	cpu: z.array(z.number().min(0).max(100)),
	memory: z.array(z.number().min(0).max(100)),
	disk: z.array(z.number().min(0).max(100)),
	activeWorkflows: z.array(z.number().nonnegative()),
	queueSize: z.array(z.number().nonnegative()).optional(),
}) {}

export class WorkflowMetricsHistoryDto extends Z.class({
	workflowId: z.string(),
	workflowName: z.string(),
	timeRange: z.string(),
	executions: z.array(
		z.object({
			executionId: z.string(),
			timestamp: z.string().datetime(),
			duration: z.number().nonnegative(),
			status: z.enum(['success', 'error', 'canceled']),
			memoryUsage: z.number().nonnegative(),
			cpuUsage: z.number().min(0).max(100),
			nodeCount: z.number().nonnegative(),
		}),
	),
	aggregates: z.object({
		totalExecutions: z.number().nonnegative(),
		successRate: z.number().min(0).max(100),
		averageDuration: z.number().nonnegative(),
		averageMemoryUsage: z.number().nonnegative(),
		averageCpuUsage: z.number().min(0).max(100),
		peakMemoryUsage: z.number().nonnegative(),
		peakCpuUsage: z.number().min(0).max(100),
	}),
}) {}

// Alert Management DTOs
export class CreateAlertRuleDto extends Z.class({
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	type: z.enum(['cpu', 'memory', 'disk', 'workflow', 'system']),
	metric: z.string(),
	operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
	threshold: z.number(),
	severity: z.enum(['info', 'warning', 'critical']),
	enabled: z.boolean().default(true),
	workflowId: z.string().optional(),
	notifications: z
		.object({
			email: z.boolean().default(false),
			webhook: z.boolean().default(false),
			webhookUrl: z.string().url().optional(),
		})
		.optional(),
}) {}

export class UpdateAlertRuleDto extends Z.class({
	name: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	threshold: z.number().optional(),
	severity: z.enum(['info', 'warning', 'critical']).optional(),
	enabled: z.boolean().optional(),
	notifications: z
		.object({
			email: z.boolean().optional(),
			webhook: z.boolean().optional(),
			webhookUrl: z.string().url().optional(),
		})
		.optional(),
}) {}

export class AlertRuleDto extends Z.class({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	type: z.enum(['cpu', 'memory', 'disk', 'workflow', 'system']),
	metric: z.string(),
	operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
	threshold: z.number(),
	severity: z.enum(['info', 'warning', 'critical']),
	enabled: z.boolean(),
	workflowId: z.string().optional(),
	notifications: z.object({
		email: z.boolean(),
		webhook: z.boolean(),
		webhookUrl: z.string().optional(),
	}),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	lastTriggered: z.string().datetime().optional(),
	triggerCount: z.number().nonnegative(),
}) {}

// Response wrappers
export class AlertsResponseDto extends Z.class({
	alerts: z.array(ResourceAlertDto),
	total: z.number().nonnegative(),
	unresolved: z.number().nonnegative(),
	bySeverity: z.object({
		info: z.number().nonnegative(),
		warning: z.number().nonnegative(),
		critical: z.number().nonnegative(),
	}),
	pagination: z.object({
		limit: z.number().positive(),
		offset: z.number().nonnegative(),
		total: z.number().nonnegative(),
	}),
}) {}

export class AlertRulesResponseDto extends Z.class({
	rules: z.array(AlertRuleDto),
	total: z.number().nonnegative(),
	enabled: z.number().nonnegative(),
}) {}

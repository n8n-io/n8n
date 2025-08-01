import { z } from 'zod';
import { Z } from 'zod-class';

export class TimeRangeDto extends Z.class({
	start: z.string().datetime(),
	end: z.string().datetime(),
}) {}

export class MetricFiltersDto extends Z.class({
	workflowId: z.string().optional(),
	status: z
		.array(z.enum(['new', 'running', 'success', 'error', 'canceled', 'crashed', 'waiting']))
		.optional(),
}) {}

export class ExecutionCountsDto extends Z.class({
	total: z.number(),
	success: z.number(),
	failed: z.number(),
	running: z.number(),
}) {}

export class TimingMetricsDto extends Z.class({
	averageDuration: z.number(),
	medianDuration: z.number(),
	p95Duration: z.number(),
	p99Duration: z.number(),
}) {}

export class ResourceUsageMetricsDto extends Z.class({
	averageMemory: z.number(),
	peakMemory: z.number(),
	averageCpu: z.number(),
}) {}

export class TrendDataPointDto extends Z.class({
	timestamp: z.string().datetime(),
	executionCount: z.number(),
	averageDuration: z.number(),
	errorRate: z.number(),
}) {}

export class PerformanceDataDto extends Z.class({
	executionCounts: z.instanceof(ExecutionCountsDto),
	timing: z.instanceof(TimingMetricsDto),
	resourceUsage: z.instanceof(ResourceUsageMetricsDto),
	trends: z.array(z.instanceof(TrendDataPointDto)),
}) {}

export class PerformanceMetricsDto extends Z.class({
	timeRange: z.instanceof(TimeRangeDto),
	filters: z.instanceof(MetricFiltersDto),
	metrics: z.instanceof(PerformanceDataDto),
}) {}

export class PerformanceMetricsRequestDto extends Z.class({
	timeRange: z.string().optional(), // '1h', '24h', '7d', '30d'
	workflowId: z.string().optional(),
	status: z.string().optional(), // comma-separated ExecutionStatus values
	startDate: z.string().optional(), // ISO date string
	endDate: z.string().optional(), // ISO date string
	granularity: z.string().optional(), // 'hour', 'day', 'minute'
}) {}

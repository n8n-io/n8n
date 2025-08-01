import { z } from 'zod';
import { Z } from 'zod-class';

export const enum ExecutionStatus {
	new = 'new',
	running = 'running',
	success = 'success',
	error = 'error',
	canceled = 'canceled',
	crashed = 'crashed',
	waiting = 'waiting',
}

export const enum NodeExecutionStatus {
	success = 'success',
	error = 'error',
	waiting = 'waiting',
}

export const enum BottleneckSeverity {
	low = 'low',
	medium = 'medium',
	high = 'high',
}

export const enum BottleneckIssue {
	slowExecution = 'slow_execution',
	highMemory = 'high_memory',
	largeDataset = 'large_dataset',
}

export class ExecutionTimingDto extends Z.class({
	startedAt: z.string().datetime(),
	finishedAt: z.string().datetime().optional(),
	duration: z.number().optional(),
	queueTime: z.number().optional(),
}) {}

export class ResourceUtilizationDto extends Z.class({
	cpuPercent: z.number().optional(),
	memoryMB: z.number().optional(),
	ioOperations: z.number().optional(),
}) {}

export class NodeExecutionDto extends Z.class({
	nodeId: z.string(),
	nodeType: z.string(),
	duration: z.number(),
	memoryUsage: z.number().optional(),
	inputItems: z.number(),
	outputItems: z.number(),
	status: z.enum(['success', 'error', 'waiting']),
}) {}

export class ExecutionPerformanceDto extends Z.class({
	nodeExecutions: z.array(z.instanceof(NodeExecutionDto)),
	totalMemoryPeak: z.number().optional(),
	resourceUtilization: z.instanceof(ResourceUtilizationDto),
}) {}

export class BottleneckDto extends Z.class({
	nodeId: z.string(),
	issue: z.enum(['slow_execution', 'high_memory', 'large_dataset']),
	severity: z.enum(['low', 'medium', 'high']),
	suggestion: z.string(),
}) {}

export class ExecutionProfileDto extends Z.class({
	executionId: z.string(),
	workflowId: z.string(),
	status: z.enum(['new', 'running', 'success', 'error', 'canceled', 'crashed', 'waiting']),
	timing: z.instanceof(ExecutionTimingDto),
	performance: z.instanceof(ExecutionPerformanceDto),
	bottlenecks: z.array(z.instanceof(BottleneckDto)),
}) {}

export class ExecutionProfileRequestDto extends Z.class({
	includeBottlenecks: z.string().optional(), // 'true' | 'false'
	includeResourceMetrics: z.string().optional(), // 'true' | 'false'
}) {}

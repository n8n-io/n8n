import { z } from 'zod';
import { Z } from 'zod-class';

export enum ExecutionStatus {
	NEW = 'new',
	RUNNING = 'running',
	SUCCESS = 'success',
	ERROR = 'error',
	CANCELED = 'canceled',
	CRASHED = 'crashed',
	WAITING = 'waiting',
}

export enum NodeExecutionStatus {
	SUCCESS = 'success',
	ERROR = 'error',
	WAITING = 'waiting',
}

export enum BottleneckSeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
}

export enum BottleneckIssue {
	SLOW_EXECUTION = 'slow_execution',
	HIGH_MEMORY = 'high_memory',
	LARGE_DATASET = 'large_dataset',
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
	status: z.nativeEnum(NodeExecutionStatus),
}) {}

export class ExecutionPerformanceDto extends Z.class({
	nodeExecutions: z.array(z.instanceof(NodeExecutionDto)),
	totalMemoryPeak: z.number().optional(),
	resourceUtilization: z.instanceof(ResourceUtilizationDto),
}) {}

export class BottleneckDto extends Z.class({
	nodeId: z.string(),
	issue: z.nativeEnum(BottleneckIssue),
	severity: z.nativeEnum(BottleneckSeverity),
	suggestion: z.string(),
}) {}

export class ExecutionProfileDto extends Z.class({
	executionId: z.string(),
	workflowId: z.string(),
	status: z.nativeEnum(ExecutionStatus),
	timing: z.instanceof(ExecutionTimingDto),
	performance: z.instanceof(ExecutionPerformanceDto),
	bottlenecks: z.array(z.instanceof(BottleneckDto)),
}) {}

export class ExecutionProfileRequestDto extends Z.class({
	includeBottlenecks: z.string().optional(), // 'true' | 'false'
	includeResourceMetrics: z.string().optional(), // 'true' | 'false'
}) {}

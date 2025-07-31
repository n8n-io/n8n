import {
	IsString,
	IsOptional,
	IsNumber,
	IsArray,
	ValidateNested,
	IsEnum,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class ExecutionTimingDto {
	@IsDateString()
	startedAt: string;

	@IsOptional()
	@IsDateString()
	finishedAt?: string;

	@IsOptional()
	@IsNumber()
	duration?: number;

	@IsOptional()
	@IsNumber()
	queueTime?: number;
}

export class ResourceUtilizationDto {
	@IsOptional()
	@IsNumber()
	cpuPercent?: number;

	@IsOptional()
	@IsNumber()
	memoryMB?: number;

	@IsOptional()
	@IsNumber()
	ioOperations?: number;
}

export class NodeExecutionDto {
	@IsString()
	nodeId: string;

	@IsString()
	nodeType: string;

	@IsNumber()
	duration: number;

	@IsOptional()
	@IsNumber()
	memoryUsage?: number;

	@IsNumber()
	inputItems: number;

	@IsNumber()
	outputItems: number;

	@IsEnum(NodeExecutionStatus)
	status: NodeExecutionStatus;
}

export class ExecutionPerformanceDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => NodeExecutionDto)
	nodeExecutions: NodeExecutionDto[];

	@IsOptional()
	@IsNumber()
	totalMemoryPeak?: number;

	@ValidateNested()
	@Type(() => ResourceUtilizationDto)
	resourceUtilization: ResourceUtilizationDto;
}

export class BottleneckDto {
	@IsString()
	nodeId: string;

	@IsEnum(BottleneckIssue)
	issue: BottleneckIssue;

	@IsEnum(BottleneckSeverity)
	severity: BottleneckSeverity;

	@IsString()
	suggestion: string;
}

export class ExecutionProfileDto {
	@IsString()
	executionId: string;

	@IsString()
	workflowId: string;

	@IsEnum(ExecutionStatus)
	status: ExecutionStatus;

	@ValidateNested()
	@Type(() => ExecutionTimingDto)
	timing: ExecutionTimingDto;

	@ValidateNested()
	@Type(() => ExecutionPerformanceDto)
	performance: ExecutionPerformanceDto;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => BottleneckDto)
	bottlenecks: BottleneckDto[];
}

export class ExecutionProfileRequestDto {
	@IsOptional()
	@IsString()
	includeBottlenecks?: string; // 'true' | 'false'

	@IsOptional()
	@IsString()
	includeResourceMetrics?: string; // 'true' | 'false'
}

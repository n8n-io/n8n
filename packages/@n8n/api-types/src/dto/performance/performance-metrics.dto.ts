import {
	IsString,
	IsNumber,
	IsOptional,
	IsArray,
	ValidateNested,
	IsDateString,
	IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExecutionStatus } from './execution-profile.dto';

export class TimeRangeDto {
	@IsDateString()
	start: string;

	@IsDateString()
	end: string;
}

export class MetricFiltersDto {
	@IsOptional()
	@IsString()
	workflowId?: string;

	@IsOptional()
	@IsArray()
	@IsEnum(ExecutionStatus, { each: true })
	status?: ExecutionStatus[];
}

export class ExecutionCountsDto {
	@IsNumber()
	total: number;

	@IsNumber()
	success: number;

	@IsNumber()
	failed: number;

	@IsNumber()
	running: number;
}

export class TimingMetricsDto {
	@IsNumber()
	averageDuration: number;

	@IsNumber()
	medianDuration: number;

	@IsNumber()
	p95Duration: number;

	@IsNumber()
	p99Duration: number;
}

export class ResourceUsageMetricsDto {
	@IsNumber()
	averageMemory: number;

	@IsNumber()
	peakMemory: number;

	@IsNumber()
	averageCpu: number;
}

export class TrendDataPointDto {
	@IsDateString()
	timestamp: string;

	@IsNumber()
	executionCount: number;

	@IsNumber()
	averageDuration: number;

	@IsNumber()
	errorRate: number;
}

export class PerformanceDataDto {
	@ValidateNested()
	@Type(() => ExecutionCountsDto)
	executionCounts: ExecutionCountsDto;

	@ValidateNested()
	@Type(() => TimingMetricsDto)
	timing: TimingMetricsDto;

	@ValidateNested()
	@Type(() => ResourceUsageMetricsDto)
	resourceUsage: ResourceUsageMetricsDto;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => TrendDataPointDto)
	trends: TrendDataPointDto[];
}

export class PerformanceMetricsDto {
	@ValidateNested()
	@Type(() => TimeRangeDto)
	timeRange: TimeRangeDto;

	@ValidateNested()
	@Type(() => MetricFiltersDto)
	filters: MetricFiltersDto;

	@ValidateNested()
	@Type(() => PerformanceDataDto)
	metrics: PerformanceDataDto;
}

export class PerformanceMetricsRequestDto {
	@IsOptional()
	@IsString()
	timeRange?: string; // '1h', '24h', '7d', '30d'

	@IsOptional()
	@IsString()
	workflowId?: string;

	@IsOptional()
	@IsString()
	status?: string; // comma-separated ExecutionStatus values

	@IsOptional()
	@IsString()
	startDate?: string; // ISO date string

	@IsOptional()
	@IsString()
	endDate?: string; // ISO date string

	@IsOptional()
	@IsString()
	granularity?: string; // 'hour', 'day', 'minute'
}

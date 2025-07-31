import {
	IsString,
	IsNumber,
	IsOptional,
	IsArray,
	ValidateNested,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CpuMetricsDto {
	@IsNumber()
	usage: number;

	@IsNumber()
	cores: number;

	@IsArray()
	@IsNumber({ allowNaN: false }, { each: true })
	load: [number, number, number];
}

export class MemoryMetricsDto {
	@IsNumber()
	total: number;

	@IsNumber()
	used: number;

	@IsNumber()
	free: number;

	@IsNumber()
	usagePercent: number;
}

export class DiskMetricsDto {
	@IsNumber()
	total: number;

	@IsNumber()
	used: number;

	@IsNumber()
	free: number;

	@IsNumber()
	usagePercent: number;
}

export class SystemMetricsDto {
	@ValidateNested()
	@Type(() => CpuMetricsDto)
	cpu: CpuMetricsDto;

	@ValidateNested()
	@Type(() => MemoryMetricsDto)
	memory: MemoryMetricsDto;

	@ValidateNested()
	@Type(() => DiskMetricsDto)
	disk: DiskMetricsDto;
}

export class ProcessMetricsDto {
	@IsNumber()
	pid: number;

	@IsNumber()
	memory: number;

	@IsNumber()
	cpu: number;

	@IsNumber()
	uptime: number;
}

export class WorkerProcessDto {
	@IsNumber()
	pid: number;

	@IsNumber()
	memory: number;

	@IsNumber()
	cpu: number;

	@IsString()
	type: 'worker' | 'task-runner';
}

export class ProcessesDto {
	@ValidateNested()
	@Type(() => ProcessMetricsDto)
	main: ProcessMetricsDto;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => WorkerProcessDto)
	workers?: WorkerProcessDto[];
}

export class QueueMetricsDto {
	@IsNumber()
	waiting: number;

	@IsNumber()
	active: number;

	@IsNumber()
	completed: number;

	@IsNumber()
	failed: number;
}

export class SystemResourcesDto {
	@IsDateString()
	timestamp: string;

	@ValidateNested()
	@Type(() => SystemMetricsDto)
	system: SystemMetricsDto;

	@ValidateNested()
	@Type(() => ProcessesDto)
	processes: ProcessesDto;

	@IsOptional()
	@ValidateNested()
	@Type(() => QueueMetricsDto)
	queue?: QueueMetricsDto;
}

export class SystemResourcesRequestDto {
	@IsOptional()
	@IsString()
	includeWorkers?: string; // 'true' | 'false'

	@IsOptional()
	@IsString()
	includeQueue?: string; // 'true' | 'false'
}

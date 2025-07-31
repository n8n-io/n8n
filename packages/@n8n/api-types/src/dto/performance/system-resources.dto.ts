import { z } from 'zod';
import { Z } from 'zod-class';

export class CpuMetricsDto extends Z.class({
	usage: z.number(),
	cores: z.number(),
	load: z.tuple([z.number(), z.number(), z.number()]),
}) {}

export class MemoryMetricsDto extends Z.class({
	total: z.number(),
	used: z.number(),
	free: z.number(),
	usagePercent: z.number(),
}) {}

export class DiskMetricsDto extends Z.class({
	total: z.number(),
	used: z.number(),
	free: z.number(),
	usagePercent: z.number(),
}) {}

export class SystemMetricsDto extends Z.class({
	cpu: z.instanceof(CpuMetricsDto),
	memory: z.instanceof(MemoryMetricsDto),
	disk: z.instanceof(DiskMetricsDto),
}) {}

export class ProcessMetricsDto extends Z.class({
	pid: z.number(),
	memory: z.number(),
	cpu: z.number(),
	uptime: z.number(),
}) {}

export class WorkerProcessDto extends Z.class({
	pid: z.number(),
	memory: z.number(),
	cpu: z.number(),
	type: z.enum(['worker', 'task-runner']),
}) {}

export class ProcessesDto extends Z.class({
	main: z.instanceof(ProcessMetricsDto),
	workers: z.array(z.instanceof(WorkerProcessDto)).optional(),
}) {}

export class QueueMetricsDto extends Z.class({
	waiting: z.number(),
	active: z.number(),
	completed: z.number(),
	failed: z.number(),
}) {}

export class SystemResourcesDto extends Z.class({
	timestamp: z.string().datetime(),
	system: z.instanceof(SystemMetricsDto),
	processes: z.instanceof(ProcessesDto),
	queue: z.instanceof(QueueMetricsDto).optional(),
}) {}

export class SystemResourcesRequestDto extends Z.class({
	includeWorkers: z.string().optional(), // 'true' | 'false'
	includeQueue: z.string().optional(), // 'true' | 'false'
}) {}

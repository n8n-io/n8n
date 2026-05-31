import type { AgentTaskDto, CreateAgentTaskDto, UpdateAgentTaskDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { CronTime } from 'cron';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentTask } from './entities/agent-task.entity';
import { isValidCronExpression } from './integrations/cron-validation';
import { AgentTaskRepository } from './repositories/agent-task.repository';

/**
 * CRUD for an agent's scheduled tasks. Owns validation and the entity -> DTO
 * mapping (including the computed `nextRunAt`). Cron registration and firing
 * live in the scheduling layer (added separately) and hook into the mutation
 * methods here.
 */
@Service()
export class AgentTaskService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly taskRepository: AgentTaskRepository,
	) {}

	async list(agentId: string): Promise<AgentTaskDto[]> {
		const tasks = await this.taskRepository.findByAgentId(agentId);
		return tasks.map((task) => this.toDto(task));
	}

	async create(agentId: string, dto: CreateAgentTaskDto): Promise<AgentTaskDto> {
		this.assertValidCron(dto.cronExpression);

		const task = await this.taskRepository.save({
			agentId,
			name: dto.name,
			objective: dto.objective,
			cronExpression: dto.cronExpression,
			enabled: dto.enabled,
		});

		this.logger.debug('[AgentTaskService] Created task', { agentId, taskId: task.id });
		return this.toDto(task);
	}

	async update(agentId: string, taskId: string, dto: UpdateAgentTaskDto): Promise<AgentTaskDto> {
		const task = await this.getOrThrow(agentId, taskId);

		if (dto.cronExpression !== undefined) {
			this.assertValidCron(dto.cronExpression);
			task.cronExpression = dto.cronExpression;
		}
		if (dto.name !== undefined) task.name = dto.name;
		if (dto.objective !== undefined) task.objective = dto.objective;
		if (dto.enabled !== undefined) task.enabled = dto.enabled;

		const saved = await this.taskRepository.save(task);
		return this.toDto(saved);
	}

	async setEnabled(agentId: string, taskId: string, enabled: boolean): Promise<AgentTaskDto> {
		const task = await this.getOrThrow(agentId, taskId);
		task.enabled = enabled;
		const saved = await this.taskRepository.save(task);
		return this.toDto(saved);
	}

	async delete(agentId: string, taskId: string): Promise<void> {
		const task = await this.getOrThrow(agentId, taskId);
		await this.taskRepository.remove(task);
		this.logger.debug('[AgentTaskService] Deleted task', { agentId, taskId });
	}

	private async getOrThrow(agentId: string, taskId: string): Promise<AgentTask> {
		const task = await this.taskRepository.findByIdAndAgentId(taskId, agentId);
		if (!task) {
			throw new NotFoundError(`Task "${taskId}" not found`);
		}
		return task;
	}

	private assertValidCron(cronExpression: string): void {
		if (!isValidCronExpression(cronExpression)) {
			throw new BadRequestError('Invalid cron expression');
		}
	}

	/**
	 * Next fire time as an ISO string, or null when the task is disabled or the
	 * cron can't be parsed. Computed in the instance timezone.
	 */
	private computeNextRunAt(cronExpression: string, enabled: boolean): string | null {
		if (!enabled) return null;
		try {
			return new CronTime(cronExpression, this.globalConfig.generic.timezone)
				.sendAt()
				.toJSDate()
				.toISOString();
		} catch {
			return null;
		}
	}

	private toDto(task: AgentTask): AgentTaskDto {
		return {
			id: task.id,
			name: task.name,
			objective: task.objective,
			cronExpression: task.cronExpression,
			enabled: task.enabled,
			nextRunAt: this.computeNextRunAt(task.cronExpression, task.enabled),
			lastRunAt: task.lastRunAt ? task.lastRunAt.toISOString() : null,
			lastRunStatus: task.lastRunStatus,
			createdAt: task.createdAt.toISOString(),
			updatedAt: task.updatedAt.toISOString(),
		};
	}
}

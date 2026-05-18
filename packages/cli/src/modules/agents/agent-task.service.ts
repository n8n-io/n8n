import type {
	AgentTaskDto,
	CreateAgentTaskDto,
	RunAgentTaskResponse,
	UpdateAgentTaskDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ProjectRelationRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { CronJob } from 'cron';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsService } from './agents.service';
import type { Agent } from './entities/agent.entity';
import type { AgentTask } from './entities/agent-task.entity';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { isValidCronExpression } from './integrations/cron-validation';

const AGENT_TASK_SOURCE = 'task';
const AGENT_TASK_MEMORY_RESOURCE_PREFIX = 'agent-task:';

@Service()
export class AgentTaskService {
	private readonly jobs = new Map<string, CronJob>();

	private readonly taskAgentIds = new Map<string, string>();

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly agentRepository: AgentRepository,
		private readonly agentsService: AgentsService,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	async list(projectId: string, agentId: string): Promise<AgentTaskDto[]> {
		await this.getAgentOrThrow(projectId, agentId);
		const tasks = await this.agentTaskRepository.findByAgent(projectId, agentId);
		return tasks.map((task) => this.toDto(task));
	}

	async create(
		projectId: string,
		agentId: string,
		payload: CreateAgentTaskDto,
	): Promise<AgentTaskDto> {
		const agent = await this.getAgentOrThrow(projectId, agentId);
		const taskId = randomUUID();
		const task = this.agentTaskRepository.create({
			id: taskId,
			agentId,
			projectId,
			name: this.normalizeName(payload.name),
			goal: this.normalizeGoal(payload.goal),
			cronExpression: this.normalizeCronExpression(payload.cronExpression),
			active: payload.active ?? false,
			lastRunAt: null,
		});

		this.assertTaskCanBeSaved(task, agent);

		const saved = await this.agentTaskRepository.save(task);
		await this.syncRegistration(saved);
		this.logger.info('[AgentTaskService] Created task', {
			agentId,
			projectId,
			taskId: saved.id,
			active: saved.active,
		});

		return this.toDto(saved);
	}

	async update(
		projectId: string,
		agentId: string,
		taskId: string,
		payload: UpdateAgentTaskDto,
	): Promise<AgentTaskDto> {
		const task = await this.getTaskOrThrow(projectId, agentId, taskId);
		const agent = task.agent;

		if (payload.name !== undefined) task.name = this.normalizeName(payload.name);
		if (payload.goal !== undefined) task.goal = this.normalizeGoal(payload.goal);
		if (payload.cronExpression !== undefined) {
			task.cronExpression = this.normalizeCronExpression(payload.cronExpression);
		}
		if (payload.active !== undefined) task.active = payload.active;

		this.assertTaskCanBeSaved(task, agent);

		const saved = await this.agentTaskRepository.save(task);
		await this.syncRegistration(saved);
		this.logger.info('[AgentTaskService] Updated task', {
			agentId,
			projectId,
			taskId: saved.id,
			active: saved.active,
		});

		return this.toDto(saved);
	}

	async delete(projectId: string, agentId: string, taskId: string): Promise<void> {
		const task = await this.getTaskOrThrow(projectId, agentId, taskId);
		this.deregister(task.id);
		await this.agentTaskRepository.remove(task);
		this.logger.info('[AgentTaskService] Deleted task', { agentId, projectId, taskId });
	}

	async runNow(projectId: string, agentId: string, taskId: string): Promise<RunAgentTaskResponse> {
		const task = await this.getTaskOrThrow(projectId, agentId, taskId);
		if (!task.agent.publishedVersion) {
			throw new ConflictError(`Agent "${agentId}" must be published before running a task`);
		}

		const threadId = randomUUID();
		void this.runTask(task.id, { requireActive: false, threadId }).catch((error) => {
			this.logger.error('[AgentTaskService] Manual task run failed', {
				agentId,
				projectId,
				taskId,
				error: error instanceof Error ? error.message : String(error),
			});
		});

		return { threadId, status: 'started' };
	}

	@OnLeaderTakeover()
	async reconnectAll(): Promise<void> {
		const tasks = await this.agentTaskRepository.findActiveWithAgents();
		this.logger.debug('[AgentTaskService] Reconnecting active tasks', {
			activeTaskCount: tasks.length,
		});

		for (const task of tasks) {
			try {
				await this.registerOrRefresh(task);
			} catch (error) {
				this.logger.error('[AgentTaskService] Failed to reconnect task', {
					agentId: task.agentId,
					projectId: task.projectId,
					taskId: task.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	async deactivateForAgent(agentId: string): Promise<void> {
		await this.agentTaskRepository.update({ agentId }, { active: false });
		this.deregisterForAgent(agentId);
	}

	deregisterForAgent(agentId: string): void {
		for (const [taskId, registeredAgentId] of this.taskAgentIds) {
			if (registeredAgentId === agentId) {
				this.deregister(taskId);
			}
		}
	}

	async registerOrRefresh(task: AgentTask): Promise<void> {
		const current = task.agent?.publishedVersion
			? task
			: await this.agentTaskRepository.findWithAgent(task.id);
		if (!current) {
			this.deregister(task.id);
			return;
		}

		if (!current.active) {
			this.deregister(current.id);
			return;
		}

		if (!current.agent.publishedVersion) {
			this.logger.warn('[AgentTaskService] Skipping task registration for unpublished agent', {
				agentId: current.agentId,
				projectId: current.projectId,
				taskId: current.id,
			});
			this.deregister(current.id);
			return;
		}

		this.assertCronExpressionIsValid(current.cronExpression);
		this.deregister(current.id);

		const timezone = this.globalConfig.generic.timezone;
		const job = new CronJob(
			current.cronExpression,
			() => {
				void this.runTask(current.id);
			},
			null,
			false,
			timezone,
		);

		job.start();
		this.jobs.set(current.id, job);
		this.taskAgentIds.set(current.id, current.agentId);
		this.logger.info('[AgentTaskService] Registered task', {
			agentId: current.agentId,
			projectId: current.projectId,
			taskId: current.id,
			cronExpression: current.cronExpression,
			timezone,
		});
	}

	deregister(taskId: string): void {
		const existing = this.jobs.get(taskId);
		if (!existing) {
			this.taskAgentIds.delete(taskId);
			return;
		}

		void existing.stop();
		this.jobs.delete(taskId);
		this.taskAgentIds.delete(taskId);
		this.logger.info('[AgentTaskService] Deregistered task', { taskId });
	}

	@OnLeaderStepdown()
	@OnShutdown()
	stopAll(): void {
		for (const [taskId] of this.jobs) {
			this.deregister(taskId);
		}
	}

	async runTask(
		taskId: string,
		options: { requireActive?: boolean; threadId?: string } = {},
	): Promise<void> {
		const requireActive = options.requireActive ?? true;
		let agentId: string | undefined;
		let projectId: string | undefined;
		const threadId = options.threadId ?? randomUUID();
		const startedAt = Date.now();

		try {
			const task = await this.agentTaskRepository.findWithAgent(taskId);
			if (!task) {
				this.logger.warn('[AgentTaskService] Task fired but no task row was found', { taskId });
				this.deregister(taskId);
				return;
			}

			agentId = task.agentId;
			projectId = task.projectId;

			if (requireActive && !task.active) {
				this.logger.warn('[AgentTaskService] Task fired while inactive', {
					agentId,
					projectId,
					taskId,
				});
				this.deregister(taskId);
				return;
			}

			if (!task.agent.publishedVersion) {
				this.logger.warn('[AgentTaskService] Task fired for unpublished agent', {
					agentId,
					projectId,
					taskId,
				});
				this.deregister(taskId);
				return;
			}

			if (!(await this.hasExecutionUser(task.agent))) {
				this.logger.warn('[AgentTaskService] No project member available for task run', {
					agentId,
					projectId,
					taskId,
				});
				return;
			}

			const timezone = this.globalConfig.generic.timezone;
			const timestamp = DateTime.now().setZone(timezone).toISO() ?? new Date().toISOString();
			const message = [
				`Task: ${task.name}`,
				`Goal:\n${task.goal}`,
				`Current date and time: ${timestamp} (timezone: ${timezone})`,
			].join('\n\n');

			await this.agentTaskRepository.update(task.id, { lastRunAt: new Date() });

			this.logger.info('[AgentTaskService] Task run started', {
				agentId,
				projectId,
				taskId,
				threadId,
				timezone,
			});

			let chunkCount = 0;
			for await (const _chunk of this.agentsService.executeForTaskPublished({
				agentId: task.agentId,
				projectId: task.projectId,
				message,
				memory: {
					threadId,
					resourceId: `${AGENT_TASK_MEMORY_RESOURCE_PREFIX}${task.id}`,
				},
			})) {
				chunkCount += 1;
			}

			this.logger.info('[AgentTaskService] Task run completed', {
				agentId,
				projectId,
				taskId,
				threadId,
				chunkCount,
				durationMs: Date.now() - startedAt,
				source: AGENT_TASK_SOURCE,
			});
		} catch (error) {
			this.logger.error('[AgentTaskService] Task run failed', {
				agentId,
				projectId,
				taskId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}
	}

	private async getAgentOrThrow(projectId: string, agentId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		return agent;
	}

	private async getTaskOrThrow(
		projectId: string,
		agentId: string,
		taskId: string,
	): Promise<AgentTask> {
		const task = await this.agentTaskRepository.findByIdAndAgent(projectId, agentId, taskId);
		if (!task) throw new NotFoundError(`Agent task "${taskId}" not found`);
		return task;
	}

	private async syncRegistration(task: AgentTask): Promise<void> {
		if (task.active) {
			await this.registerOrRefresh(task);
		} else {
			this.deregister(task.id);
		}
	}

	private normalizeName(name: string): string {
		const normalized = name.trim();
		if (!normalized) throw new BadRequestError('Task name is required');
		if (normalized.length > 128) throw new BadRequestError('Task name is too long');
		return normalized;
	}

	private normalizeGoal(goal: string): string {
		const normalized = goal.trim();
		if (!normalized) throw new BadRequestError('Task goal is required');
		if (normalized.length > 10_000) throw new BadRequestError('Task goal is too long');
		return normalized;
	}

	private normalizeCronExpression(cronExpression: string): string {
		const normalized = cronExpression.trim();
		if (!normalized) throw new BadRequestError('Cron expression is required');
		this.assertCronExpressionIsValid(normalized);
		return normalized;
	}

	private assertTaskCanBeSaved(task: AgentTask, agent: Agent): void {
		if (task.agentId !== agent.id || task.projectId !== agent.projectId) {
			throw new NotFoundError(`Agent "${task.agentId}" not found`);
		}

		if (task.active && !agent.publishedVersion) {
			throw new ConflictError(`Agent "${agent.id}" must be published before activating a task`);
		}
	}

	private assertCronExpressionIsValid(cronExpression: string): void {
		if (!isValidCronExpression(cronExpression)) {
			throw new BadRequestError('Invalid cron expression');
		}
	}

	private async hasExecutionUser(agent: Agent): Promise<boolean> {
		const userIds = await this.projectRelationRepository.findUserIdsByProjectId(agent.projectId);
		const publishedById = agent.publishedVersion?.publishedById;
		return !!publishedById && userIds.includes(publishedById);
	}

	private toDto(task: AgentTask): AgentTaskDto {
		return {
			id: task.id,
			agentId: task.agentId,
			projectId: task.projectId,
			name: task.name,
			goal: task.goal,
			cronExpression: task.cronExpression,
			active: task.active,
			lastRunAt: task.lastRunAt ? task.lastRunAt.toISOString() : null,
			createdAt: task.createdAt.toISOString(),
			updatedAt: task.updatedAt.toISOString(),
		};
	}
}

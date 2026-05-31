import type {
	AgentTaskDto,
	AgentTaskRunStatus,
	CreateAgentTaskDto,
	UpdateAgentTaskDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ProjectRelationRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { CronJob, CronTime } from 'cron';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsService } from './agents.service';
import { Agent } from './entities/agent.entity';
import { AgentTask } from './entities/agent-task.entity';
import { isValidCronExpression } from './integrations/cron-validation';
import { AgentRepository } from './repositories/agent.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { taskRunMemoryResourceId } from './utils/agent-memory-scope';

/**
 * Owns an agent's scheduled tasks: CRUD + the entity -> DTO mapping (including
 * the computed `nextRunAt`), plus the cron runtime. One `CronJob` is registered
 * per enabled task of a published agent (leader-only); when it fires, the
 * published agent runs with the task objective and the run is recorded with
 * `source='task'` and the originating `taskId`.
 */
@Service()
export class AgentTaskService {
	/** Live cron jobs keyed by taskId; the agentId is kept so a whole agent's jobs can be stopped. */
	private readonly jobs = new Map<string, { agentId: string; job: CronJob }>();

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly taskRepository: AgentTaskRepository,
		private readonly agentRepository: AgentRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly agentsService: AgentsService,
	) {}

	// ── CRUD ──────────────────────────────────────────────────────────────

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

		await this.reconcile(task);
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
		await this.reconcile(saved);
		return this.toDto(saved);
	}

	async setEnabled(agentId: string, taskId: string, enabled: boolean): Promise<AgentTaskDto> {
		const task = await this.getOrThrow(agentId, taskId);
		task.enabled = enabled;
		const saved = await this.taskRepository.save(task);
		await this.reconcile(saved);
		return this.toDto(saved);
	}

	async delete(agentId: string, taskId: string): Promise<void> {
		const task = await this.getOrThrow(agentId, taskId);
		await this.taskRepository.remove(task);
		this.deregister(taskId);
		this.logger.debug('[AgentTaskService] Deleted task', { agentId, taskId });
	}

	// ── Scheduling lifecycle ──────────────────────────────────────────────

	/** Register every enabled task of an agent — called when the agent is published. */
	async registerEnabledForAgent(agentId: string): Promise<void> {
		const tasks = await this.taskRepository.findByAgentId(agentId);
		for (const task of tasks) {
			if (task.enabled) this.registerOrRefresh(task);
		}
	}

	/** Stop all cron jobs belonging to an agent — called on unpublish/delete. */
	deregisterAgentTasks(agentId: string): void {
		const taskIds = [...this.jobs.entries()]
			.filter(([, entry]) => entry.agentId === agentId)
			.map(([taskId]) => taskId);
		for (const taskId of taskIds) this.deregister(taskId);
	}

	@OnLeaderTakeover()
	async reconnectAll(): Promise<void> {
		const tasks = await this.taskRepository.findSchedulable();
		this.logger.debug('[AgentTaskService] Reconnecting schedulable tasks', { count: tasks.length });
		for (const task of tasks) {
			try {
				this.registerOrRefresh(task);
			} catch (error) {
				this.logger.error('[AgentTaskService] Failed to reconnect task', {
					taskId: task.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	@OnLeaderStepdown()
	@OnShutdown()
	stopAll(): void {
		for (const taskId of [...this.jobs.keys()]) {
			this.deregister(taskId);
		}
	}

	/** Reconcile a single task's cron job against its enabled + published state. Never throws. */
	private async reconcile(task: AgentTask): Promise<void> {
		try {
			if (task.enabled && (await this.isAgentPublished(task.agentId))) {
				this.registerOrRefresh(task);
			} else {
				this.deregister(task.id);
			}
		} catch (error) {
			this.logger.warn('[AgentTaskService] Failed to reconcile task schedule', {
				taskId: task.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private registerOrRefresh(task: AgentTask): void {
		if (!isValidCronExpression(task.cronExpression)) {
			this.logger.warn('[AgentTaskService] Skipping task with invalid cron', { taskId: task.id });
			this.deregister(task.id);
			return;
		}

		this.deregister(task.id);

		const timezone = this.globalConfig.generic.timezone;
		const job = new CronJob(
			task.cronExpression,
			() => void this.runTask(task.id),
			null,
			true,
			timezone,
		);
		this.jobs.set(task.id, { agentId: task.agentId, job });
		this.logger.info('[AgentTaskService] Registered task', {
			taskId: task.id,
			agentId: task.agentId,
			cronExpression: task.cronExpression,
			timezone,
		});
	}

	private deregister(taskId: string): void {
		const existing = this.jobs.get(taskId);
		if (!existing) return;
		void existing.job.stop();
		this.jobs.delete(taskId);
		this.logger.info('[AgentTaskService] Deregistered task', { taskId });
	}

	private async isAgentPublished(agentId: string): Promise<boolean> {
		const agent = await this.agentRepository.findOne({ where: { id: agentId } });
		return Boolean(agent?.activeVersionId);
	}

	// ── Run ───────────────────────────────────────────────────────────────

	private async runTask(taskId: string): Promise<void> {
		const startedAt = Date.now();
		let agentId: string | undefined;
		let projectId: string | undefined;

		try {
			const task = await this.taskRepository.findOne({ where: { id: taskId } });
			if (!task) {
				this.logger.warn('[AgentTaskService] Task fired for missing task', { taskId });
				this.deregister(taskId);
				return;
			}
			agentId = task.agentId;

			const agent = await this.agentRepository.findOne({
				where: { id: task.agentId },
				relations: { activeVersion: true },
			});
			if (!agent) {
				this.deregister(taskId);
				return;
			}
			projectId = agent.projectId;

			if (!agent.activeVersionId) {
				this.logger.warn('[AgentTaskService] Task fired for unpublished agent', {
					taskId,
					agentId,
				});
				this.deregister(taskId);
				return;
			}
			if (!task.enabled) {
				this.logger.warn('[AgentTaskService] Task fired while disabled', { taskId, agentId });
				this.deregister(taskId);
				return;
			}

			const executionUserId = await this.resolveExecutionUserId(agent);
			if (!executionUserId) {
				this.logger.warn('[AgentTaskService] No project member available for task run', {
					taskId,
					agentId,
					projectId,
				});
				return;
			}

			const timezone = this.globalConfig.generic.timezone;
			const timestamp = DateTime.now().setZone(timezone).toISO() ?? new Date().toISOString();
			const message = `${task.objective}\n\nCurrent date and time: ${timestamp} (timezone: ${timezone})`;
			const threadId = `task-${taskId}-${randomUUID()}`;

			this.logger.info('[AgentTaskService] Task fired', {
				taskId,
				agentId,
				projectId,
				cronExpression: task.cronExpression,
			});

			let chunkCount = 0;
			for await (const _chunk of this.agentsService.executeForTaskPublished({
				agentId: agent.id,
				projectId: agent.projectId,
				message,
				memory: { threadId, resourceId: taskRunMemoryResourceId(taskId) },
				taskId,
			})) {
				chunkCount += 1;
			}

			await this.recordRun(taskId, 'success');
			this.logger.info('[AgentTaskService] Task run completed', {
				taskId,
				agentId,
				chunkCount,
				durationMs: Date.now() - startedAt,
			});
		} catch (error) {
			await this.recordRun(taskId, 'error');
			this.logger.error('[AgentTaskService] Task run failed', {
				taskId,
				agentId,
				projectId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async recordRun(taskId: string, status: AgentTaskRunStatus): Promise<void> {
		try {
			await this.taskRepository.update(taskId, { lastRunAt: new Date(), lastRunStatus: status });
		} catch (error) {
			this.logger.warn('[AgentTaskService] Failed to record task run metadata', {
				taskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async resolveExecutionUserId(agent: Agent): Promise<string | undefined> {
		const userIds = await this.projectRelationRepository.findUserIdsByProjectId(agent.projectId);
		if (userIds.length === 0) return undefined;

		const publishedById = agent.activeVersion?.publishedById;
		if (publishedById && userIds.includes(publishedById)) {
			return publishedById;
		}

		return undefined;
	}

	// ── Helpers ───────────────────────────────────────────────────────────

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

import type {
	AgentTaskDto,
	AgentTaskRunStatus,
	CreateAgentTaskDto,
	UpdateAgentTaskDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ProjectRelationRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { IsNull, Not } from '@n8n/typeorm';
import { CronJob } from 'cron';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { InstanceSettings } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentsService } from './agents.service';
import { Agent } from './entities/agent.entity';
import { AgentTask } from './entities/agent-task.entity';
import { isValidCronExpression } from './integrations/cron-validation';
import { AgentRepository } from './repositories/agent.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { taskRunMemoryResourceId } from './utils/agent-memory-scope';
import { generateAgentResourceId } from './utils/agent-resource-id';

/**
 * Owns an agent's scheduled tasks. Draft task bodies (name/objective/cron + run
 * metadata) live in the `agent_task` table; membership and the `enabled` flag
 * live in the agent config as `{ type: 'task', id, enabled }` refs (mirroring
 * skills). Scheduling is driven entirely by the PUBLISHED snapshot: enabled refs
 * come from `activeVersion.schema.tasks` and the body (cron/name/objective) from
 * the frozen `activeVersion.tasks` snapshot taken at publish. A `CronJob` is
 * registered per enabled ref of a published agent (leader-only). Adding,
 * removing, toggling, or editing a task is a draft change that only affects
 * scheduled runs once the agent is (re)published — "republish to apply". Manual
 * "Run now" deliberately runs the live draft body instead.
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
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
	) {}

	// ── CRUD ──────────────────────────────────────────────────────────────

	async list(agentId: string): Promise<AgentTaskDto[]> {
		const tasks = await this.taskRepository.findByAgentId(agentId);
		return tasks.map((task) => this.toDto(task));
	}

	/**
	 * Create a task body and attach a `{ type:'task', id, enabled }` ref to the
	 * agent's draft config in one transaction. Does not register a cron job —
	 * scheduling follows the published config (see `registerEnabledForAgent`).
	 */
	async create(agentId: string, dto: CreateAgentTaskDto): Promise<AgentTaskDto> {
		this.assertValidCron(dto.cronExpression);

		const agent = await this.agentRepository.findOne({ where: { id: agentId } });
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		if (!agent.schema) throw new BadRequestError('Agent has no config yet');

		const taskId = generateAgentResourceId(
			'task',
			(agent.schema.tasks ?? []).map((ref) => ref.id),
		);
		const task = this.taskRepository.create({
			id: taskId,
			agentId,
			name: dto.name,
			objective: dto.objective,
			cronExpression: dto.cronExpression,
		});

		this.attachTaskRef(agent, taskId, dto.enabled ?? true);
		markAgentDraftDirty(agent);

		await this.agentRepository.manager.transaction(async (em) => {
			await em.save(task);
			await em.save(agent);
		});

		this.logger.debug('[AgentTaskService] Created task', { agentId, taskId });
		return this.toDto(task);
	}

	/**
	 * Update a task body (name/objective/cron) in the draft. Marks the agent draft
	 * dirty but does NOT touch live scheduling: scheduled runs read the published
	 * snapshot (`activeVersion.tasks`), so any body edit only takes effect on the
	 * next (re)publish — the "republish to apply" contract. Manual "Run now" uses
	 * the draft body immediately.
	 */
	async update(agentId: string, taskId: string, dto: UpdateAgentTaskDto): Promise<AgentTaskDto> {
		const task = await this.getOrThrow(agentId, taskId);

		let changed = false;
		if (dto.cronExpression !== undefined) {
			this.assertValidCron(dto.cronExpression);
			if (dto.cronExpression !== task.cronExpression) {
				task.cronExpression = dto.cronExpression;
				changed = true;
			}
		}
		if (dto.name !== undefined && dto.name !== task.name) {
			task.name = dto.name;
			changed = true;
		}
		if (dto.objective !== undefined && dto.objective !== task.objective) {
			task.objective = dto.objective;
			changed = true;
		}

		// Nothing actually changed — skip the agent lookup, draft-dirty bump, and writes.
		if (!changed) return this.toDto(task);

		const agent = await this.agentRepository.findOne({ where: { id: agentId } });

		const saved = await this.agentRepository.manager.transaction(async (em) => {
			const savedTask = await em.save(task);
			if (agent) {
				markAgentDraftDirty(agent);
				await em.save(agent);
			}
			return savedTask;
		});

		return this.toDto(saved);
	}

	/** Delete a task body and remove its config ref in one transaction. */
	async delete(agentId: string, taskId: string): Promise<void> {
		const task = await this.getOrThrow(agentId, taskId);
		const agent = await this.agentRepository.findOne({ where: { id: agentId } });

		if (agent?.schema?.tasks) {
			agent.schema.tasks = agent.schema.tasks.filter((ref) => ref.id !== taskId);
			markAgentDraftDirty(agent);
		}

		await this.agentRepository.manager.transaction(async (em) => {
			await em.remove(task);
			if (agent) await em.save(agent);
		});

		this.deregister(taskId);
		this.logger.debug('[AgentTaskService] Deleted task', { agentId, taskId });
	}

	private attachTaskRef(agent: Agent, taskId: string, enabled: boolean): void {
		if (!agent.schema) throw new BadRequestError('Agent has no config yet');
		agent.schema.tasks = [
			...(agent.schema.tasks ?? []).filter((ref) => ref.id !== taskId),
			{ type: 'task', id: taskId, enabled },
		];
	}

	// ── Scheduling lifecycle ──────────────────────────────────────────────

	/**
	 * Reconcile an agent's task crons after a publish/unpublish/delete: apply the
	 * change locally when this main is leader and, in multi-main mode, broadcast
	 * so the leader picks it up even when a follower handled the HTTP request.
	 * `registerEnabledForAgent` is idempotent, so a self-delivered broadcast is
	 * harmless.
	 */
	async requestReconcile(agentId: string): Promise<void> {
		await this.registerEnabledForAgent(agentId);
		this.broadcastTasksChanged(agentId);
	}

	/**
	 * Reconcile an agent's cron jobs against its PUBLISHED config. Registers
	 * enabled tasks and stops jobs that are no longer enabled/present on the
	 * leader; deregisters everything when the agent is unpublished or gone. Used
	 * by the local lifecycle path and the pubsub reconcile handler.
	 */
	async registerEnabledForAgent(agentId: string): Promise<void> {
		const agent = await this.agentRepository.findOne({
			where: { id: agentId },
			relations: { activeVersion: true },
		});
		if (!agent?.activeVersionId) {
			this.deregisterAgentTasks(agentId);
			return;
		}
		this.reconcileAgent(agent);
	}

	/**
	 * Apply a peer main's task reconcile. Registration is leader-only, so
	 * followers receive the event but do not own live task cron jobs.
	 */
	@OnPubSubEvent('agent-tasks-changed', { instanceType: 'main' })
	async handleTasksChanged(payload: PubSubCommandMap['agent-tasks-changed']): Promise<void> {
		await this.registerEnabledForAgent(payload.agentId);
	}

	/** Broadcast a task reconcile to peer mains (no-op outside multi-main). */
	private broadcastTasksChanged(agentId: string): void {
		if (!this.globalConfig.multiMainSetup.enabled) return;
		void this.publisher
			.publishCommand({ command: 'agent-tasks-changed', payload: { agentId } })
			.catch((error) =>
				this.logger.warn('[AgentTaskService] Failed to publish agent-tasks-changed', {
					agentId,
					error: error instanceof Error ? error.message : String(error),
				}),
			);
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
		const agents = await this.agentRepository.find({
			where: { activeVersionId: Not(IsNull()) },
			relations: { activeVersion: true },
		});
		this.logger.debug('[AgentTaskService] Reconnecting published agents', { count: agents.length });
		for (const agent of agents) {
			try {
				this.reconcileAgent(agent);
			} catch (error) {
				this.logger.error('[AgentTaskService] Failed to reconnect agent tasks', {
					agentId: agent.id,
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

	/** Register the agent's published + enabled tasks; stop any that no longer qualify. */
	private reconcileAgent(agent: Agent): void {
		// Only the leader owns task crons — a cron firing on multiple mains would
		// run the agent twice per tick. Followers skip registration entirely; the
		// leader applies the change via the `agent-tasks-changed` pubsub reconcile.
		// A former leader drops its jobs via @OnLeaderStepdown/@OnShutdown.
		if (!this.instanceSettings.isLeader) return;

		const enabledIds = this.enabledTaskIds(agent);

		for (const [taskId, entry] of this.jobs.entries()) {
			if (entry.agentId === agent.id && !enabledIds.has(taskId)) this.deregister(taskId);
		}

		if (enabledIds.size === 0) return;

		// Bodies come from the PUBLISHED snapshot, so cron/name/objective are all
		// frozen at publish time; draft edits only apply on the next publish.
		const snapshot = agent.activeVersion?.tasks ?? {};
		for (const taskId of enabledIds) {
			const body = snapshot[taskId];
			if (body) {
				this.registerOrRefresh(taskId, agent.id, body.cronExpression);
			} else {
				this.logger.warn('[AgentTaskService] Enabled task ref has no published body', {
					agentId: agent.id,
					taskId,
				});
			}
		}
	}

	/** Ids of tasks enabled in the agent's PUBLISHED config snapshot. */
	private enabledTaskIds(agent: Agent): Set<string> {
		const publishedConfig = agent.activeVersion?.schema;
		return new Set(
			(publishedConfig?.tasks ?? []).filter((ref) => ref.enabled).map((ref) => ref.id),
		);
	}

	private registerOrRefresh(taskId: string, agentId: string, cronExpression: string): void {
		if (!isValidCronExpression(cronExpression)) {
			this.logger.warn('[AgentTaskService] Skipping task with invalid cron', { taskId });
			this.deregister(taskId);
			return;
		}

		this.deregister(taskId);

		const timezone = this.globalConfig.generic.timezone;
		const job = new CronJob(
			cronExpression,
			() => {
				void this.runTask(taskId);
			},
			null,
			true,
			timezone,
		);
		this.jobs.set(taskId, { agentId, job });
		this.logger.info('[AgentTaskService] Registered task', {
			taskId,
			agentId,
			cronExpression,
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

	// ── Run ───────────────────────────────────────────────────────────────

	private async runTask(taskId: string): Promise<void> {
		// agentId comes from the live job entry (set at registration), so a task
		// whose draft row was deleted but is still published keeps running.
		const agentId = this.jobs.get(taskId)?.agentId;
		let projectId: string | undefined;

		try {
			if (!agentId) {
				this.deregister(taskId);
				return;
			}

			const agent = await this.agentRepository.findOne({
				where: { id: agentId },
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
			if (!this.enabledTaskIds(agent).has(taskId)) {
				this.logger.warn('[AgentTaskService] Task fired but not enabled in published config', {
					taskId,
					agentId,
				});
				this.deregister(taskId);
				return;
			}

			// Body comes from the PUBLISHED snapshot, so name/objective/cron reflect
			// publish time rather than live draft edits.
			const body = agent.activeVersion?.tasks?.[taskId];
			if (!body) {
				this.logger.warn('[AgentTaskService] Task fired but has no published body', {
					taskId,
					agentId,
				});
				this.deregister(taskId);
				return;
			}

			const executionUserId = await this.resolveExecutionUserId(agent);
			if (!executionUserId) {
				// Record an error so the misconfiguration surfaces in the UI instead of
				// the cron silently failing the same way on every tick.
				await this.recordRun(taskId, 'error');
				this.logger.warn('[AgentTaskService] No project member available for task run', {
					taskId,
					agentId,
					projectId,
				});
				return;
			}

			const { message, threadId } = this.buildTaskRunMessage(taskId, body.objective);

			this.logger.info('[AgentTaskService] Task fired', {
				taskId,
				agentId,
				projectId,
				cronExpression: body.cronExpression,
			});

			await this.consumeTaskRun(
				taskId,
				'Task run',
				{ taskId, agentId, projectId },
				this.agentsService.executeForTaskPublished({
					agentId: agent.id,
					projectId: agent.projectId,
					message,
					memory: { threadId, resourceId: taskRunMemoryResourceId(taskId) },
					taskId,
				}),
			);
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

	/**
	 * Build the single unattended message the agent receives for a task run plus
	 * a fresh thread id. Shared by the scheduled path (published snapshot body)
	 * and the manual path (live draft body), so the wake-up format stays in sync.
	 */
	private buildTaskRunMessage(
		taskId: string,
		objective: string,
	): { message: string; threadId: string } {
		const timezone = this.globalConfig.generic.timezone;
		const timestamp = DateTime.now().setZone(timezone).toISO() ?? new Date().toISOString();
		const message = `${objective}\n\nCurrent date and time: ${timestamp} (timezone: ${timezone})`;
		const threadId = `task-${taskId}-${randomUUID()}`;
		return { message, threadId };
	}

	/**
	 * Drive a task-run stream to completion, recording the outcome
	 * (`success`/`error`) on the task and logging it. Shared by the scheduled and
	 * manual paths; the caller supplies the already-built stream and a log label.
	 */
	private async consumeTaskRun(
		taskId: string,
		kind: 'Task run' | 'Manual task run',
		context: Record<string, unknown>,
		stream: AsyncGenerator<unknown>,
	): Promise<void> {
		const startedAt = Date.now();
		try {
			let chunkCount = 0;
			for await (const _chunk of stream) {
				chunkCount += 1;
			}
			await this.recordRun(taskId, 'success');
			this.logger.info(`[AgentTaskService] ${kind} completed`, {
				...context,
				chunkCount,
				durationMs: Date.now() - startedAt,
			});
		} catch (error) {
			await this.recordRun(taskId, 'error');
			this.logger.error(`[AgentTaskService] ${kind} failed`, {
				...context,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Execute a task immediately as the requesting user, ignoring publish/enabled
	 * state (runs the current draft config), for the "Execute task" action. The
	 * agent run can be long, so it is kicked off in the background and surfaces
	 * as a session; only the lookup is awaited so a missing task still 404s.
	 */
	async runNow(agentId: string, taskId: string, userId: string): Promise<void> {
		const task = await this.getOrThrow(agentId, taskId);
		const agent = await this.agentRepository.findOne({ where: { id: agentId } });
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		void this.executeNow(task, agent.projectId, userId);
	}

	private async executeNow(task: AgentTask, projectId: string, userId: string): Promise<void> {
		const { message, threadId } = this.buildTaskRunMessage(task.id, task.objective);

		this.logger.info('[AgentTaskService] Manual task run started', {
			taskId: task.id,
			agentId: task.agentId,
			projectId,
		});

		await this.consumeTaskRun(
			task.id,
			'Manual task run',
			{ taskId: task.id, agentId: task.agentId, projectId },
			this.agentsService.executeForTaskNow({
				agentId: task.agentId,
				projectId,
				userId,
				message,
				memory: { threadId, resourceId: taskRunMemoryResourceId(task.id) },
				taskId: task.id,
			}),
		);
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

	private toDto(task: AgentTask): AgentTaskDto {
		return {
			id: task.id,
			name: task.name,
			objective: task.objective,
			cronExpression: task.cronExpression,
			lastRunAt: task.lastRunAt ? task.lastRunAt.toISOString() : null,
			lastRunStatus: task.lastRunStatus,
			createdAt: task.createdAt.toISOString(),
			updatedAt: task.updatedAt.toISOString(),
		};
	}
}

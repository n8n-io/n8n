import type { AgentTaskDto, CreateAgentTaskDto, UpdateAgentTaskDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { IsNull, Not } from '@n8n/typeorm';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { InstanceSettings, ScheduledTaskManager, type ScheduledTaskGroup } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { Agent } from './entities/agent.entity';
import { AgentTask } from './entities/agent-task.entity';
import { isValidCronExpression } from './integrations/cron-validation';
import { AgentRepository } from './repositories/agent.repository';
import {
	type AgentTaskRunLockHandle,
	AgentTaskRunLockRepository,
} from './repositories/agent-task-run-lock.repository';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { taskRunMemoryResourceId } from './utils/agent-memory-scope';
import { generateAgentResourceId } from './utils/agent-resource-id';

const TASK_RUN_LOCK_TTL_MS = 5 * 60 * 1000;
const TASK_RUN_LOCK_RENEW_MS = 60 * 1000;
const AGENT_TASK_SCHEDULE_GROUP_TYPE = 'agent-task';

const agentTaskScheduleGroup = (agentId: string): ScheduledTaskGroup => ({
	type: AGENT_TASK_SCHEDULE_GROUP_TYPE,
	id: agentId,
});

/**
 * Owns an agent's scheduled tasks. Draft task bodies (name/objective/cron) live
 * in the `agent_task_definition` table; membership and the `enabled` flag live
 * in the agent config as `{ type: 'task', id, enabled }` refs (mirroring
 * skills). Scheduling is driven entirely by the PUBLISHED snapshot rows tied to
 * `activeVersionId`. `ScheduledTaskManager` registers a cron per enabled
 * snapshot row of a published agent (leader-only). Adding, removing, toggling,
 * or editing a task is a draft change that only affects scheduled runs once the
 * agent is (re)published — "republish to apply". Manual "Run now" deliberately
 * runs the live draft body instead.
 */
@Service()
export class AgentTaskService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly taskRepository: AgentTaskRepository,
		private readonly taskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly taskRunLockRepository: AgentTaskRunLockRepository,
		private readonly agentRepository: AgentRepository,
		private readonly agentExecutionOrchestratorService: AgentExecutionOrchestratorService,
		private readonly instanceSettings: InstanceSettings,
		private readonly scheduledTaskManager: ScheduledTaskManager,
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
	 * task snapshot rows, so any body edit only takes effect on the next
	 * (re)publish — the "republish to apply" contract. Manual "Run now" uses the
	 * draft body immediately.
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
	 * enabled task snapshots and stops jobs that are no longer enabled/present on
	 * the leader; deregisters everything when the agent is unpublished or gone.
	 * Used by the local lifecycle path and the pubsub reconcile handler.
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
		await this.reconcileAgent(agent);
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

	/** Stop all cron jobs belonging to an agent — called on unpublish/agent delete. */
	deregisterAgentTasks(agentId: string): void {
		const group = agentTaskScheduleGroup(agentId);
		const taskIds = this.scheduledTaskManager.getTargetIds(group);
		if (!this.scheduledTaskManager.deregisterGroup(group)) return;

		for (const taskId of taskIds) {
			this.logger.info('[AgentTaskService] Deregistered task', { taskId });
		}
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
				await this.reconcileAgent(agent);
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
		this.scheduledTaskManager.deregisterGroups(AGENT_TASK_SCHEDULE_GROUP_TYPE);
	}

	/** Register the agent's published + enabled tasks; stop any that no longer qualify. */
	private async reconcileAgent(agent: Agent): Promise<void> {
		// Only the leader owns task crons — a cron firing on multiple mains would
		// run the agent twice per tick. Followers skip registration entirely; the
		// leader applies the change via the `agent-tasks-changed` pubsub reconcile.
		// A former leader drops its jobs via @OnLeaderStepdown/@OnShutdown.
		if (!this.instanceSettings.isLeader) return;

		if (!agent.activeVersionId) {
			this.deregisterAgentTasks(agent.id);
			return;
		}

		const snapshots = await this.taskSnapshotRepository.findEnabledByVersionId(
			agent.activeVersionId,
		);
		const enabledIds = new Set(snapshots.map((snapshot) => snapshot.taskId));

		for (const taskId of this.scheduledTaskManager.getTargetIds(agentTaskScheduleGroup(agent.id))) {
			if (!enabledIds.has(taskId)) this.deregister(agent.id, taskId);
		}

		if (enabledIds.size === 0) return;

		// Bodies come from PUBLISHED snapshot rows, so cron/name/objective are all
		// frozen at publish time; draft edits only apply on the next publish.
		for (const snapshot of snapshots) {
			this.registerOrRefresh(snapshot.taskId, agent.id, snapshot.cronExpression);
		}
	}

	private registerOrRefresh(taskId: string, agentId: string, cronExpression: string): void {
		if (!isValidCronExpression(cronExpression)) {
			this.logger.warn('[AgentTaskService] Skipping task with invalid cron', { taskId });
			this.deregister(agentId, taskId);
			return;
		}

		this.deregister(agentId, taskId);

		const timezone = this.globalConfig.generic.timezone;
		const registered = this.scheduledTaskManager.register(
			{
				group: agentTaskScheduleGroup(agentId),
				targetId: taskId,
				expression: cronExpression,
				timezone,
			},
			() => {
				void this.runScheduledTask(agentId, taskId);
			},
		);
		if (!registered) return;

		this.logger.info('[AgentTaskService] Registered task', {
			taskId,
			agentId,
			cronExpression,
			timezone,
		});
	}

	private deregister(agentId: string, taskId: string): void {
		const group = agentTaskScheduleGroup(agentId);
		if (!this.scheduledTaskManager.hasTarget(group, taskId)) return;

		this.scheduledTaskManager.deregisterTarget(group, taskId);
		this.logger.info('[AgentTaskService] Deregistered task', { taskId });
	}

	// ── Run ───────────────────────────────────────────────────────────────

	private async runScheduledTask(agentId: string, taskId: string): Promise<void> {
		const holderId = randomUUID();
		let lock: AgentTaskRunLockHandle | null = null;
		let renewInterval: ReturnType<typeof setInterval> | undefined;
		try {
			lock = await this.taskRunLockRepository.acquire(agentId, taskId, {
				holderId,
				ttlMs: TASK_RUN_LOCK_TTL_MS,
			});
			if (!lock) {
				this.logger.info('[AgentTaskService] Skipping task because previous run is still active', {
					taskId,
					agentId,
				});
				return;
			}

			renewInterval = this.startTaskRunLockRenewal(lock);
			await this.runTask(agentId, taskId);
		} catch (error) {
			this.logger.error('[AgentTaskService] Scheduled task lock failed', {
				taskId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			if (renewInterval) clearInterval(renewInterval);
			if (lock) {
				await this.taskRunLockRepository.release(lock).catch((error) => {
					this.logger.warn('[AgentTaskService] Failed to release task run lock', {
						taskId,
						agentId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
			}
		}
	}

	private startTaskRunLockRenewal(lock: AgentTaskRunLockHandle): ReturnType<typeof setInterval> {
		return setInterval(() => {
			void this.taskRunLockRepository
				.renew(lock, TASK_RUN_LOCK_TTL_MS)
				.then((renewed) => {
					if (!renewed) {
						this.logger.warn('[AgentTaskService] Failed to renew task run lock', {
							taskId: lock.taskId,
							agentId: lock.agentId,
						});
					}
				})
				.catch((error) => {
					this.logger.warn('[AgentTaskService] Failed to renew task run lock', {
						taskId: lock.taskId,
						agentId: lock.agentId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		}, TASK_RUN_LOCK_RENEW_MS);
	}

	private async runTask(agentId: string, taskId: string): Promise<void> {
		let projectId: string | undefined;

		try {
			const agent = await this.agentRepository.findOne({
				where: { id: agentId },
				relations: { activeVersion: true },
			});
			if (!agent) {
				this.deregister(agentId, taskId);
				return;
			}
			projectId = agent.projectId;

			if (!agent.activeVersionId) {
				this.logger.warn('[AgentTaskService] Task fired for unpublished agent', {
					taskId,
					agentId,
				});
				this.deregister(agentId, taskId);
				return;
			}
			// Body comes from the PUBLISHED snapshot row, so name/objective/cron
			// reflect publish time rather than live draft edits.
			const snapshot = await this.taskSnapshotRepository.findByVersionAndTaskId(
				agent.activeVersionId,
				taskId,
			);
			if (!snapshot?.enabled) {
				this.logger.warn('[AgentTaskService] Task fired but has no enabled published snapshot', {
					taskId,
					agentId,
				});
				this.deregister(agentId, taskId);
				return;
			}

			const { message, threadId } = this.buildTaskRunMessage(taskId, snapshot.objective);

			this.logger.info('[AgentTaskService] Task fired', {
				taskId,
				agentId,
				projectId,
				cronExpression: snapshot.cronExpression,
			});

			await this.consumeTaskRun(
				'Task run',
				{ taskId, agentId, projectId },
				this.agentExecutionOrchestratorService.executeForTaskPublished({
					agentId: agent.id,
					projectId: agent.projectId,
					message,
					memory: { threadId, resourceId: taskRunMemoryResourceId(taskId) },
					taskId,
					taskVersionId: agent.activeVersionId,
				}),
			);
		} catch (error) {
			this.logger.error('[AgentTaskService] Task run failed', {
				taskId,
				agentId,
				projectId,
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
	 * Drive a task-run stream to completion and log it. Shared by the scheduled
	 * and manual paths; the caller supplies the already-built stream and a log
	 * label.
	 */
	private async consumeTaskRun(
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
			this.logger.info(`[AgentTaskService] ${kind} completed`, {
				...context,
				chunkCount,
				durationMs: Date.now() - startedAt,
			});
		} catch (error) {
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
	async runNow(agentId: string, taskId: string, user: User): Promise<void> {
		const task = await this.getOrThrow(agentId, taskId);
		const agent = await this.agentRepository.findOne({ where: { id: agentId } });
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		void this.executeNow(task, agent.projectId, user);
	}

	private async executeNow(task: AgentTask, projectId: string, user: User): Promise<void> {
		const { message, threadId } = this.buildTaskRunMessage(task.id, task.objective);

		this.logger.info('[AgentTaskService] Manual task run started', {
			taskId: task.id,
			agentId: task.agentId,
			projectId,
		});

		await this.consumeTaskRun(
			'Manual task run',
			{ taskId: task.id, agentId: task.agentId, projectId },
			this.agentExecutionOrchestratorService.executeForTaskNow({
				agentId: task.agentId,
				projectId,
				user,
				message,
				memory: { threadId, resourceId: taskRunMemoryResourceId(task.id) },
				taskId: task.id,
			}),
		);
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
			createdAt: task.createdAt.toISOString(),
			updatedAt: task.updatedAt.toISOString(),
		};
	}
}

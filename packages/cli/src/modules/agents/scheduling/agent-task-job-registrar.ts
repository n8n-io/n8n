import { isValidTimeZone } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { ScheduledJobRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { DesiredJob } from '@n8n/scheduler';
import { computeFirstRunAt } from '@n8n/scheduler';

import { AgentScheduledJobOwner } from '@/scheduling/agent-scheduled-job-owner';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';

import { AGENT_TASK_TASK_TYPE, agentTaskJobName, type AgentTaskJobPayload } from './agent-task-job';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import { isValidCronExpression } from '../integrations/cron-validation';
import { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import { AgentRepository } from '../repositories/agent.repository';

/**
 * The write side of durable agent-task scheduling. It keeps the
 * `scheduled_job` rows of an agent in step with its published, enabled task
 * snapshots. Each task is one owner member, so the job of a task carries its
 * own payload. A task can be added or removed without a change to its siblings.
 *
 * Reconciles are plain database writes, so any main can apply one directly,
 * with no leader and no pubsub. The scheduler drops missed occurrences
 * (`skip`), the same as the in-memory scheduler that this replaces.
 */
@Service()
export class AgentTaskJobRegistrar {
	constructor(
		private logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly agentRepository: AgentRepository,
		private readonly taskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly scheduledJobRepository: ScheduledJobRepository,
		private readonly provisioner: DurableJobProvisioner,
		private readonly owner: AgentScheduledJobOwner,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	/** Whether the durable scheduler runs agent tasks on this instance. */
	isEnabled(): boolean {
		const { enabled, enabledForAgentTasks } = this.globalConfig.scheduler;
		return enabled && enabledForAgentTasks;
	}

	/**
	 * Makes the durable jobs of an agent match its published config. Enabled
	 * snapshots of the active version become jobs. All other jobs are removed.
	 * An unpublished or deleted agent keeps no jobs.
	 */
	async reconcile(agentId: string): Promise<void> {
		const versionId = await this.agentRepository.findActiveVersionId(agentId);
		if (!versionId) {
			await this.deprovisionAgent(agentId);
			return;
		}

		const snapshots = await this.taskSnapshotRepository.findEnabledByVersionId(versionId);
		const keptTaskIds = new Set<string>();
		for (const snapshot of snapshots) {
			const desired = this.desiredJobFor(agentId, snapshot);
			const payload: AgentTaskJobPayload = { agentId, taskId: snapshot.taskId };
			await this.provisioner.provision({
				owner: this.owner.member(agentId, snapshot.taskId),
				taskType: AGENT_TASK_TASK_TYPE,
				payload: { ...payload },
				desired: desired ? [desired] : [],
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
			});
			keptTaskIds.add(snapshot.taskId);
		}

		// Tasks that left the published config (removed, or disabled) can still
		// hold jobs from an earlier reconcile. The loop above did not touch their
		// members.
		const memberIds = await this.scheduledJobRepository.findOwnerMemberIds(
			this.owner.ref(agentId),
			AGENT_TASK_TASK_TYPE,
		);
		for (const taskId of memberIds) {
			if (keptTaskIds.has(taskId)) continue;
			await this.provisioner.deprovisionOwnerMember(this.owner.member(agentId, taskId));
		}
	}

	/** Removes all durable task jobs of an agent. Their occurrences cascade. */
	async deprovisionAgent(agentId: string): Promise<void> {
		const { removed } = await this.provisioner.deprovisionOwner(this.owner.ref(agentId));
		if (removed > 0) {
			this.logger.info('Removed durable jobs of an agent', { agentId, removed });
		}
	}

	/**
	 * Brings stored state in line with the flag at startup. Flag on: backfills
	 * jobs for every published agent, which covers the first flip and rows
	 * missed while this instance was down. Flag off while the scheduler runs:
	 * removes all agent jobs. The executor never claims an unregistered task
	 * type, so leftover rows collect pending occurrences that fire as a storm on
	 * a later flip. The removal is also the rollback path.
	 *
	 * Runs on every main. Provisioning reconciles in place, so concurrent
	 * startups converge.
	 */
	async reconcileAll(): Promise<void> {
		if (!this.globalConfig.scheduler.enabled) return;

		if (!this.isEnabled()) {
			await this.deprovisionAllAgents();
			return;
		}

		const agentIds = await this.agentRepository.findPublishedAgentIds();
		this.logger.debug('Reconciling durable jobs of published agents', { count: agentIds.length });
		for (const agentId of agentIds) {
			try {
				await this.reconcile(agentId);
			} catch (error) {
				this.logger.error('Failed to reconcile an agent’s durable jobs', {
					agentId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Walks every agent that owns jobs and removes its agent-task jobs, one page
	 * of owner ids at a time. Jobs of other task types that an agent may own are
	 * outside this flag and stay.
	 */
	private async deprovisionAllAgents(): Promise<void> {
		const pageSize = this.globalConfig.scheduler.ownerReconciliationBatchSize;
		let after: string | undefined;
		let removed = 0;
		for (;;) {
			const agentIds = await this.scheduledJobRepository.findOwnerIds(
				this.owner.ownerType,
				new Date(),
				pageSize,
				after,
			);
			if (agentIds.length === 0) break;

			for (const agentId of agentIds) {
				const result = await this.provisioner.deprovisionOwnerTaskType(
					this.owner.ref(agentId),
					AGENT_TASK_TASK_TYPE,
				);
				removed += result.removed;
			}
			after = agentIds[agentIds.length - 1];
		}

		if (removed > 0) {
			this.logger.info('Removed durable agent-task jobs because the feature is off', { removed });
		}
	}

	/**
	 * Maps one enabled snapshot to a desired job. A snapshot whose cron or
	 * timezone cannot be planned gives no job and a warning. The reconcile of
	 * the agent does not fail, the same as in the in-memory registration path.
	 */
	private desiredJobFor(agentId: string, snapshot: AgentTaskSnapshot): DesiredJob | null {
		const { taskId, cronExpression } = snapshot;

		if (!isValidCronExpression(cronExpression)) {
			this.logger.warn('Skipping task with invalid cron', { taskId, agentId });
			return null;
		}

		const timezone =
			snapshot.timezone && isValidTimeZone(snapshot.timezone) ? snapshot.timezone : null;
		if (snapshot.timezone && timezone === null) {
			this.logger.warn('Task has unknown timezone, using instance timezone', {
				taskId,
				timezone: snapshot.timezone,
			});
		}

		const schedule = { kind: 'cron' as const, cronExpression, timezone };

		try {
			const firstRunAt = computeFirstRunAt(
				{ ...schedule, timezone: timezone ?? this.globalConfig.generic.timezone },
				new Date(),
			);
			return { name: agentTaskJobName(agentId, taskId), schedule, firstRunAt };
		} catch (error) {
			this.logger.warn('Skipping task whose schedule cannot be planned', {
				taskId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}
}

import { Logger } from '@n8n/backend-common';
import { isValidTimeZone } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { Service } from '@n8n/di';
import { computeFirstRunAt } from '@n8n/scheduler';
import type { CronExpression } from 'n8n-workflow';

import type { LinkedDesiredJob } from '@/scheduling/durable-job-provisioner';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';

import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import { isValidCronExpression } from '../integrations/cron-validation';
import { AgentRepository } from '../repositories/agent.repository';
import { AgentTaskScheduleRepository } from '../repositories/agent-task-schedule.repository';
import { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import { AGENT_TASK_TASK_TYPE, agentTaskJobName, taskIdFromJobName } from './agent-task-job';

/**
 * The write side of durable agent-task scheduling: keeps an agent's
 * `scheduled_job` rows in step with its published, enabled task snapshots.
 *
 * Reconciles are plain DB writes, so any main can apply one directly — no
 * leader, no pubsub. Missed occurrences are dropped (`skip`), matching the
 * in-memory scheduler this replaces.
 */
@Service()
export class AgentTaskJobRegistrar {
	constructor(
		private logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly agentRepository: AgentRepository,
		private readonly taskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly taskScheduleRepository: AgentTaskScheduleRepository,
		private readonly provisioner: DurableJobProvisioner,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	/** Whether agent tasks are scheduled by the durable scheduler on this instance. */
	isEnabled(): boolean {
		const { enabled, enabledForAgentTasks } = this.globalConfig.scheduler;
		return enabled && enabledForAgentTasks;
	}

	/**
	 * Make an agent's durable jobs match its published config: enabled snapshots
	 * of the active version become jobs, everything else is removed. An
	 * unpublished or deleted agent keeps no jobs.
	 */
	async reconcile(agentId: string): Promise<void> {
		const agent = await this.agentRepository.findById(agentId);
		const versionId = agent?.activeVersionId;
		if (!versionId) {
			await this.deprovisionAgent(agentId);
			return;
		}

		const snapshots = await this.taskSnapshotRepository.findEnabledByVersionId(versionId);
		const desired = snapshots
			.map((snapshot) => this.desiredJobFor(agentId, snapshot))
			.filter((job): job is LinkedDesiredJob => job !== null);

		await this.provisioner.provisionLinked(
			{
				taskType: AGENT_TASK_TASK_TYPE,
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
				findExisting: async (manager) =>
					await this.taskScheduleRepository.findJobsForAgent(
						manager,
						agentId,
						AGENT_TASK_TASK_TYPE,
					),
				linkInserted: async (manager, jobs) =>
					await this.taskScheduleRepository.insertMany(
						manager,
						jobs.map(({ id, name }) => ({
							jobId: id,
							agentId,
							taskId: taskIdFromJobName(agentId, name),
						})),
					),
			},
			desired,
		);
	}

	/**
	 * Bring stored state in line with the flag at startup. Flag on: backfill jobs
	 * for every published agent (covers the first flip and any rows missed while
	 * this instance was down). Flag off while the scheduler runs: delete all
	 * agent jobs — the executor never claims an unregistered task type, so
	 * leftover rows would pile up pending occurrences that fire as a storm on a
	 * later flip. Deleting them is also the rollback path.
	 *
	 * Runs on every main; provisioning reconciles in place, so concurrent
	 * startups converge.
	 */
	async reconcileAll(): Promise<void> {
		if (!this.globalConfig.scheduler.enabled) return;

		if (!this.isEnabled()) {
			const { removed } = await this.provisioner.deprovisionTaskType(AGENT_TASK_TASK_TYPE);
			if (removed > 0) {
				this.logger.info('Removed durable agent-task jobs because the feature is off', {
					removed,
				});
			}
			return;
		}

		const agents = await this.agentRepository.findPublished();
		this.logger.debug('Reconciling durable jobs of published agents', { count: agents.length });
		for (const agent of agents) {
			try {
				await this.reconcile(agent.id);
			} catch (error) {
				this.logger.error('Failed to reconcile an agent’s durable jobs', {
					agentId: agent.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/** Delete all of an agent's durable task jobs; links and occurrences cascade. */
	private async deprovisionAgent(agentId: string): Promise<void> {
		const jobIds = await this.taskScheduleRepository.findJobIdsForAgent(
			agentId,
			AGENT_TASK_TASK_TYPE,
		);
		const { removed } = await this.provisioner.deprovisionJobs(jobIds);
		if (removed > 0) {
			this.logger.info('Removed durable jobs of an unpublished agent', { agentId, removed });
		}
	}

	/**
	 * Map one enabled snapshot to a desired job. A snapshot whose cron or
	 * timezone cannot be planned is omitted with a warning instead of failing the
	 * agent's whole reconcile, mirroring the in-memory registration path.
	 */
	private desiredJobFor(agentId: string, snapshot: AgentTaskSnapshot): LinkedDesiredJob | null {
		const { taskId, cronExpression } = snapshot;

		if (!isCronExpression(cronExpression)) {
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
			return {
				name: agentTaskJobName(agentId, taskId),
				schedule,
				firstRunAt,
				payload: { agentId, taskId },
			};
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

/** Narrow a stored cron string to the scheduler's expression type by validating it. */
function isCronExpression(expression: string): expression is CronExpression {
	return isValidCronExpression(expression);
}

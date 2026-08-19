import type { ScheduledJob } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { AgentTaskSchedule } from '../entities/agent-task-schedule.entity';

/** An ownership row to record for a freshly provisioned job. */
export type NewAgentTaskSchedule = Pick<AgentTaskSchedule, 'jobId' | 'agentId' | 'taskId'>;

/**
 * Ownership links between agents and their `scheduled_job` rows. Methods that
 * take an `EntityManager` run within the caller's provisioning transaction, so
 * link writes commit atomically with the job writes they describe.
 */
@Service()
export class AgentTaskScheduleRepository extends Repository<AgentTaskSchedule> {
	constructor(dataSource: DataSource) {
		super(AgentTaskSchedule, dataSource.manager);
	}

	/** One agent's jobs of one task type, within the caller's transaction. */
	async findJobsForAgent(
		manager: EntityManager,
		agentId: string,
		taskType: string,
	): Promise<ScheduledJob[]> {
		const links = await manager.find(AgentTaskSchedule, {
			where: { agentId },
			relations: { job: true },
		});
		return links.map((link) => link.job).filter((job) => job.taskType === taskType);
	}

	/** Ids of one agent's jobs of one task type, for deprovisioning. */
	async findJobIdsForAgent(agentId: string, taskType: string): Promise<number[]> {
		const links = await this.find({
			where: { agentId, job: { taskType } },
			relations: { job: true },
		});
		return links.map((link) => link.jobId);
	}

	/**
	 * Record ownership of freshly inserted jobs, within the caller's transaction.
	 * A link already recorded is left as-is (see `ScheduledJobRepository.insertMany`)
	 */
	async insertMany(manager: EntityManager, links: NewAgentTaskSchedule[]): Promise<void> {
		if (links.length === 0) return;
		await manager
			.createQueryBuilder()
			.insert()
			.into(AgentTaskSchedule)
			.values(links)
			.orIgnore()
			.execute();
	}
}

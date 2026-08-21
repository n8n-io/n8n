import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { AgentTaskSchedule } from '../entities/agent-task-schedule.entity';

/** An ownership row to record for a freshly provisioned job. */
export type NewAgentTaskSchedule = Pick<AgentTaskSchedule, 'jobId' | 'agentId' | 'taskId'>;

/**
 * Ownership links between agents and their `scheduled_job` rows. Methods take
 * the caller's `EntityManager` so link writes commit atomically with the job
 * writes of the same provisioning transaction, mirroring the scheduler
 * repositories in `@n8n/db`.
 */
@Service()
export class AgentTaskScheduleRepository extends Repository<AgentTaskSchedule> {
	constructor(dataSource: DataSource) {
		super(AgentTaskSchedule, dataSource.manager);
	}

	/** All ownership links of one agent, within the caller's transaction. */
	async findManyByAgent(manager: EntityManager, agentId: string): Promise<AgentTaskSchedule[]> {
		return await manager.find(AgentTaskSchedule, { where: { agentId } });
	}

	/**
	 * Record ownership of freshly inserted jobs, within the caller's transaction.
	 * A link already recorded is left as-is: job inserts converge on a concurrent
	 * writer's rows (see `ScheduledJobRepository.insertMany`), whose links then
	 * already exist.
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

import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { AgentTaskSchedule } from '../entities/agent-task-schedule.entity';

/** An ownership row to record for a freshly provisioned job. */
export type NewAgentTaskSchedule = Pick<AgentTaskSchedule, 'jobId' | 'agentId' | 'taskId'>;

/**
 * Ownership links between agents and their `scheduled_job` rows. Methods take
 * the caller's `EntityManager` so link writes commit atomically with the job
 * writes of the same provisioning transaction.
 */
@Service()
export class AgentTaskScheduleRepository extends Repository<AgentTaskSchedule> {
	constructor(dataSource: DataSource) {
		super(AgentTaskSchedule, dataSource.manager);
	}

	/**
	 * Record ownership of freshly inserted jobs, within the caller's transaction.
	 * A link already recorded is left as-is (see `ScheduledJobRepository.insertMany`)
	 */
	async insertMany(manager: EntityManager, links: NewAgentTaskSchedule[]): Promise<void> {
		if (manager.queryRunner === undefined) {
			throw new UnexpectedError('insertMany must run within a transaction');
		}
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

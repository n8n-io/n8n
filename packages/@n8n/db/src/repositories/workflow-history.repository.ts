import { Service } from '@n8n/di';
import { DataSource, LessThan, Repository } from '@n8n/typeorm';

import { WorkflowHistory, WorkflowEntity } from '../entities';

@Service()
export class WorkflowHistoryRepository extends Repository<WorkflowHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowHistory, dataSource.manager);
	}

	async deleteEarlierThan(date: Date) {
		return await this.delete({ createdAt: LessThan(date) });
	}

	/**
	 * Delete workflow history records earlier than a given date, except for current workflow versions.
	 */
	async deleteEarlierThanExceptCurrent(date: Date) {
		const currentVersionIdsSubquery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('w.versionId')
			.from(WorkflowEntity, 'w')
			.getQuery();

		return await this.manager
			.createQueryBuilder()
			.delete()
			.from(WorkflowHistory)
			.where('createdAt < :date', { date })
			.andWhere(`versionId NOT IN (${currentVersionIdsSubquery})`)
			.execute();
	}
}

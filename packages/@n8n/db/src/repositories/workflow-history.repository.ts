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
	 * Delete workflow history records earlier than a given date, except for current, active and named workflow versions.
	 */
	async deleteEarlierThanExceptProtectedVersions(date: Date) {
		const currentVersionIdsSubquery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('w.versionId')
			.from(WorkflowEntity, 'w')
			.getQuery();

		const activeVersionIdsSubquery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('w.activeVersionId')
			.from(WorkflowEntity, 'w')
			.where('w.activeVersionId IS NOT NULL')
			.getQuery();

		const namedVersionIdsSubquery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('wh.versionId')
			.from(WorkflowHistory, 'wh')
			.where("wh.name IS NOT NULL AND wh.name <> ''")
			.getQuery();

		return await this.manager
			.createQueryBuilder()
			.delete()
			.from(WorkflowHistory)
			.where('createdAt < :date', { date })
			.andWhere(`versionId NOT IN (${currentVersionIdsSubquery})`)
			.andWhere(`versionId NOT IN (${activeVersionIdsSubquery})`)
			.andWhere(`versionId NOT IN (${namedVersionIdsSubquery})`)
			.execute();
	}
}

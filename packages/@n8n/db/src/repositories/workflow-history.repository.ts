import { Service } from '@n8n/di';
import { DataSource, LessThan, Not, In, Repository } from '@n8n/typeorm';

import { WorkflowHistory } from '../entities';

@Service()
export class WorkflowHistoryRepository extends Repository<WorkflowHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowHistory, dataSource.manager);
	}

	async deleteEarlierThan(date: Date) {
		return await this.delete({ createdAt: LessThan(date) });
	}

	async deleteEarlierThanExcept(date: Date, excludeVersionIds: string[]) {
		if (excludeVersionIds.length === 0) {
			return await this.deleteEarlierThan(date);
		}

		return await this.delete({
			createdAt: LessThan(date),
			versionId: Not(In(excludeVersionIds)),
		});
	}
}

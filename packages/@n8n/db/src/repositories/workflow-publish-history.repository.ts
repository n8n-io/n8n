import { Service } from '@n8n/di';
import { DataSource, Equal, Or, Repository } from '@n8n/typeorm';

import { WorkflowPublishHistory } from '../entities';

@Service()
export class WorkflowPublishHistoryRepository extends Repository<WorkflowPublishHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublishHistory, dataSource.manager);
	}

	async addRecord({
		workflowId,
		versionId,
		status,
		mode,
		userId,
	}: Pick<WorkflowPublishHistory, 'status' | 'workflowId' | 'versionId' | 'mode' | 'userId'>) {
		// We skip init events on instance start since they don't hold meaningful data
		// and will grow the table over time without benefit
		if (mode === 'init') return;

		await this.insert({
			workflowId,
			versionId,
			status,
			mode,
			userId,
		});
	}

	async getLastActivatedVersion(workflowId: string) {
		return await this.findOne({
			select: ['versionId'],
			where: {
				workflowId,
				status: 'activated',
				mode: 'activate',
			},
			order: { createdAt: 'DESC' },
		});
	}

	async getPublishedVersions(workflowId: string, includeUser?: boolean) {
		const select: Array<keyof WorkflowPublishHistory> = ['versionId', 'createdAt'];
		let relations = {};
		if (includeUser) {
			select.push('user');
			relations = { user: true };
		}
		const result = await this.find({
			select,
			where: {
				workflowId,
				status: 'activated',
				mode: Or(Equal('activate'), Equal('update')),
			},
			relations,
		});

		return result;
	}
}

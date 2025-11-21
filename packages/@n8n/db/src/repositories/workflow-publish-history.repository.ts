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
		return await this.insert({
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
		if (includeUser) {
			select.push('user');
		}
		const result = await this.find({
			select,
			where: {
				workflowId,
				status: 'activated',
				mode: Or(Equal('activate'), Equal('update')),
			},
		});

		return result;
	}
}

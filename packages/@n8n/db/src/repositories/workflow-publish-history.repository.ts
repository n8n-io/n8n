import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { WorkflowPublishHistory } from '../entities';

@Service()
export class WorkflowPublishHistoryRepository extends Repository<WorkflowPublishHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublishHistory, dataSource.manager);
	}

	async addRecord(
		{
			workflowId,
			versionId,
			event,
			userId,
		}: Pick<WorkflowPublishHistory, 'event' | 'workflowId' | 'versionId' | 'userId'>,
		trx?: EntityManager,
	) {
		const repository = trx ? trx.getRepository(WorkflowPublishHistory) : this;
		await repository.insert({
			workflowId,
			versionId,
			event,
			userId,
		});
	}

	async getPublishedVersions(
		workflowId: string,
	): Promise<Array<Pick<WorkflowPublishHistory, 'versionId'>>> {
		return await this.manager
			.createQueryBuilder(WorkflowPublishHistory, 'wph')
			.select('wph.versionId')
			.distinct(true)
			.where('wph.workflowId = :workflowId', { workflowId })
			.getMany();
	}

	async findActivatedByUserId(workflowId: string): Promise<string | undefined> {
		const record = await this.findOne({
			select: ['userId'],
			where: { workflowId, event: 'activated' },
			order: { createdAt: 'DESC' },
		});
		return record?.userId ?? undefined;
	}
}

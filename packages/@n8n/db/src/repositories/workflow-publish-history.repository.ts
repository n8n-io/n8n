import type { WorkflowReviewApprovedPublicationState } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { WorkflowHistory, WorkflowPublishHistory } from '../entities';

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

	/**
	 * Whether a given version of a workflow ever reached production — used by the
	 * canvas review banner to decide if an approved version still needs publishing.
	 *
	 * "Later version" is workflow-history creation order, never UUID comparison. Only
	 * `activated` records count, so a later deactivation cannot revive a stale banner.
	 */
	async getVersionPublicationState(
		workflowId: string,
		versionId: string | null,
	): Promise<WorkflowReviewApprovedPublicationState> {
		if (!versionId) {
			return 'unknown';
		}

		const version = await this.manager.findOne(WorkflowHistory, {
			where: { workflowId, versionId },
			select: ['createdAt'],
		});
		// Pruned history: no creation time to order against, so stay silent (LIGO-879)
		if (!version) {
			return 'unknown';
		}

		// Covered by the (workflowId, versionId) index
		const activated = await this.manager.findOne(WorkflowPublishHistory, {
			where: { workflowId, versionId, event: 'activated' },
			select: ['id'],
		});
		if (activated) {
			return 'published';
		}

		const laterActivated = await this.manager
			.createQueryBuilder(WorkflowPublishHistory, 'publish')
			.innerJoin(
				WorkflowHistory,
				'publishedVersion',
				'publishedVersion.versionId = publish.versionId AND publishedVersion.workflowId = publish.workflowId',
			)
			.select('publish.id', 'id')
			.where('publish.workflowId = :workflowId', { workflowId })
			.andWhere('publish.event = :event', { event: 'activated' })
			.andWhere('publishedVersion.createdAt > :createdAt', { createdAt: version.createdAt })
			.limit(1)
			.getRawOne();

		return laterActivated ? 'superseded' : 'not_published';
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

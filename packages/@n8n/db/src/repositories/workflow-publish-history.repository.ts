import type { WorkflowReviewApprovedPublicationState } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
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
	 * Whether each given version of a workflow ever reached production — used by the
	 * canvas review banner to decide if an approved version still needs publishing.
	 * Answers many versions in a fixed number of queries, so listing reviews cannot
	 * turn this into an N+1. Versions with no workflow-history row are reported as
	 * `unknown` rather than omitted.
	 *
	 * "Later version" is workflow-history creation order, never UUID comparison. Only
	 * `activated` records count, so a later deactivation cannot revive a stale banner.
	 */
	async getVersionPublicationStates(
		workflowId: string,
		versionIds: string[],
	): Promise<Map<string, WorkflowReviewApprovedPublicationState>> {
		const states = new Map<string, WorkflowReviewApprovedPublicationState>();
		const requested = [...new Set(versionIds)];
		if (requested.length === 0) {
			return states;
		}

		const [versions, activatedVersions, newestActivated] = await Promise.all([
			this.manager.find(WorkflowHistory, {
				where: { workflowId, versionId: In(requested) },
				select: ['versionId', 'createdAt'],
			}),
			this.manager.find(WorkflowPublishHistory, {
				where: { workflowId, versionId: In(requested), event: 'activated' },
				select: ['versionId'],
			}),
			this.manager
				.createQueryBuilder(WorkflowHistory, 'history')
				.innerJoin(
					WorkflowPublishHistory,
					'publishHistory',
					'publishHistory.workflowId = history.workflowId AND publishHistory.versionId = history.versionId',
				)
				.where('history.workflowId = :workflowId', { workflowId })
				.andWhere('publishHistory.event = :event', { event: 'activated' })
				.select(['history.versionId', 'history.createdAt'])
				.orderBy('history.createdAt', 'DESC')
				.take(1)
				.getOne(),
		]);
		const createdAtByVersionId = new Map(
			versions.map((version) => [version.versionId, version.createdAt]),
		);

		const activatedVersionIds = activatedVersions
			.map((record) => record.versionId)
			.filter((id): id is string => id !== null);

		// Pruned publishes (`versionId` nulled) are excluded by the history join.
		const activatedVersionIdSet = new Set(activatedVersionIds);

		for (const versionId of requested) {
			const createdAt = createdAtByVersionId.get(versionId);
			// Pruned history: no creation time to order against, so stay silent (LIGO-879)
			if (!createdAt) {
				states.set(versionId, 'unknown');
			} else if (activatedVersionIdSet.has(versionId)) {
				states.set(versionId, 'published');
			} else if (newestActivated && newestActivated.createdAt > createdAt) {
				states.set(versionId, 'superseded');
			} else {
				states.set(versionId, 'not_published');
			}
		}

		return states;
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

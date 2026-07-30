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

		const states = await this.getVersionPublicationStates(workflowId, [versionId]);
		return states.get(versionId) ?? 'unknown';
	}

	async getVersionPublicationStates(
		workflowId: string,
		versionIds: string[],
	): Promise<Map<string, WorkflowReviewApprovedPublicationState>> {
		const states = new Map<string, WorkflowReviewApprovedPublicationState>();
		const requested = [...new Set(versionIds)];
		if (requested.length === 0) {
			return states;
		}

		const versions = await this.manager.find(WorkflowHistory, {
			where: { workflowId, versionId: In(requested) },
			select: ['versionId', 'createdAt'],
		});
		const createdAtByVersionId = new Map(
			versions.map((version) => [version.versionId, version.createdAt]),
		);

		// One pass over the workflow's publishes (bounded by how often it was
		// published) answers both "was this version live" and "was a newer one".
		// Covered by the (workflowId, versionId) index.
		const activated = await this.manager.find(WorkflowPublishHistory, {
			where: { workflowId, event: 'activated' },
			select: ['versionId'],
		});
		const activatedVersionIds = activated
			.map((record) => record.versionId)
			.filter((id): id is string => id !== null);

		// Pruned publishes (`versionId` nulled) drop out here, as they always have
		const newestActivated = activatedVersionIds.length
			? await this.manager.findOne(WorkflowHistory, {
					where: { workflowId, versionId: In(activatedVersionIds) },
					order: { createdAt: 'DESC' },
					select: ['createdAt'],
				})
			: null;
		const activatedVersionIdSet = new Set(activatedVersionIds);

		for (const versionId of requested) {
			const createdAt = createdAtByVersionId.get(versionId);
			// Pruned history: no creation time to order against, so stay silent (LIGO-879)
			if (!createdAt) {
				states.set(versionId, 'unknown');
			} else if (activatedVersionIdSet.has(versionId)) {
				states.set(versionId, 'published');
			} else if (newestActivated && newestActivated.createdAt > createdAt) {
				// "Later version" is workflow-history creation order, never UUID comparison
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

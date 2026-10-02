import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { WorkflowPublishHistory } from '../entities';

export type PublishHistoryScope = 'all' | 'latestActivation' | 'none';

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

	/** Do not join `workflowPublishHistory` instead: a join repeats the version's nodes JSON for each event. */
	async findByVersion(
		workflowId: string,
		versionId: string,
		scope: Exclude<PublishHistoryScope, 'none'> = 'all',
		trx?: EntityManager,
	) {
		const repository = trx ? trx.getRepository(WorkflowPublishHistory) : this;
		if (scope === 'latestActivation') {
			return await repository.find({
				where: { workflowId, versionId, event: 'activated' },
				order: { id: 'DESC' },
				take: 1,
			});
		}
		return await repository.find({ where: { workflowId, versionId }, order: { id: 'ASC' } });
	}

	async findLatestActivations(workflowId: string, versionIds: string[]) {
		if (versionIds.length === 0) return [];

		const latestIds = this.createQueryBuilder('latest')
			.select('MAX(latest.id)')
			.where('latest.workflowId = :workflowId', { workflowId })
			.andWhere('latest.versionId IN (:...versionIds)', { versionIds })
			.andWhere('latest.event = :event', { event: 'activated' })
			.groupBy('latest.versionId');

		return await this.createQueryBuilder('wph')
			.where(`wph.id IN (${latestIds.getQuery()})`)
			.setParameters(latestIds.getParameters())
			.getMany();
	}

	async findTimelinePage(workflowId: string, { offset, limit }: { offset: number; limit: number }) {
		// The joins are many-to-one, so `offset` and `limit` page the events.
		return await this.createQueryBuilder('wph')
			.leftJoinAndSelect('wph.user', 'user')
			.leftJoin('wph.workflowHistory', 'wh')
			.addSelect('wh.name')
			.where('wph.workflowId = :workflowId', { workflowId })
			.orderBy('wph.createdAt', 'DESC')
			.addOrderBy('wph.id', 'DESC')
			.offset(offset)
			.limit(limit)
			.getMany();
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

	/**
	 * Who published the workflow's currently active version, so a triggered run
	 * can be attributed to them.
	 *
	 * Prefers the activation of `versionId`: republishing an older version means
	 * the most recent activation is not necessarily the live one. Only when that
	 * version has no activation at all does it fall back to the latest activation
	 * of any version, which covers a version whose history row was pruned.
	 *
	 * Returns `undefined` when the publisher was deleted (the FK nulls the
	 * column) or the workflow never recorded an activation.
	 */
	async findPublisherUserId(
		workflowId: string,
		versionId?: string | null,
	): Promise<string | undefined> {
		if (versionId) {
			const forVersion = await this.findOne({
				// `id` keeps the row distinguishable from no row at all: selecting only
				// a null column makes TypeORM hydrate the result as `null`.
				select: ['id', 'userId'],
				where: { workflowId, versionId, event: 'activated' },
				order: { createdAt: 'DESC' },
			});
			// An activation row answers the question on its own. A null column means
			// the publisher was deleted, which is "nobody" — not "ask someone else",
			// which would attribute the run to whoever published a different version.
			if (forVersion) return forVersion.userId ?? undefined;
		}

		return await this.findActivatedByUserId(workflowId);
	}
}

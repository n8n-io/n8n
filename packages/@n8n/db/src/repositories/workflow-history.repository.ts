import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Repository } from '@n8n/typeorm';
import { DiffMetaData, DiffRule, groupWorkflows, SKIP_RULES } from 'n8n-workflow';

import { WorkflowHistory, WorkflowEntity, WorkflowPublishedVersion } from '../entities';
import { WorkflowPublishHistoryRepository } from './workflow-publish-history.repository';

@Service()
export class WorkflowHistoryRepository extends Repository<WorkflowHistory> {
	constructor(
		dataSource: DataSource,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
	) {
		super(WorkflowHistory, dataSource.manager);
	}

	async deleteEarlierThan(date: Date) {
		return await this.delete({ createdAt: LessThan(date) });
	}

	/**
	 * Delete workflow history records earlier than a given date, except for current and active workflow versions.
	 * @param date - Delete records created before this date
	 * @param preserveNamedVersions - If true, also preserve versions with name set
	 */
	async deleteEarlierThanExceptCurrentAndActive(date: Date, preserveNamedVersions = false) {
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

		// Published versions carry an ON DELETE RESTRICT FK; deleting one aborts the
		// whole statement, so they must be excluded like current and active versions.
		const publishedVersionIdsSubquery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('wpv.publishedVersionId')
			.from(WorkflowPublishedVersion, 'wpv')
			.getQuery();

		const query = this.manager
			.createQueryBuilder()
			.delete()
			.from(WorkflowHistory)
			.where('createdAt < :date', { date })
			.andWhere(`versionId NOT IN (${currentVersionIdsSubquery})`)
			.andWhere(`versionId NOT IN (${activeVersionIdsSubquery})`)
			.andWhere(`versionId NOT IN (${publishedVersionIdsSubquery})`);

		if (preserveNamedVersions) {
			query.andWhere('name IS NULL');
		}

		return await query.execute();
	}

	private makeSkipActiveAndNamedVersionsRule(activeVersions: Set<string>) {
		return (prev: WorkflowHistory, _next: WorkflowHistory): boolean =>
			prev.name !== null || prev.description !== null || activeVersions.has(prev.versionId);
	}

	async getWorkflowIdsInRange(startDate: Date, endDate: Date) {
		const result = await this.manager
			.createQueryBuilder(WorkflowHistory, 'wh')
			.select('wh.workflowId', 'workflowId')
			.distinct(true)
			.where('wh.createdAt <= :endDate', {
				endDate,
			})
			.andWhere('wh.createdAt >= :startDate', {
				startDate,
			})
			.groupBy('wh.workflowId')
			.getRawMany<{ workflowId: string }>();

		return result.map((x) => x.workflowId);
	}

	/**
	 * @returns The amount of seen and deleted versions
	 */
	async pruneHistory(
		workflowId: string,
		startDate: Date,
		endDate: Date,
		rules: DiffRule[] = [],
		skipRules: DiffRule[] = [],
		metaData?: Partial<Record<keyof DiffMetaData, boolean>>,
	): Promise<{ seen: number; deleted: number }> {
		const workflows = await this.manager
			.createQueryBuilder(WorkflowHistory, 'wh')
			.where('wh.workflowId = :workflowId', { workflowId })
			.andWhere('wh.createdAt <= :endDate', {
				endDate,
			})
			.andWhere('wh.createdAt >= :startDate', {
				startDate,
			})
			.orderBy('wh.createdAt', 'ASC')
			.getMany();

		// The audit log alone is not a reliable source for versions that must be
		// preserved: the live pointers (workflow_published_version.publishedVersionId,
		// workflow_entity.activeVersionId) can reference versions that have no audit
		// row, and both carry ON DELETE RESTRICT FKs that would abort the delete below.
		// The current version (workflow_entity.versionId) has no FK, so pruning it
		// would silently orphan the pointer instead. Mirror the exclusions of
		// deleteEarlierThanExceptCurrentAndActive().
		const [publishedVersions, publishedVersion, workflow] = await Promise.all([
			this.workflowPublishHistoryRepository.getPublishedVersions(workflowId),
			this.manager.findOne(WorkflowPublishedVersion, {
				where: { workflowId },
				select: ['publishedVersionId'],
			}),
			this.manager.findOne(WorkflowEntity, {
				where: { id: workflowId },
				select: ['versionId', 'activeVersionId'],
			}),
		]);

		const preservedVersionIds = new Set(
			publishedVersions.map((v) => v.versionId).filter((v) => v !== null),
		);
		if (publishedVersion) preservedVersionIds.add(publishedVersion.publishedVersionId);
		if (workflow?.versionId) preservedVersionIds.add(workflow.versionId);
		if (workflow?.activeVersionId) preservedVersionIds.add(workflow.activeVersionId);

		const grouped = groupWorkflows<WorkflowHistory>(
			workflows,
			rules,
			[
				this.makeSkipActiveAndNamedVersionsRule(preservedVersionIds),
				SKIP_RULES.skipDifferentUsers,
				...skipRules,
			],
			metaData,
		);

		await this.delete({ versionId: In(grouped.removed.map((x) => x.versionId)) });
		return { seen: workflows.length, deleted: grouped.removed.length };
	}
}

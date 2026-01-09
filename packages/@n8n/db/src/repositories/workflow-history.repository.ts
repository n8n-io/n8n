import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Repository } from '@n8n/typeorm';
import { DiffRule, groupWorkflows, SKIP_RULES } from 'n8n-workflow';

import { WorkflowHistory, WorkflowEntity } from '../entities';
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
	 */
	async deleteEarlierThanExceptCurrentAndActive(date: Date) {
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

		return await this.manager
			.createQueryBuilder()
			.delete()
			.from(WorkflowHistory)
			.where('createdAt < :date', { date })
			.andWhere(`versionId NOT IN (${currentVersionIdsSubquery})`)
			.andWhere(`versionId NOT IN (${activeVersionIdsSubquery})`)
			.execute();
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

		// Group by workflowId
		const publishedVersions =
			await this.workflowPublishHistoryRepository.getPublishedVersions(workflowId);
		const grouped = groupWorkflows<WorkflowHistory>(workflows, rules, [
			this.makeSkipActiveAndNamedVersionsRule(new Set(publishedVersions.map((x) => x.versionId))),
			SKIP_RULES.skipDifferentUsers,
			...skipRules,
		]);

		await this.delete({ versionId: In(grouped.removed.map((x) => x.versionId)) });
		return { seen: workflows.length, deleted: grouped.removed.length };
	}
}

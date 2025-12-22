import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Repository } from '@n8n/typeorm';
import { GroupedWorkflowHistory, groupWorkflows, RULES } from 'n8n-workflow';

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

	private makeSkipActiveAndNamedVersionsRule(activeVersions: string[]) {
		return (
			prev: GroupedWorkflowHistory<WorkflowHistory>,
			_next: GroupedWorkflowHistory<WorkflowHistory>,
		): boolean =>
			prev.to.name !== null ||
			prev.to.description !== null ||
			activeVersions.includes(prev.to.versionId);
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

		const versionsToDelete = [];
		const publishedVersions =
			await this.workflowPublishHistoryRepository.getPublishedVersions(workflowId);
		const grouped = groupWorkflows<WorkflowHistory>(
			workflows,
			[RULES.mergeAdditiveChanges],
			[this.makeSkipActiveAndNamedVersionsRule(publishedVersions.map((x) => x.versionId))],
		);
		for (const group of grouped) {
			for (const wf of group.groupedWorkflows) {
				versionsToDelete.push(wf.versionId);
			}
		}
		await this.delete({ versionId: In(versionsToDelete) });
		return { seen: workflows.length, deleted: versionsToDelete.length };
	}
}

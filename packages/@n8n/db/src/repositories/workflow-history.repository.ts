import { Service } from '@n8n/di';
import { DataSource, In, LessThan, MoreThan } from '@n8n/typeorm';
import { DiffMetaData, DiffRule, groupWorkflows, SKIP_RULES } from 'n8n-workflow';

import { WorkflowHistory, WorkflowEntity, WorkflowPublishedVersion } from '../entities';
import { BaseRepository } from './base-repository';
import { WorkflowPublishHistoryRepository } from './workflow-publish-history.repository';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import { WorkflowReviewRequest } from '../entities/workflow-review-request.ee';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

@Service()
export class WorkflowHistoryRepository extends BaseRepository<WorkflowHistory> {
	constructor(
		dataSource: DataSource,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
		transactionRunner: TransactionRunner,
	) {
		super(WorkflowHistory, dataSource.manager, transactionRunner);
	}

	async deleteEarlierThan(date: Date) {
		return await this.delete({ createdAt: LessThan(date) });
	}

	/**
	 * Date range and author sets of a workflow's versions created after the given date.
	 * Authors are read from a bounded window of the most recent versions.
	 */
	async findChangelogCreatedAfter(
		workflowId: string,
		after: Date,
		maxAuthorVersions: number,
	): Promise<{ authorLists: string[]; from: Date; to: Date } | null> {
		const where = { workflowId, createdAt: MoreThan(after) };
		const [oldest, newest, recentVersions] = await Promise.all([
			this.findOne({ where, select: ['createdAt'], order: { createdAt: 'ASC' } }),
			this.findOne({ where, select: ['createdAt'], order: { createdAt: 'DESC' } }),
			this.find({
				where,
				select: ['authors'],
				order: { createdAt: 'DESC' },
				take: maxAuthorVersions,
			}),
		]);

		if (!oldest || !newest) {
			return null;
		}

		return {
			authorLists: recentVersions.map((v) => v.authors),
			from: oldest.createdAt,
			to: newest.createdAt,
		};
	}

	/**
	 * Name and optionally describe a single version. Scoped by `workflowId` too
	 * so a version of another workflow can never be touched, and returns the
	 * affected row count so callers running inside a transaction can treat `0`
	 * as "already pruned". An omitted description leaves the column untouched.
	 */
	async updateVersionMetadata(
		{
			workflowId,
			versionId,
			name,
			description,
		}: { workflowId: string; versionId: string; name: string; description?: string | null },
		ctx: OperationContext,
	): Promise<number | undefined> {
		const result = await this.managerFor(ctx).update(
			WorkflowHistory,
			{ workflowId, versionId },
			{ name, ...(description !== undefined ? { description } : {}) },
		);
		return result.affected ?? undefined;
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

		// Versions pinned by an open review request must stay reviewable and
		// publishable-on-approval. Closed reviews don't need it.
		const openReviewPinnedVersionIdsSubquery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('wrrw.workflowVersionId')
			.from(WorkflowReviewRequestWorkflow, 'wrrw')
			.innerJoin(WorkflowReviewRequest, 'wrr', 'wrr.id = wrrw.workflowReviewRequestId')
			.where("wrr.state = 'open'")
			.andWhere('wrrw.workflowVersionId IS NOT NULL')
			.getQuery();

		const query = this.manager
			.createQueryBuilder()
			.delete()
			.from(WorkflowHistory)
			.where('createdAt < :date', { date })
			.andWhere(`versionId NOT IN (${currentVersionIdsSubquery})`)
			.andWhere(`versionId NOT IN (${activeVersionIdsSubquery})`)
			.andWhere(`versionId NOT IN (${publishedVersionIdsSubquery})`)
			.andWhere(`versionId NOT IN (${openReviewPinnedVersionIdsSubquery})`);

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

		// Group by workflowId
		const publishedVersions =
			await this.workflowPublishHistoryRepository.getPublishedVersions(workflowId);
		const grouped = groupWorkflows<WorkflowHistory>(
			workflows,
			rules,
			[
				this.makeSkipActiveAndNamedVersionsRule(
					new Set(publishedVersions.map((v) => v.versionId).filter((v) => v !== null)),
				),
				SKIP_RULES.skipDifferentUsers,
				...skipRules,
			],
			metaData,
		);

		await this.delete({ versionId: In(grouped.removed.map((x) => x.versionId)) });
		return { seen: workflows.length, deleted: grouped.removed.length };
	}
}

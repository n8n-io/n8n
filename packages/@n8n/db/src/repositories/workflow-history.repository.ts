import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan } from '@n8n/typeorm';
import { DiffMetaData, DiffRule, groupWorkflows, SKIP_RULES } from 'n8n-workflow';

import {
	WorkflowHistory,
	WorkflowEntity,
	WorkflowPublishedVersion,
	WorkflowPublishHistory,
} from '../entities';
import { BaseRepository } from './base-repository';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import { WorkflowReviewRequest } from '../entities/workflow-review-request.ee';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

@Service()
export class WorkflowHistoryRepository extends BaseRepository<WorkflowHistory> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowHistory, dataSource.manager, transactionRunner);
	}

	async insertVersion(
		version: Pick<
			WorkflowHistory,
			'authors' | 'connections' | 'nodes' | 'versionId' | 'workflowId' | 'autosaved'
		> & { name?: string; description?: string; nodeGroups?: WorkflowHistory['nodeGroups'] },
		ctx: OperationContext,
	) {
		await this.managerFor(ctx).insert(WorkflowHistory, version);
	}

	/**
	 * The authors of the newest version per workflow, keyed by workflow id. `authors`
	 * is the display name recorded at save time, not a user id. Workflows without a
	 * version are absent from the result.
	 */
	async findLatestAuthorsByWorkflowIds(
		workflowIds: string[],
	): Promise<Map<string, { authors: string; at: Date }>> {
		const latest = new Map<string, { authors: string; at: Date }>();
		if (workflowIds.length === 0) return latest;

		const rows = await this.find({
			select: ['versionId', 'workflowId', 'authors', 'createdAt'],
			where: { workflowId: In(workflowIds) },
			order: { createdAt: 'DESC' },
		});
		for (const row of rows) {
			if (!latest.has(row.workflowId)) {
				latest.set(row.workflowId, { authors: row.authors, at: row.createdAt });
			}
		}
		return latest;
	}

	async deleteEarlierThan(date: Date) {
		return await this.delete({ createdAt: LessThan(date) });
	}

	async findVersionSummaries(
		workflowId: string,
		versionIds: string[],
	): Promise<Array<{ versionId: string; name: string | null; createdAt: Date }>> {
		return await this.find({
			where: { workflowId, versionId: In(versionIds) },
			select: ['versionId', 'name', 'createdAt'],
			order: { createdAt: 'DESC' },
		});
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
		const publishedVersionSubquery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('1')
			.from(WorkflowPublishHistory, 'wph')
			.where('wph.workflowId = wh.workflowId')
			.andWhere('wph.versionId = wh.versionId')
			.getQuery();
		const { entities: workflows, raw } = await this.manager
			.createQueryBuilder(WorkflowHistory, 'wh')
			.leftJoin(WorkflowEntity, 'w', 'w.id = wh.workflowId')
			.addSelect(
				`CASE WHEN w.versionId = wh.versionId OR EXISTS ${publishedVersionSubquery} THEN 1 ELSE 0 END`,
				'isProtected',
			)
			.where('wh.workflowId = :workflowId', { workflowId })
			.andWhere('wh.createdAt <= :endDate', {
				endDate,
			})
			.andWhere('wh.createdAt >= :startDate', {
				startDate,
			})
			.orderBy('wh.createdAt', 'ASC')
			.addOrderBy('wh.versionId', 'ASC')
			.getRawAndEntities<{ wh_versionId: string; isProtected: number }>();

		// The current version and every version that was ever published stay.
		const protectedVersions = new Set(
			raw.filter((row) => Number(row.isProtected) === 1).map((row) => row.wh_versionId),
		);
		const grouped = groupWorkflows<WorkflowHistory>(
			workflows,
			rules,
			[
				this.makeSkipActiveAndNamedVersionsRule(protectedVersions),
				SKIP_RULES.skipDifferentUsers,
				...skipRules,
			],
			metaData,
		);

		// A version named after the read above stays, like one named before it.
		const { affected } = await this.delete({
			versionId: In(grouped.removed.map((x) => x.versionId)),
			name: IsNull(),
			description: IsNull(),
		});
		return { seen: workflows.length, deleted: affected ?? grouped.removed.length };
	}
}

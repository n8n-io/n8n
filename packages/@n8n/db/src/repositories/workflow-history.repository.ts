import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan } from '@n8n/typeorm';
import type { WhereExpressionBuilder } from '@n8n/typeorm';
import { DiffMetaData, DiffRule, groupWorkflows, SKIP_RULES } from 'n8n-workflow';

import {
	WorkflowHistory,
	WorkflowEntity,
	WorkflowPublishedVersion,
	WorkflowPublishHistory,
} from '../entities';
import { BaseRepository } from './base-repository';
import { chunkIds } from '../utils/chunk-ids';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import { WorkflowReviewRequest } from '../entities/workflow-review-request.ee';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

@Service()
export class WorkflowHistoryRepository extends BaseRepository<WorkflowHistory> {
	/** Versions deleted per statement by the history prune, so the SQLite write lock is held briefly. */
	readonly pruneBatchSize = 100;

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
	 * The authors of the newest versions per workflow, newest first and at most
	 * `perWorkflow` each, keyed by workflow id. `authors` is the display name
	 * recorded at save time, not a user id. Workflows without a version are absent.
	 */
	async findRecentAuthorsByWorkflowIds(
		workflowIds: string[],
		perWorkflow: number,
	): Promise<Map<string, Array<{ authors: string; at: Date }>>> {
		const recent = new Map<string, Array<{ authors: string; at: Date }>>();
		if (workflowIds.length === 0 || perWorkflow <= 0) return recent;

		for (const chunk of chunkIds([...new Set(workflowIds)])) {
			const rows = await this.find({
				select: ['versionId', 'workflowId', 'authors', 'createdAt'],
				where: { workflowId: In(chunk) },
				order: { createdAt: 'DESC' },
			});
			for (const row of rows) {
				const entries = recent.get(row.workflowId) ?? [];
				if (entries.length >= perWorkflow) continue;
				entries.push({ authors: row.authors, at: row.createdAt });
				recent.set(row.workflowId, entries);
			}
		}
		return recent;
	}

	async deleteEarlierThan(date: Date) {
		return await this.delete({ createdAt: LessThan(date) });
	}

	/**
	 * The newest `limit` versions of a workflow, with only their nodes, for a
	 * caller that looks for a node as a recent version stored it.
	 */
	async findNewestVersionNodes(
		workflowId: string,
		limit: number,
	): Promise<Array<Pick<WorkflowHistory, 'versionId' | 'nodes'>>> {
		return await this.find({
			select: ['versionId', 'nodes'],
			where: { workflowId },
			order: { createdAt: 'DESC', versionId: 'DESC' },
			take: limit,
		});
	}

	/** The nodes of the given versions. A version that no longer exists is absent. */
	async findNodesByVersionIds(
		versionIds: string[],
	): Promise<Array<Pick<WorkflowHistory, 'versionId' | 'nodes'>>> {
		const versions: Array<Pick<WorkflowHistory, 'versionId' | 'nodes'>> = [];
		for (const chunk of chunkIds(versionIds)) {
			versions.push(
				...(await this.find({ select: ['versionId', 'nodes'], where: { versionId: In(chunk) } })),
			);
		}
		return versions;
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
	 * Deletes versions created before `date` that no workflow, publication, or open review uses,
	 * in batches of `pruneBatchSize`, and stops before the next batch when `signal` aborts.
	 * @param preserveNamedVersions - If true, also keeps versions with a name
	 */
	async deleteEarlierThanExceptCurrentAndActive(
		date: Date,
		preserveNamedVersions: boolean,
		signal: AbortSignal,
	): Promise<void> {
		let after: string | undefined;
		let hasMore = true;

		while (hasMore && !signal.aborted) {
			const versionIds = await this.findPrunableVersionIds(date, preserveNamedVersions, after);
			if (versionIds.length > 0 && !signal.aborted) {
				// The keep rules apply again, so a version protected after the select stays.
				const query = this.manager
					.createQueryBuilder()
					.delete()
					.from(WorkflowHistory)
					.where('versionId IN (:...versionIds)', { versionIds });
				this.wherePrunable(query, '', date, preserveNamedVersions);
				await query.execute();
			}
			hasMore = versionIds.length === this.pruneBatchSize;
			after = versionIds.at(-1);
		}
	}

	/** Reads on a read connection, so the scan of the table does not hold the SQLite write lock. */
	private async findPrunableVersionIds(
		date: Date,
		preserveNamedVersions: boolean,
		after: string | undefined,
	): Promise<string[]> {
		const query = this.manager
			.createQueryBuilder(WorkflowHistory, 'wh')
			.select('wh.versionId', 'versionId')
			.orderBy('wh.versionId', 'ASC')
			.limit(this.pruneBatchSize);
		this.wherePrunable(query, 'wh.', date, preserveNamedVersions);
		if (after !== undefined) {
			query.andWhere('wh.versionId > :after', { after });
		}
		const rows = await query.getRawMany<{ versionId: string }>();
		return rows.map((row) => row.versionId);
	}

	/** A delete builder quotes bare column names and a select builder quotes only aliased ones, hence `prefix`. */
	private wherePrunable(
		query: WhereExpressionBuilder,
		prefix: '' | 'wh.',
		date: Date,
		preserveNamedVersions: boolean,
	): void {
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

		query
			.andWhere(`${prefix}createdAt < :date`, { date })
			.andWhere(`${prefix}versionId NOT IN (${currentVersionIdsSubquery})`)
			.andWhere(`${prefix}versionId NOT IN (${activeVersionIdsSubquery})`)
			.andWhere(`${prefix}versionId NOT IN (${publishedVersionIdsSubquery})`)
			.andWhere(`${prefix}versionId NOT IN (${openReviewPinnedVersionIdsSubquery})`);

		if (preserveNamedVersions) {
			query.andWhere(`${prefix}name IS NULL`);
		}
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

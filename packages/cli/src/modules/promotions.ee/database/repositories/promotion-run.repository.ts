import type { PromotionRunState, PromotionReviewTab } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, type FindOptionsWhere } from '@n8n/typeorm';

import { PromotionRun } from '../entities/promotion-run.entity';

export type NewPromotionRun = Pick<
	PromotionRun,
	| 'connectionId'
	| 'projectId'
	| 'createdById'
	| 'branchName'
	| 'commitSha'
	| 'title'
	| 'gitlabProjectId'
	| 'mergeRequestIid'
	| 'webUrl'
>;

/** What a state refresh learned from the host. */
export type PromotionRunStateSync = {
	state: PromotionRunState;
	hasConflicts: boolean;
	mergedAt: Date | null;
	closedAt: Date | null;
	/** Set when the run leaves `open`, so the reviewed diff stays readable. */
	baselineCommitSha?: string | null;
};

const TERMINAL_STATES: PromotionRunState[] = ['merged', 'closed', 'unavailable'];

const WITH_PEOPLE = { connection: true, createdBy: true, approvedBy: true } as const;

@Service()
export class PromotionRunRepository extends BaseRepository<PromotionRun> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionRun, dataSource.manager, transactionRunner);
	}

	async insertRun(run: NewPromotionRun, ctx: OperationContext = {}): Promise<PromotionRun> {
		return await this.managerFor(ctx).save(PromotionRun, this.create(run));
	}

	async findByIdWithRelations(id: string): Promise<PromotionRun | null> {
		return await this.findOne({ where: { id }, relations: WITH_PEOPLE });
	}

	/** Newest first, because the inbox sorts every review kind by creation time. */
	async listRuns(options: { tab?: PromotionReviewTab; skip: number; take: number }) {
		const where: FindOptionsWhere<PromotionRun> = {};
		if (options.tab === 'open') where.state = 'open';
		if (options.tab === 'closed') where.state = In(TERMINAL_STATES);

		const [data, count] = await this.findAndCount({
			where,
			relations: WITH_PEOPLE,
			order: { createdAt: 'DESC' },
			skip: options.skip,
			take: options.take,
		});
		return { count, data };
	}

	/** Only open rows change on the host, so a refresh reads these alone. */
	async findOpenRuns(): Promise<PromotionRun[]> {
		return await this.find({ where: { state: 'open' }, relations: { connection: true } });
	}

	async recordSync(id: string, sync: PromotionRunStateSync): Promise<void> {
		await this.update({ id }, { ...sync, lastSyncedAt: new Date() });
	}

	/**
	 * Marks the approver only when nobody else did. The affected row count tells
	 * the caller whether it won.
	 */
	async claimApproval(id: string, approvedById: string): Promise<boolean> {
		const result = await this.update(
			{ id, state: 'open', approvedById: IsNull() },
			{ approvedById, approvedAt: new Date() },
		);
		return (result.affected ?? 0) > 0;
	}

	/** Undoes {@link claimApproval} when the host rejected the merge. */
	async releaseApproval(id: string): Promise<void> {
		await this.update({ id }, { approvedById: null, approvedAt: null });
	}
}

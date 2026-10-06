import type { PromotionReviewState, PromotionReviewTab } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, type FindOptionsWhere } from '@n8n/typeorm';

import { PromotionReview } from '../entities/promotion-review.entity';

export type NewPromotionReview = Pick<
	PromotionReview,
	'connectionId' | 'createdById' | 'branchName' | 'commitSha' | 'remoteReviewId'
>;

/** What a state refresh learned from the host. */
export type PromotionReviewStateSync = Pick<PromotionReview, 'state' | 'mergedAt' | 'closedAt'>;

const TERMINAL_STATES: PromotionReviewState[] = ['merged', 'closed', 'unavailable'];

const WITH_PEOPLE = { connection: true, createdBy: true, approvedBy: true } as const;

@Service()
export class PromotionReviewRepository extends BaseRepository<PromotionReview> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionReview, dataSource.manager, transactionRunner);
	}

	async insertReview(
		review: NewPromotionReview,
		ctx: OperationContext = {},
	): Promise<PromotionReview> {
		return await this.managerFor(ctx).save(PromotionReview, this.create(review));
	}

	async findByIdWithRelations(id: string): Promise<PromotionReview | null> {
		return await this.findOne({ where: { id }, relations: WITH_PEOPLE });
	}

	/** Newest first, because the inbox sorts every review kind by creation time. */
	async listReviews(options: { tab?: PromotionReviewTab; skip: number; take: number }) {
		const where: FindOptionsWhere<PromotionReview> = {};
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
	async findOpenReviews(): Promise<PromotionReview[]> {
		return await this.find({ where: { state: 'open' }, relations: { connection: true } });
	}

	async recordSync(id: string, sync: PromotionReviewStateSync): Promise<void> {
		await this.update({ id }, sync);
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

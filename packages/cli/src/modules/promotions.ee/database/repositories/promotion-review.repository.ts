import type { PromotionReviewState, PromotionReviewTab } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type FindOptionsWhere } from '@n8n/typeorm';

import { PromotionReview } from '../entities/promotion-review.entity';

/** The caller supplies the id, so the review link can exist before the row does. */
export type NewPromotionReview = Pick<
	PromotionReview,
	'id' | 'connectionId' | 'type' | 'remoteReviewId' | 'createdById'
>;

/** Still on the host. The open tab shows both. */
const OPEN_STATES: PromotionReviewState[] = ['open', 'changes_requested'];
const TERMINAL_STATES: PromotionReviewState[] = ['merged', 'closed'];

// Do not load runs for inbox rows. The summary does not use them.
const LIST_RELATIONS = {
	connection: true,
	createdBy: true,
	approvedBy: true,
} as const;

/** The newest run carries the branch and the commit. Loaded only for one review. */
const DETAIL_RELATIONS = {
	connection: true,
	createdBy: true,
	approvedBy: true,
	runs: { config: { connection: true }, createdBy: true },
} as const;

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
		return await this.findOne({ where: { id }, relations: DETAIL_RELATIONS });
	}

	/**
	 * Newest first, because the inbox sorts every review kind by creation time.
	 * `id` breaks ties. Reviews can share `createdAt`, and offset pages need a
	 * stable order.
	 */
	async listReviews(options: { tab?: PromotionReviewTab; offset: number; limit: number }) {
		const where: FindOptionsWhere<PromotionReview> = {};
		if (options.tab === 'open') where.state = In(OPEN_STATES);
		if (options.tab === 'closed') where.state = In(TERMINAL_STATES);

		const [data, count] = await this.findAndCount({
			where,
			relations: LIST_RELATIONS,
			order: { createdAt: 'DESC', id: 'DESC' },
			skip: options.offset,
			take: options.limit,
		});
		return { count, data };
	}
}

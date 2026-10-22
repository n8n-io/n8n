import type { InboxCounts, PromotionReviewState } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import type { InboxSourceQuery } from '../../../inbox/inbox-source.registry';
import { PromotionReview } from '../entities/promotion-review.entity';

/** The caller supplies the id, so the review link can exist before the row does. */
export type NewPromotionReview = Pick<
	PromotionReview,
	'id' | 'environmentId' | 'type' | 'remoteReviewId' | 'createdById'
>;

/** Still on the host. The open tab shows both. */
const OPEN_STATES: PromotionReviewState[] = ['open', 'changes_requested'];
const TERMINAL_STATES: PromotionReviewState[] = ['merged', 'closed'];

// The Inbox orders every source by its latest activity. A review has no updatedAt column.
const activityAt = 'COALESCE(review.lastStateChangeAt, review.createdAt)';

/** The newest run carries the branch and the commit. Loaded only for one review. */
const DETAIL_RELATIONS = {
	environment: true,
	createdBy: true,
	approvedBy: true,
	runs: { createdBy: true },
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

	async findOpenReviews(): Promise<PromotionReview[]> {
		return await this.find({ where: { state: In(OPEN_STATES) }, relations: { environment: true } });
	}

	/** Writes a host state only while the row is open, so a terminal row never changes. */
	async recordHostState(id: string, state: PromotionReviewState, at: Date): Promise<boolean> {
		const result = await this.update(
			{ id, state: In(OPEN_STATES) },
			{ state, lastStateChangeAt: at },
		);
		return (result.affected ?? 0) > 0;
	}

	async findByIdWithRelations(id: string): Promise<PromotionReview | null> {
		return await this.findOne({ where: { id }, relations: DETAIL_RELATIONS });
	}

	async findForInbox({ state, limit, boundary }: InboxSourceQuery): Promise<PromotionReview[]> {
		const query = this.createQueryBuilder('review')
			.leftJoinAndSelect('review.environment', 'environment')
			.leftJoinAndSelect('review.createdBy', 'createdBy')
			.leftJoinAndSelect('review.approvedBy', 'approvedBy')
			.where('review.state IN (:...states)', {
				states: state === 'open' ? OPEN_STATES : TERMINAL_STATES,
			})
			.orderBy(activityAt, 'DESC')
			.addOrderBy('review.id', 'ASC')
			.limit(limit);
		if (boundary?.mode === 'afterItem') {
			query.andWhere(`(${activityAt} < :at OR (${activityAt} = :at AND review.id > :id))`, {
				at: boundary.updatedAt,
				id: boundary.id,
			});
		} else if (boundary) {
			const operator = boundary.mode === 'beforeOrAtTime' ? '<=' : '<';
			query.andWhere(`${activityAt} ${operator} :at`, { at: boundary.updatedAt });
		}
		return await query.getMany();
	}

	async countForInbox(): Promise<InboxCounts> {
		const [open, closed] = await Promise.all([
			this.countBy({ state: In(OPEN_STATES) }),
			this.countBy({ state: In(TERMINAL_STATES) }),
		]);
		return { open, closed };
	}
}

import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { PromotionRun } from '../entities/promotion-run.entity';

/** The id is generated on insert. `reviewId` stays NULL until a review is attached. */
export type NewPromotionRun = Pick<
	PromotionRun,
	'environmentId' | 'createdById' | 'direction' | 'type' | 'details' | 'reviewId'
>;

@Service()
export class PromotionRunRepository extends BaseRepository<PromotionRun> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionRun, dataSource.manager, transactionRunner);
	}

	async insertRun(run: NewPromotionRun, ctx: OperationContext = {}): Promise<PromotionRun> {
		return await this.managerFor(ctx).save(PromotionRun, this.create(run));
	}

	async findByReviewIds(reviewIds: string[]): Promise<PromotionRun[]> {
		if (reviewIds.length === 0) return [];
		return await this.find({
			where: { reviewId: In(reviewIds) },
			relations: { environment: true },
		});
	}

	/** The only column that changes after insert. An amend inserts a new run instead. */
	async attachReview(runId: string, reviewId: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).update(PromotionRun, { id: runId }, { reviewId });
	}
}

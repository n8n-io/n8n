import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, MoreThanOrEqual, Not } from '@n8n/typeorm';

import { PublishJudgeReview } from '../entities/publish-judge-review.entity';

class PublishJudgeReviewTable extends BaseRepository<PublishJudgeReview> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PublishJudgeReview, dataSource.manager, transactionRunner);
	}
}

export type NewPublishJudgeReview = Omit<
	PublishJudgeReview,
	'id' | 'createdAt' | 'updatedAt' | 'setUpdateDate'
>;

@Service()
export class PublishJudgeReviewRepository {
	private readonly table: PublishJudgeReviewTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PublishJudgeReviewTable(dataSource, transactionRunner);
	}

	async record(review: NewPublishJudgeReview): Promise<void> {
		await this.table.managerFor({}).insert(PublishJudgeReview, review);
	}

	/** The newest reviews that did not allow: refusals, and judges that gave no answer. */
	async findLatestNotAllowed(limit: number): Promise<PublishJudgeReview[]> {
		return await this.table.managerFor({}).find(PublishJudgeReview, {
			where: { verdict: Not('allowed') },
			order: { id: 'DESC' },
			take: limit,
		});
	}

	/** The newest reviews since `since`, capped so a busy instance stays cheap to chart. */
	async findSince(since: Date, cap: number): Promise<PublishJudgeReview[]> {
		return await this.table.managerFor({}).find(PublishJudgeReview, {
			where: { createdAt: MoreThanOrEqual(since) },
			order: { id: 'DESC' },
			take: cap,
		});
	}
}

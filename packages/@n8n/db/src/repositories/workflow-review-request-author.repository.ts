import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { WorkflowReviewRequestAuthor } from '../entities/workflow-review-request-author.ee';

@Service()
export class WorkflowReviewRequestAuthorRepository extends Repository<WorkflowReviewRequestAuthor> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewRequestAuthor, dataSource.manager);
	}

	async addAuthor(
		input: {
			workflowReviewRequestId: string;
			userId: string;
		},
		trx?: EntityManager,
	): Promise<WorkflowReviewRequestAuthor> {
		const manager = trx ?? this.manager;
		const entity = this.create({
			workflowReviewRequestId: input.workflowReviewRequestId,
			userId: input.userId,
		});

		return await manager.save(WorkflowReviewRequestAuthor, entity);
	}

	async findByRequestId(requestId: string): Promise<WorkflowReviewRequestAuthor[]> {
		return await this.find({
			where: { workflowReviewRequestId: requestId },
			order: { userId: 'ASC' },
		});
	}

	async findByRequestIds(requestIds: string[]): Promise<WorkflowReviewRequestAuthor[]> {
		if (requestIds.length === 0) {
			return [];
		}

		return await this.find({
			where: { workflowReviewRequestId: In(requestIds) },
			order: { userId: 'ASC' },
		});
	}
}

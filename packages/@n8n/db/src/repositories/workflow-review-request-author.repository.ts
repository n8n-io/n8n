import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { WorkflowReviewRequestAuthor } from '../entities/workflow-review-request-author.ee';

@Service()
export class WorkflowReviewRequestAuthorRepository extends Repository<WorkflowReviewRequestAuthor> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewRequestAuthor, dataSource.manager);
	}

	async findByRequestId(requestId: string): Promise<WorkflowReviewRequestAuthor[]> {
		return await this.find({
			where: { workflowReviewRequestId: requestId },
			order: { id: 'ASC' },
		});
	}

	async findByRequestIds(requestIds: string[]): Promise<WorkflowReviewRequestAuthor[]> {
		if (requestIds.length === 0) {
			return [];
		}

		return await this.find({
			where: { workflowReviewRequestId: In(requestIds) },
			order: { id: 'ASC' },
		});
	}
}

import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { WorkflowReviewRequestReviewer } from '../entities/workflow-review-request-reviewer.ee';

@Service()
export class WorkflowReviewRequestReviewerRepository extends Repository<WorkflowReviewRequestReviewer> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewRequestReviewer, dataSource.manager);
	}

	/** Unlike `setReviewers`, this runs in the caller's transaction and only appends rows. */
	async addReviewers(
		input: {
			workflowReviewRequestId: string;
			userIds: string[];
		},
		trx?: EntityManager,
	): Promise<WorkflowReviewRequestReviewer[]> {
		const uniqueUserIds = [...new Set(input.userIds)];
		if (uniqueUserIds.length === 0) {
			return [];
		}

		const manager = trx ?? this.manager;
		const entities = uniqueUserIds.map((userId) =>
			this.create({
				workflowReviewRequestId: input.workflowReviewRequestId,
				userId,
			}),
		);

		return await manager.save(WorkflowReviewRequestReviewer, entities);
	}

	async setReviewers(
		requestId: string,
		userIds: string[],
	): Promise<WorkflowReviewRequestReviewer[]> {
		const uniqueUserIds = [...new Set(userIds)];

		return await this.manager.transaction(async (tx) => {
			await tx.delete(WorkflowReviewRequestReviewer, {
				workflowReviewRequestId: requestId,
			});

			if (uniqueUserIds.length === 0) {
				return [];
			}

			const entities = uniqueUserIds.map((userId) =>
				this.create({
					workflowReviewRequestId: requestId,
					userId,
				}),
			);

			return await tx.save(WorkflowReviewRequestReviewer, entities);
		});
	}

	async findByRequestId(requestId: string): Promise<WorkflowReviewRequestReviewer[]> {
		return await this.find({
			where: { workflowReviewRequestId: requestId },
			order: { userId: 'ASC' },
		});
	}

	async findByRequestIds(requestIds: string[]): Promise<WorkflowReviewRequestReviewer[]> {
		if (requestIds.length === 0) {
			return [];
		}

		return await this.find({
			where: { workflowReviewRequestId: In(requestIds) },
			order: { userId: 'ASC' },
		});
	}
}

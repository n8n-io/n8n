import type { WorkflowReviewActivityType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, LessThan } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import { WorkflowReviewActivity } from '../entities/workflow-review-activity.ee';
import type { OperationContext } from '../services/transaction';

@Service()
export class WorkflowReviewActivityRepository extends BaseRepository<WorkflowReviewActivity> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewActivity, dataSource.manager);
	}

	async createActivity(
		input: {
			workflowReviewRequestId: string;
			type: WorkflowReviewActivityType;
			data: IDataObject | null;
			createdById: string | null;
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewActivity> {
		const entity = this.create(input);
		return await this.managerFor(ctx).save(WorkflowReviewActivity, entity);
	}

	/**
	 * Newest-first tail of the feed, optionally older than `beforeId`. Callers reverse the
	 * page to present it ascending.
	 */
	async findManyForRequest(
		input: {
			workflowReviewRequestId: string;
			limit: number;
			beforeId?: number;
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewActivity[]> {
		return await this.managerFor(ctx).find(WorkflowReviewActivity, {
			where: {
				workflowReviewRequestId: input.workflowReviewRequestId,
				...(input.beforeId !== undefined ? { id: LessThan(input.beforeId) } : {}),
			},
			order: { id: 'DESC' },
			take: input.limit,
		});
	}
}

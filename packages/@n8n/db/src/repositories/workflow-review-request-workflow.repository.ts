import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';

@Service()
export class WorkflowReviewRequestWorkflowRepository extends Repository<WorkflowReviewRequestWorkflow> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewRequestWorkflow, dataSource.manager);
	}

	async createWorkflowRow(input: {
		id?: string;
		workflowReviewRequestId: string;
		workflowId: string;
		workflowVersionId?: string | null;
	}): Promise<WorkflowReviewRequestWorkflow> {
		const entity = this.create({
			id: input.id,
			workflowReviewRequestId: input.workflowReviewRequestId,
			workflowId: input.workflowId,
			workflowVersionId: input.workflowVersionId ?? null,
		});
		return await this.save(entity);
	}

	async findByRequestId(requestId: string): Promise<WorkflowReviewRequestWorkflow[]> {
		return await this.find({
			where: { workflowReviewRequestId: requestId },
			order: { id: 'ASC' },
		});
	}
}

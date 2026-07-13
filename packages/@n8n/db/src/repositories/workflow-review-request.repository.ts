import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import {
	WorkflowReviewRequest,
	type WorkflowReviewRequestStatus,
} from '../entities/workflow-review-request.ee';

@Service()
export class WorkflowReviewRequestRepository extends Repository<WorkflowReviewRequest> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewRequest, dataSource.manager);
	}

	async createRequest(input: {
		id?: string;
		projectId: string;
		status?: WorkflowReviewRequestStatus;
		title: string;
		description?: string | null;
		createdById: string | null;
		updatedById?: string | null;
	}): Promise<WorkflowReviewRequest> {
		const entity = this.create({
			id: input.id,
			projectId: input.projectId,
			status: input.status ?? 'pending',
			title: input.title,
			description: input.description ?? null,
			createdById: input.createdById,
			updatedById: input.updatedById ?? input.createdById,
			archivedById: null,
			archivedAt: null,
			publishError: null,
			publishErrorAt: null,
		});
		return await this.save(entity);
	}

	async findById(id: string): Promise<WorkflowReviewRequest | null> {
		return await this.findOne({ where: { id } });
	}
}

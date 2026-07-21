import { Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'workflow_review_request_authors' })
export class WorkflowReviewRequestAuthor {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@PrimaryColumn({ type: 'uuid' })
	userId: string;
}

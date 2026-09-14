import { Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'workflow_review_request_reviewers' })
@Index('IDX_workflow_review_request_reviewers_user', ['userId', 'workflowReviewRequestId'])
export class WorkflowReviewRequestReviewer {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@PrimaryColumn({ type: 'uuid' })
	userId: string;
}

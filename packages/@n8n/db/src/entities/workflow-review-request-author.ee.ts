import { Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'workflow_review_request_authors' })
// The primary key leads on `workflowReviewRequestId`, so "which reviews did I author" cannot use
// it. Mirrors the index the reviewers table carries for the same lookup.
@Index('IDX_workflow_review_request_authors_user', ['userId', 'workflowReviewRequestId'])
export class WorkflowReviewRequestAuthor {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@PrimaryColumn({ type: 'uuid' })
	userId: string;
}

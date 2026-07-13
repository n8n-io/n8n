import { Column, Entity, Index } from '@n8n/typeorm';

import { WithStringId } from './abstract-entity';

@Entity({ name: 'workflow_review_request_authors' })
@Index('IDX_workflow_review_request_authors_request_user', ['workflowReviewRequestId', 'userId'], {
	unique: true,
})
@Index('IDX_workflow_review_request_authors_user_id', ['userId'])
export class WorkflowReviewRequestAuthor extends WithStringId {
	@Column({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@Column({ type: 'uuid' })
	userId: string;
}

import { Column, Entity, Unique } from '@n8n/typeorm';

import { WithStringId } from './abstract-entity';

@Entity({ name: 'workflow_review_request_authors' })
@Unique('UQ_workflow_review_request_authors_request_user', [
	'workflowReviewRequestId',
	'userId',
])
export class WorkflowReviewRequestAuthor extends WithStringId {
	@Column({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@Column({ type: 'uuid' })
	userId: string;
}

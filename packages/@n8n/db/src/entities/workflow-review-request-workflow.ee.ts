import { Column, Entity, Unique } from '@n8n/typeorm';

import { WithStringId } from './abstract-entity';

@Entity({ name: 'workflow_review_request_workflow' })
@Unique('UQ_workflow_review_request_workflow_request_workflow', [
	'workflowReviewRequestId',
	'workflowId',
])
export class WorkflowReviewRequestWorkflow extends WithStringId {
	@Column({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowVersionId: string | null;
}

import { Column, Entity, Index } from '@n8n/typeorm';

import { WithStringId } from './abstract-entity';

@Entity({ name: 'workflow_review_request_workflow' })
@Index(
	'IDX_workflow_review_request_workflow_request_workflow',
	['workflowReviewRequestId', 'workflowId'],
	{
		unique: true,
	},
)
@Index(
	'IDX_workflow_review_request_workflow_workflow_version',
	['workflowId', 'workflowVersionId'],
	{
		where: '"workflowVersionId" IS NOT NULL',
	},
)
@Index('IDX_workflow_review_request_workflow_workflow_id', ['workflowId'])
export class WorkflowReviewRequestWorkflow extends WithStringId {
	@Column({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowVersionId: string | null;
}

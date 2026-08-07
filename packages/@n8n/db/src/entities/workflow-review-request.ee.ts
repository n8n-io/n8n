import type {
	WorkflowReviewRequestDecision as WorkflowReviewRequestDecisionType,
	WorkflowReviewRequestState as WorkflowReviewRequestStateType,
} from '@n8n/api-types';
import { Column, Entity, Index } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestampsAndStringId } from './abstract-entity';

export type WorkflowReviewRequestState = WorkflowReviewRequestStateType;
export type WorkflowReviewRequestDecision = WorkflowReviewRequestDecisionType;

export const WorkflowReviewRequestState = {
	Open: 'open',
	Closed: 'closed',
} as const satisfies Record<string, WorkflowReviewRequestStateType>;

export const WorkflowReviewRequestStateList = Object.values(WorkflowReviewRequestState);

export const WorkflowReviewRequestDecision = {
	Pending: 'pending',
	ChangesRequested: 'changes_requested',
	Approved: 'approved',
} as const satisfies Record<string, WorkflowReviewRequestDecisionType>;

export const WorkflowReviewRequestDecisionList = Object.values(WorkflowReviewRequestDecision);

@Entity({ name: 'workflow_review_request' })
@Index('IDX_workflow_review_request_project_state', ['projectId', 'state'])
export class WorkflowReviewRequest extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 16 })
	state: WorkflowReviewRequestStateType;

	@Column({ type: 'varchar', length: 50 })
	decision: WorkflowReviewRequestDecisionType;

	@Column({ type: 'varchar', length: 255 })
	title: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;

	@Column({ type: 'uuid', nullable: true })
	closedById: string | null;

	@DateTimeColumn({ nullable: true })
	approvedAt: Date | null;
}

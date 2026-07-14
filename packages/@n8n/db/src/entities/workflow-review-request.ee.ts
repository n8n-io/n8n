import { Column, Entity } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestampsAndStringId } from './abstract-entity';

export const WorkflowReviewRequestState = {
	Open: 'open',
	Closed: 'closed',
} as const;

export type WorkflowReviewRequestState =
	(typeof WorkflowReviewRequestState)[keyof typeof WorkflowReviewRequestState];

export const WorkflowReviewRequestStateList = Object.values(WorkflowReviewRequestState);

export const WorkflowReviewRequestDecision = {
	Pending: 'pending',
	ChangesRequested: 'changes_requested',
	Approved: 'approved',
} as const;

export type WorkflowReviewRequestDecision =
	(typeof WorkflowReviewRequestDecision)[keyof typeof WorkflowReviewRequestDecision];

export const WorkflowReviewRequestDecisionList = Object.values(WorkflowReviewRequestDecision);

@Entity({ name: 'workflow_review_request' })
export class WorkflowReviewRequest extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 16 })
	state: WorkflowReviewRequestState;

	@Column({ type: 'varchar', length: 50 })
	decision: WorkflowReviewRequestDecision;

	@Column({ type: 'varchar', length: 512 })
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

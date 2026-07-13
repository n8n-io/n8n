import { Column, Entity, Index } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestampsAndStringId } from './abstract-entity';

export const WorkflowReviewRequestStatus = {
	Pending: 'pending',
	ChangesRequested: 'changes_requested',
	Approved: 'approved',
} as const;

export type WorkflowReviewRequestStatus =
	(typeof WorkflowReviewRequestStatus)[keyof typeof WorkflowReviewRequestStatus];

export const WorkflowReviewRequestStatusList = Object.values(WorkflowReviewRequestStatus);

@Entity({ name: 'workflow_review_request' })
@Index(['projectId', 'status', 'createdAt'])
@Index('IDX_workflow_review_request_open_project_created', ['projectId', 'createdAt'], {
	where: `status IN ('${WorkflowReviewRequestStatus.Pending}', '${WorkflowReviewRequestStatus.ChangesRequested}') AND "archivedAt" IS NULL`,
})
export class WorkflowReviewRequest extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 50 })
	status: WorkflowReviewRequestStatus;

	@Column({ type: 'varchar', length: 512 })
	title: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;

	@Column({ type: 'uuid', nullable: true })
	archivedById: string | null;

	@DateTimeColumn({ nullable: true })
	archivedAt: Date | null;

	@Column({ type: 'text', nullable: true })
	publishError: string | null;

	@DateTimeColumn({ nullable: true })
	publishErrorAt: Date | null;
}

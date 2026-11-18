import type { WorkflowTestRunResult } from '@n8n/api-types';
import { JsonColumn, WithTimestamps } from '@n8n/db';
import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

export type WorkflowTestReviewRunStatus = 'running' | 'passed' | 'failed' | 'error';

/**
 * A run of a test file on the version that a review pins. The file belongs to
 * the reviewed workflow, or to a workflow that calls it as a sub-workflow.
 */
@Entity({ name: 'workflow_test_review_run' })
@Index(['workflowReviewRequestId', 'workflowId'])
export class WorkflowTestReviewRunEntity extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@BeforeInsert()
	generateId() {
		if (!this.id) this.id = uuidv7();
	}

	@Column({ type: 'varchar', length: 36 })
	workflowReviewRequestId: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	workflowVersionId: string;

	/** `null` on rows from before callers ran, which ran the reviewed workflow's own tests. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	testWorkflowId: string | null;

	@Column({ type: 'varchar', length: 16 })
	status: WorkflowTestReviewRunStatus;

	@JsonColumn({ nullable: true })
	result: WorkflowTestRunResult | null;
}

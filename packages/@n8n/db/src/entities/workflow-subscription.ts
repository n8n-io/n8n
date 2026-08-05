import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import { WorkflowCredentialBinding } from './workflow-credential-binding';

/**
 * One person's own schedule for a catalog workflow.
 *
 * Several rows may point at the same grant: one person can want the same
 * workflow on two schedules, which is why this is not keyed on
 * `(workflowId, userId)` the way the grant is. The composite foreign key into
 * the grant is what makes revoking consent take the schedules with it — but
 * only in the database. The scheduler jobs a subscription provisions are not
 * reachable from here, so deleting or pausing one must deprovision them first.
 */
@Entity({ name: 'workflow_subscription' })
@Index(['workflowId', 'userId'])
@Index(['userId'])
export class WorkflowSubscription extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'uuid' })
	userId: string;

	/** A 5- or 6-field cron expression, read in {@link timezone}. */
	@Column({ type: 'varchar', length: 255 })
	cronExpression: string;

	/** IANA zone, e.g. `Europe/Berlin`. */
	@Column({ type: 'varchar', length: 255 })
	timezone: string;

	/**
	 * Values for the fields the workflow's trigger declares. Filtered against
	 * that contract on every run, so a field the builder later removes is
	 * dropped rather than passed through.
	 */
	@JsonColumn()
	inputs: IDataObject;

	/** A paused subscription keeps its row and inputs; its scheduler jobs are removed. */
	@Column({ type: 'boolean', default: true })
	enabled: boolean;

	@ManyToOne('WorkflowCredentialBinding', { onDelete: 'CASCADE' })
	@JoinColumn([
		{ name: 'workflowId', referencedColumnName: 'workflowId' },
		{ name: 'userId', referencedColumnName: 'userId' },
	])
	binding: WorkflowCredentialBinding;
}

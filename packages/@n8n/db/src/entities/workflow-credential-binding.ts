import { Column, Entity, Index, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';
import { User } from './user';
import { WorkflowEntity } from './workflow-entity';

export type WorkflowCredentialBindingStatus = 'active' | 'revoked';

/**
 * A person's consent for a workflow to run as them while they are not present.
 *
 * One grant per (workflow, person): the pair is the grant, so it is the key.
 * Running a workflow yourself needs no row — you are there, and identity comes
 * from the session. This exists for the unattended case, where there is no
 * session to take identity from.
 *
 * Revoking sets `status` rather than deleting, so the fact that consent once
 * existed survives. Note that neither revoking nor the cascade from a deleted
 * workflow or user removes the scheduler jobs the grant made possible: those
 * must be deprovisioned explicitly before the row changes.
 */
@Entity({ name: 'workflow_credential_binding' })
@Index(['userId'])
export class WorkflowCredentialBinding extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@PrimaryColumn({ type: 'uuid' })
	userId: string;

	@Column({ type: 'varchar', length: 16, default: 'active' })
	status: WorkflowCredentialBindingStatus;

	/** When consent was last given; reset when a revoked grant is renewed. */
	@DateTimeColumn()
	consentAt: Date;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	workflow: WorkflowEntity;

	@ManyToOne('User', { onDelete: 'CASCADE' })
	user: User;
}

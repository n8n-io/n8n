import type { PromotionDirection } from '@n8n/api-types';
import { Project, User, WithTimestamps } from '@n8n/db';
import {
	BeforeInsert,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { PromotionEnvironment } from './promotion-environment.entity';

export type PromotionOwnerRequestResourceKind = 'credential' | 'workflow';
export type PromotionOwnerRequestState = 'open' | 'closed';
/** `dismissed`: a recipient closed it. `satisfied`: the resource reached the branch or the destination. */
export type PromotionOwnerRequestCloseReason = 'dismissed' | 'satisfied';

/**
 * "Ask the owner": a user asks the owner of a resource to promote or apply it. The row keeps the
 * operation and the environment, so the owner gets the same operation on the same environment.
 */
@Entity('promotion_owner_request')
@Index(['state', 'updatedAt'])
@Index(['requesterId', 'environmentId', 'direction', 'resourceKind', 'resourceId'], {
	unique: true,
	where: '"state" = \'open\'',
})
export class PromotionOwnerRequest extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@BeforeInsert()
	generateId() {
		if (!this.id) this.id = uuidv7();
	}

	@Index()
	@Column({ type: 'uuid' })
	environmentId: string;

	/** Copied from the environment: `promote` asks for a Promote, `apply` asks for an Apply. */
	@Column({ type: 'varchar', length: 16 })
	direction: PromotionDirection;

	@Column({ type: 'varchar', length: 16 })
	resourceKind: PromotionOwnerRequestResourceKind;

	@Column({ type: 'varchar', length: 36 })
	resourceId: string;

	@Column({ type: 'varchar', length: 255 })
	resourceName: string;

	/** The credential type that the node of the requester holds. NULL for a workflow. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	credentialType: string | null;

	/** NULL when the owner project is not on this instance. The instance admins get the request. */
	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	ownerProjectId: string | null;

	@Column({ type: 'uuid' })
	requesterId: string;

	/** The workflow of the requester that holds the reference. Never shown to a recipient. */
	@Column({ type: 'varchar', length: 36 })
	consumerWorkflowId: string;

	@Column({ type: 'varchar', length: 16, default: 'open' })
	state: PromotionOwnerRequestState;

	@Column({ type: 'varchar', length: 16, nullable: true })
	closeReason: PromotionOwnerRequestCloseReason | null;

	@ManyToOne(() => PromotionEnvironment, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'environmentId' })
	environment: Relation<PromotionEnvironment>;

	@ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'ownerProjectId' })
	ownerProject: Relation<Project> | null;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'requesterId' })
	requester: Relation<User>;
}

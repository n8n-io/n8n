import type { PromotionReviewState } from '@n8n/api-types';
import { DateTimeColumn, generateNanoId, User, WithCreatedAt } from '@n8n/db';
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

import { PromotionConnection } from './promotion-connection.entity';

/**
 * One Promote that opened a review on a Git host. The row holds only what n8n
 * knows and the host does not: who promoted, what was pushed, who approved in
 * n8n. The host owns the review while it is `open`; n8n owns the state once it
 * is terminal. Title, URL and conflicts are read from the host.
 */
@Entity('promotion_review')
@Index(['state', 'createdAt'])
export class PromotionReview extends WithCreatedAt {
	@PrimaryColumn('varchar')
	id: string;

	@BeforeInsert()
	generateId() {
		if (!this.id) this.id = generateNanoId();
	}

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	connectionId: string | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'varchar', length: 255 })
	branchName: string;

	@Column({ type: 'varchar', length: 64 })
	commitSha: string;

	/**
	 * Opaque reference to the review on the host. The prefix names the host kind
	 * and the host client parses the rest, e.g. `gitlab:<projectId>!<iid>`.
	 */
	@Column({ type: 'varchar', length: 255 })
	remoteReviewId: string;

	@Column({ type: 'varchar', length: 16, default: 'open' })
	state: PromotionReviewState;

	@DateTimeColumn({ nullable: true })
	mergedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	closedAt: Date | null;

	/** The n8n user who approved in n8n. The host only sees the token's bot user. */
	@Column({ type: 'uuid', nullable: true })
	approvedById: string | null;

	@DateTimeColumn({ nullable: true })
	approvedAt: Date | null;

	@ManyToOne(() => PromotionConnection, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'connectionId' })
	connection: Relation<PromotionConnection> | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'createdById' })
	createdBy: Relation<User> | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'approvedById' })
	approvedBy: Relation<User> | null;
}

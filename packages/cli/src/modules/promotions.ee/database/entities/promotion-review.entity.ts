import type { PromotionReviewState, PromotionReviewType } from '@n8n/api-types';
import { DateTimeColumn, User, WithCreatedAt } from '@n8n/db';
import {
	BeforeInsert,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { PromotionEnvironment } from './promotion-environment.entity';
import type { PromotionRun } from './promotion-run.entity';

/**
 * The gate on a promote. Several runs can point at one review. The host owns
 * the review while it is `open` or `changes_requested`. n8n owns the state once
 * it is terminal. Title, URL and conflicts are read from the host.
 */
@Entity('promotion_review')
@Index(['state', 'createdAt'])
@Index('IDX_promotion_review_projectId', ['projectId'])
@Index(['environmentId', 'remoteReviewId'], {
	unique: true,
	where: '"remoteReviewId" IS NOT NULL',
})
export class PromotionReview extends WithCreatedAt {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@BeforeInsert()
	generateId() {
		if (!this.id) this.id = uuidv7();
	}

	@Index()
	@Column({ type: 'uuid', nullable: true })
	environmentId: string | null;

	/**
	 * The team project whose changes the review holds. NULL for a promotion of the whole
	 * instance, or after the project is deleted. Only instance owners and admins can see and
	 * approve those reviews. The foreign key to `project` is in the migration only, like
	 * `PromotionEnvironmentProject.projectId`.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	/** Where the review lives. The application checks the value. */
	@Column({ type: 'varchar', length: 16 })
	type: PromotionReviewType;

	/**
	 * Host reference for {@link type}. GitLab stores `<projectId>!<iid>`.
	 * NULL when the review lives in n8n.
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	remoteReviewId: string | null;

	@Column({ type: 'varchar', length: 32, default: 'open' })
	state: PromotionReviewState;

	/** Time of the latest state change. NULL until the first change. */
	@DateTimeColumn({ nullable: true })
	lastStateChangeAt: Date | null;

	/** The n8n user whose Promote opened this review. NULL after that user is deleted. */
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	/**
	 * The n8n user who claimed the approval. It names the approver only on a merged review.
	 * On other states it is a claim in progress, or one that a stopped request left.
	 * Not copied from the host.
	 */
	@Column({ type: 'uuid', nullable: true })
	approvedById: string | null;

	/** When the approval was claimed. On an open review, an old claim is stale. */
	@DateTimeColumn({ nullable: true })
	approvedAt: Date | null;

	@ManyToOne(() => PromotionEnvironment, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'environmentId' })
	environment: Relation<PromotionEnvironment> | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'createdById' })
	createdBy: Relation<User> | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'approvedById' })
	approvedBy: Relation<User> | null;

	@OneToMany('PromotionRun', 'review')
	runs: Relation<PromotionRun>[];
}

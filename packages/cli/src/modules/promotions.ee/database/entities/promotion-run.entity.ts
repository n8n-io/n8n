import type { PromotionDirection, PromotionRunDetails, PromotionRunType } from '@n8n/api-types';
import { JsonColumn, User, WithCreatedAt } from '@n8n/db';
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
import { PromotionReview } from './promotion-review.entity';

/**
 * One successful Promote or Apply. Direction is a copy, so the row can still
 * say Promote or Apply after the environment is deleted. Git data lives in `details`.
 * `reviewId` stays NULL when the push has no review.
 */
@Entity('promotion_run')
export class PromotionRun extends WithCreatedAt {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@BeforeInsert()
	generateId() {
		if (!this.id) this.id = uuidv7();
	}

	@Index()
	@Column({ type: 'uuid', nullable: true })
	environmentId: string | null;

	/** Copied from the environment when the run is written. */
	@Column({ type: 'varchar', length: 16 })
	direction: PromotionDirection;

	/** How the package moved. The application checks the value. */
	@Column({ type: 'varchar', length: 16 })
	type: PromotionRunType;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	/** Payload for {@link type}. A git run stores the branch and the commit. */
	@JsonColumn({ nullable: true })
	details: PromotionRunDetails | null;

	/** Not unique. An amend adds another run for the same review. */
	@Index()
	@Column({ type: 'uuid', nullable: true })
	reviewId: string | null;

	@ManyToOne(() => PromotionEnvironment, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'environmentId' })
	environment: Relation<PromotionEnvironment> | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'createdById' })
	createdBy: Relation<User> | null;

	@ManyToOne(
		() => PromotionReview,
		(review) => review.runs,
		{
			onDelete: 'SET NULL',
			nullable: true,
		},
	)
	@JoinColumn({ name: 'reviewId' })
	review: Relation<PromotionReview> | null;
}

import type { PromotionDirection } from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { PromotionEnvironment } from './promotion-environment.entity';

/**
 * The `(projectId, direction)` primary key gives a project one environment for
 * each direction at most. Which projects and environments are eligible spans
 * tables, so the service checks that rather than the schema.
 *
 * The foreign key to `project` is declared in the migration and not as a
 * `@ManyToOne`, to keep this module apart from the core `Project` entity. This
 * follows the workflow-reviews pattern.
 */
@Entity('promotion_environment_project')
export class PromotionEnvironmentProject extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	/** Copied from the environment when the link is created. */
	@PrimaryColumn({ type: 'varchar', length: 16 })
	direction: PromotionDirection;

	@Index()
	@Column({ type: 'uuid' })
	environmentId: string;

	@ManyToOne(() => PromotionEnvironment, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'environmentId' })
	environment: Relation<PromotionEnvironment>;
}

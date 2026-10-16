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

import { PromotionConnection } from './promotion-connection.entity';

/**
 * Links a project to a promotion connection. The `projectId` primary key keeps a
 * project on one connection at most. A connection can hold many links, or none.
 * Which projects and connections are eligible spans tables, so the service checks
 * that rather than the schema.
 *
 * The foreign key to `project` is declared in the migration and not as a
 * `@ManyToOne`, to keep this module apart from the core `Project` entity. This
 * follows the workflow-reviews pattern.
 */
@Entity('promotion_connection_project')
export class PromotionConnectionProject extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	connectionId: string;

	@ManyToOne(() => PromotionConnection, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'connectionId' })
	connection: Relation<PromotionConnection>;
}

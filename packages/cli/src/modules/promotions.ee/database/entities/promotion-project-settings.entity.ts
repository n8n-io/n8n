import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

/**
 * Promotion settings of a team project. A project without a row uses the defaults.
 *
 * The foreign key to `project` is declared in the migration and not as a
 * `@ManyToOne`, to keep this module apart from the core `Project` entity.
 */
@Entity('promotion_project_settings')
export class PromotionProjectSettings extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	/** Set by an instance admin. When true, this project can have its own environments. */
	@Column({ default: false })
	allowEnvironments: boolean;
}

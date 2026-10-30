import type { SkillSource } from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

export type { SkillSource };

/**
 * A skill, identified by its id only. `projectId` is the team or personal project whose
 * agents can use it. A skill without a project belongs to the instance.
 * The name and content live in `SkillVersion` rows.
 */
@Entity({ name: 'skill' })
export class Skill extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'boolean', default: false })
	availableToAssistant: boolean;

	@Column({ type: 'boolean', default: false })
	availableToMCP: boolean;

	/**
	 * How the skill was created: `ui`, `agent`, `mcp`, `assistant`, `import` from a package, or
	 * `github` for a synced skill (see `SkillSource`). The column has no CHECK, so a new value
	 * needs no migration.
	 */
	@Column({ type: 'varchar', length: 16 })
	source: SkillSource;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}

import type { SkillSource } from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

export type { SkillSource };

/**
 * A skill, identified by its id only. One target: `projectId` (a team
 * or personal project, used by its agents), `agentId` (only that agent can use it; the
 * project is the agent's), or neither (the instance).
 * The name and content live in `SkillVersion` rows.
 */
@Entity({ name: 'skill' })
export class Skill extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	agentId: string | null;

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

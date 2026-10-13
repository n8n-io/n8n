import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** How a skill was created: `ui` in the skills hub, `agent` from the agent builder or the migration. */
export type SkillSource = 'ui' | 'agent';

/**
 * A skill in the skills hub, identified by its id only. One target: `projectId` (a team
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

	@Column({ type: 'varchar', length: 16 })
	source: SkillSource;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}

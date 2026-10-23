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

	@Column({ type: 'varchar', length: 16 })
	source: SkillSource;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}

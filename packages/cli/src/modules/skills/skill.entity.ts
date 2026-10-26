import type { SkillScope, SkillSource } from '@n8n/api-types';
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

	@Column({ type: 'varchar', length: 16 })
	source: SkillSource;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}

/** A skill with a project is a project skill. Any other skill belongs to the instance. */
export function scopeOf(skill: Pick<Skill, 'projectId'>): SkillScope {
	return skill.projectId ? 'project' : 'instance';
}

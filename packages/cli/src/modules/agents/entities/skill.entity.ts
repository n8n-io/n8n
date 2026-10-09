import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

export type SkillSource = 'ui' | 'upload' | 'agent';

/**
 * A skill in the skills hub, identified by its id only. One target: `userId` ("Just
 * you", used by the assistant only, never by agents), `projectId` (a team or personal
 * project, used by its agents and its assistant sessions), or neither (the instance).
 * The name and content live in `SkillVersion` rows.
 */
@Entity({ name: 'skill' })
export class Skill extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'varchar', length: 16 })
	source: SkillSource;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}

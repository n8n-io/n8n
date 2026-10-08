import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * SKILL.md frontmatter fields other than name and description, e.g. `allowed-tools`,
 * stored as given. The standard allows objects and lists, so values are not narrowed.
 */
export type SkillFrontmatter = Record<string, unknown>;

/**
 * One saved version of a skill. Every Save adds the next number; a version never
 * changes. Agents read the latest one unless a revert pinned an older one.
 */
@Entity({ name: 'skill_version' })
@Index(['skillId', 'version'], { unique: true })
export class SkillVersion extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@Column({ type: 'varchar', length: 36 })
	skillId: string;

	@Column({ type: 'int' })
	version: number;

	/** Free-text name, as it was when this version was saved. */
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 1024 })
	description: string;

	@Column({ type: 'text' })
	instructions: string;

	@JsonColumn({ nullable: true })
	frontmatter: SkillFrontmatter | null;

	/**
	 * sha256 of name, description, instructions, frontmatter and files (see
	 * `skillContentHash`). Save creates no version when the content matches the latest one.
	 */
	@Column({ type: 'varchar', length: 64 })
	contentHash: string;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}

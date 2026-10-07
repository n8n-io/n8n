import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** SKILL.md frontmatter fields other than name and description, e.g. `allowed-tools`. */
export type SkillFrontmatter = Record<string, string>;

/**
 * Content of a skill. `version` NULL is the editable draft (one per skill); Save
 * creates the numbered versions, which never change and which agents read.
 */
@Entity({ name: 'skill_version' })
@Index(['skillId', 'version'], { unique: true })
@Index(['skillId', 'contentHash'])
export class SkillVersion extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@Column({ type: 'varchar', length: 36 })
	skillId: string;

	@Column({ type: 'int', nullable: true })
	version: number | null;

	/** Free-text name. The draft holds the current name, a saved version the name it was saved with. */
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
	 * `skillContentHash`). Save creates no version when the draft matches the latest one.
	 */
	@Column({ type: 'varchar', length: 64 })
	contentHash: string;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}

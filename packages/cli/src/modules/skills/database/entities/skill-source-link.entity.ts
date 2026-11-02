import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** The sync state of one synced skill. Badges and counts read it. */
export type SkillSourceLinkState =
	| 'up_to_date'
	| 'update_available'
	| 'update_blocked'
	| 'source_unavailable';

/**
 * Makes one skill a synced skill of one source. A pending update waits here, not on the skill
 * or a version, so nothing that reads skills sees content that nobody reviewed. Deleting the
 * skill deletes the link. Deleting the source deletes its links and keeps the skills.
 */
@Entity({ name: 'skill_source_link' })
export class SkillSourceLink extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	skillId: string;

	@Index()
	@Column({ type: 'uuid' })
	sourceId: string;

	/** Where the skill is in the source, such as its folder. */
	@JsonColumn()
	remoteRef: Record<string, unknown>;

	/** Source revision of the content in the latest accepted version. */
	@Column({ type: 'varchar', length: 255 })
	baseRevision: string;

	@Column({ type: 'varchar', length: 64 })
	baseContentHash: string;

	/** The skill content of the update that waits for review. */
	@JsonColumn({ nullable: true })
	pendingContent: Record<string, unknown> | null;

	/** Accept compares it with the hash that the user reviewed. */
	@Column({ type: 'varchar', length: 64, nullable: true })
	pendingContentHash: string | null;

	@JsonColumn({ nullable: true })
	pendingScan: Record<string, unknown> | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	pendingRevision: string | null;

	/** A check hides an update with this content hash, until the content changes again. */
	@Column({ type: 'varchar', length: 64, nullable: true })
	skippedContentHash: string | null;

	@Column({ type: 'varchar', length: 32, default: 'up_to_date' })
	state: SkillSourceLinkState;

	/** Paths of the files that the import left out. */
	@JsonColumn()
	skippedFiles: string[];
}

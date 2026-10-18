import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** "branch" gets updates. A tag or a commit is imported once. */
export type SkillGitRefType = 'branch' | 'tag' | 'commit';

export type SkillGitLinkStatus = 'ok' | 'unavailable' | 'rate_limited';

/**
 * The folder in a public GitHub repository that a skill comes from. While this row
 * exists, the skill is read-only in n8n: changes arrive from GitHub as updates.
 */
@Entity({ name: 'skill_git_link' })
@Index(['owner', 'repo', 'ref'])
export class SkillGitLink extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	skillId: string;

	@Column({ type: 'varchar', length: 100 })
	owner: string;

	@Column({ type: 'varchar', length: 100 })
	repo: string;

	@Column({ type: 'varchar', length: 255 })
	ref: string;

	@Column({ type: 'varchar', length: 16 })
	refType: SkillGitRefType;

	/** The folder of SKILL.md, without leading or trailing slashes. Empty for the root. */
	@Column({ type: 'varchar', length: 512 })
	path: string;

	/** The commit of the latest version that came from GitHub. */
	@Column({ type: 'varchar', length: 40 })
	syncedCommitSha: string;

	/** The newest commit n8n handled: imported, accepted, skipped or waiting as an update. */
	@Column({ type: 'varchar', length: 40 })
	seenCommitSha: string;

	/** Git tree SHA of the folder at `seenCommitSha`. The same SHA means no change. */
	@Column({ type: 'varchar', length: 40, nullable: true })
	seenTreeSha: string | null;

	@Column({ type: 'varchar', length: 16, default: 'ok' })
	status: SkillGitLinkStatus;

	@Column({ type: 'varchar', length: 512, nullable: true })
	lastError: string | null;

	@DateTimeColumn({ nullable: true })
	lastCheckedAt: Date | null;
}

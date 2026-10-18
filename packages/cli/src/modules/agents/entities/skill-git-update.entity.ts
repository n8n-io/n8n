import { DateTimeColumn, JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';
import type { SkillGitCheckResult, SkillGitSkippedFile } from '@n8n/api-types';

import type { SkillContent } from '../skills/skill-content-hash';

/** "blocked" failed the security check: no one can accept it. */
export type SkillGitUpdateStatus = 'pending' | 'blocked';

/**
 * New content for a synced skill that n8n found in GitHub. It waits here until a person
 * accepts it (it becomes the next version) or skips it. Agents never read this table.
 */
@Entity({ name: 'skill_git_update' })
export class SkillGitUpdate extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	skillId: string;

	@Column({ type: 'varchar', length: 40 })
	fromCommitSha: string;

	@Column({ type: 'varchar', length: 40 })
	toCommitSha: string;

	@Column({ type: 'varchar', length: 1024, nullable: true })
	commitMessage: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	commitAuthor: string | null;

	@DateTimeColumn({ nullable: true })
	committedAt: Date | null;

	@JsonColumn()
	content: SkillContent;

	@Column({ type: 'varchar', length: 64 })
	contentHash: string;

	@JsonColumn()
	checkResult: SkillGitCheckResult;

	@JsonColumn({ nullable: true })
	skippedFiles: SkillGitSkippedFile[] | null;

	@Column({ type: 'varchar', length: 16 })
	status: SkillGitUpdateStatus;
}

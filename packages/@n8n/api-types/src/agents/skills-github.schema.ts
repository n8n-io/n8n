import { z } from 'zod';

import type {
	SkillCheckFinding,
	SkillCheckLevel,
	SkillCheckResult,
	SkillSkippedFile,
} from './skill-check.schema';
import type { AgentSkill } from './types';
import { Z } from '../zod-class';

/** "branch" gets updates. A tag or a commit is imported once. */
export type SkillGitRefType = 'branch' | 'tag' | 'commit';

export type SkillGitLinkStatus = 'ok' | 'unavailable' | 'rate_limited';

export type SkillGitCheckLevel = SkillCheckLevel;
export type SkillGitFinding = SkillCheckFinding;
export type SkillGitCheckResult = SkillCheckResult;
export type SkillGitSkippedFile = SkillSkippedFile;

/** Where a synced skill comes from, and what n8n knows about it now. */
export type SkillGitSourceInfo = {
	owner: string;
	repo: string;
	ref: string;
	refType: SkillGitRefType;
	/** The folder of SKILL.md in the repository. Empty for the repository root. */
	path: string;
	/** Link to the folder on github.com at the followed ref. */
	htmlUrl: string;
	/** The commit of the latest version that came from GitHub. */
	syncedCommitSha: string;
	status: SkillGitLinkStatus;
	lastError: string | null;
	lastCheckedAt: string | null;
	/** The update that waits for a decision, if any. */
	update: { status: 'pending' | 'blocked'; toCommitSha: string } | null;
};

const commitShaSchema = z.string().regex(/^[0-9a-f]{40}$/, 'Commit SHA must be 40 hex characters');

const githubLinkSchema = z.string().trim().min(1).max(2048);

/** Reads a GitHub link and lists the skills in it. Nothing is stored. */
export class DiscoverGitHubSkillsDto extends Z.class({
	url: githubLinkSchema,
}) {}

/** One folder with a SKILL.md, as n8n found and checked it. */
export type GitHubSkillCandidate = {
	/** The folder of SKILL.md. Empty for the repository root. */
	path: string;
	name: string;
	description: string;
	check: SkillGitCheckResult;
	skippedFiles: SkillGitSkippedFile[];
	/**
	 * Where this folder is already synced from the same repository. `projectId` null is
	 * the instance. The modal disables the folder when the chosen place is in the list.
	 */
	importedTo: Array<{ projectId: string | null }>;
};

export type DiscoverGitHubSkillsResponse = {
	owner: string;
	repo: string;
	ref: string;
	refType: SkillGitRefType;
	/** The exact commit n8n read. Send it back to import the same content. */
	commitSha: string;
	skills: GitHubSkillCandidate[];
};

export class ImportGitHubSkillsDto extends Z.class({
	url: githubLinkSchema,
	commitSha: commitShaSchema,
	paths: z.array(z.string().max(512)).min(1).max(50),
	scope: z.enum(['project', 'instance']),
	/** Required when `scope` is `project`, absent otherwise. */
	projectId: z.string().max(36).optional(),
	/** Required when a chosen skill has warnings ("review"). */
	acknowledgeWarnings: z.boolean().optional(),
}) {}

export type ImportGitHubSkillsResponse = {
	created: Array<{ path: string; skillId: string; name: string }>;
	failed: Array<{ path: string; message: string }>;
};

/** The update that waits for a synced skill, with its content. */
export type SkillGitUpdateDetail = {
	skillId: string;
	fromCommitSha: string;
	toCommitSha: string;
	commitMessage: string | null;
	commitAuthor: string | null;
	committedAt: string | null;
	status: 'pending' | 'blocked';
	checkResult: SkillGitCheckResult;
	skippedFiles: SkillGitSkippedFile[];
	/** The content the update would save. */
	skill: AgentSkill;
	/** The latest saved version the update replaces. */
	latestVersion: number;
};

/** Accepts the update that waits. `toCommitSha` must match it, so a newer update is not accepted blind. */
export class AcceptSkillGitUpdateDto extends Z.class({
	toCommitSha: commitShaSchema,
	acknowledgeWarnings: z.boolean().optional(),
}) {}

export class SkipSkillGitUpdateDto extends Z.class({
	toCommitSha: commitShaSchema,
}) {}

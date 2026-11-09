import { z } from 'zod';

import { Z } from '../zod-class';

/**
 * Why a Skill Sync action failed, or why one skill could not come in. Telemetry and the
 * editor use the same codes. The build spec lists them in Appendix C.
 */
export const SKILL_SOURCE_REASONS = [
	'invalid_url',
	'unsupported_provider',
	'not_found',
	'rate_limited',
	'unreachable',
	'no_skills_found',
	'too_many_skills',
	'too_deep',
	'archive_too_large',
	'parse_error',
	'blocked_by_check',
	'review_required',
	'name_taken',
	'duplicate_source',
	'credential_invalid',
	'credential_missing',
	'credential_out_of_scope',
	'host_blocked',
] as const;

export type SkillSourceReason = (typeof SKILL_SOURCE_REASONS)[number];

/** Where a source puts its skills: Global (`instance`), or a team or personal project. */
export const skillSourceScopeSchema = z.enum(['instance', 'project']);

const skillSourceScope = {
	scope: skillSourceScopeSchema,
	/** Required when `scope` is `project`, absent otherwise. */
	projectId: z.string().max(36).optional(),
};

const skillSourceTarget = {
	/** A link to a repository, a folder, or one SKILL.md. */
	url: z.string().trim().min(1).max(2048),
	...skillSourceScope,
	/**
	 * The n8n credential that reads a private source. Absent for a public source. The scope
	 * must accept it, and the user must be able to use it.
	 */
	credentialId: z.string().min(1).max(36).optional(),
};

/** Reads a link and lists the skills in it, for the picker. Writes nothing. */
export class DiscoverSkillSourceDto extends Z.class(skillSourceTarget) {}

export const SKILL_SOURCE_MAX_SKILLS = 200;

/** Connects the source in the scope and imports the picked skills. */
export class ConnectSkillSourceDto extends Z.class({
	...skillSourceTarget,
	/** The `key` of each picked skill, as discover answered it. */
	skillKeys: z.array(z.string().min(1).max(2048)).min(1).max(SKILL_SOURCE_MAX_SKILLS),
	/**
	 * The `key` of each picked skill that the picker showed as needing review, when the user
	 * ticked "I reviewed the warnings". Connect imports a skill that needs review only when its
	 * key is in this list.
	 */
	reviewedSkillKeys: z.array(z.string().min(1).max(2048)).max(SKILL_SOURCE_MAX_SKILLS).optional(),
}) {}

/** The source that a link points to. */
export type SkillSourceSummary = {
	type: 'github';
	/** Such as `owner/repository`. */
	label: string;
	/** The branch, or null for a source type without branches. */
	ref: string | null;
	/** The folder in the source that the link points to. Empty for the whole source. */
	path: string;
	webUrl: string;
};

/**
 * Whether the scope can take the source. `blocked`: the same source is in Global or in the
 * chosen scope. `sourceId` is set when the user may add more skills to that source.
 * `warning`: the same source is in other projects that the user can see.
 */
export type SkillSourceDuplicate =
	| { kind: 'none' }
	| { kind: 'blocked'; where: 'global' | 'scope'; sourceId: string | null }
	| { kind: 'warning'; projects: Array<{ id: string; name: string }> };

/** The rules of the security check. The build spec lists them in Appendix B. */
export const SKILL_SCAN_RULES = [
	'invalid_skill',
	'over_limit',
	'file_skipped',
	'hidden_unicode',
	'new_url',
	'permission_change',
	'suspicious_phrase',
	'lossy_conversion',
] as const;

export type SkillScanRule = (typeof SKILL_SCAN_RULES)[number];

/** `info` only tells the user something. It does not change the verdict. */
export type SkillScanSeverity = 'blocked' | 'needs_review' | 'info';

export type SkillScanVerdict = 'pass' | 'needs_review' | 'blocked';

export type SkillScanFinding = {
	rule: SkillScanRule;
	severity: SkillScanSeverity;
	/** `SKILL.md`, or the path of a file in the skill folder. */
	file?: string;
	/** English text for logs and for a reviewer. Telemetry sends only the rule. */
	detail: string;
	/** The linked domain of a `new_url` finding. */
	domain?: string;
};

/** The most severe finding gives the verdict. No one can override `blocked`. */
export type SkillScanResult = { verdict: SkillScanVerdict; findings: SkillScanFinding[] };

/** One skill in the picker. */
export type DiscoveredSkill = {
	/** Opaque. Send it back in `skillKeys`. */
	key: string;
	/** Where the skill is in the source, such as its folder. */
	location: string;
	/** Null when n8n cannot read the skill. `error` then says why. */
	name: string | null;
	description: string | null;
	/** Files that the import leaves out, such as scripts. */
	skippedFiles: string[];
	/** The chosen scope already has a skill with this name. */
	nameTaken: boolean;
	error: { reason: SkillSourceReason; message: string } | null;
	/** The security check. Null when the skill is gone from the source. */
	check: SkillScanResult | null;
	webUrl: string;
};

export type SkillSourceDiscovery = {
	source: SkillSourceSummary;
	duplicate: SkillSourceDuplicate;
	skills: DiscoveredSkill[];
	/** True when the source has more skills than n8n lists (`too_many_skills`). */
	truncated: boolean;
	/** Skills that n8n did not list, as they are deeper in the source than n8n looks (`too_deep`). */
	tooDeep?: number;
};

export type SkillSourceConnectResponse = {
	sourceId: string;
	imported: Array<{ key: string; skillId: string; name: string }>;
	/** Picked skills that did not come in. The others did. */
	failed: Array<{ key: string; name: string | null; reason: SkillSourceReason }>;
};

/**
 * The sync state of one synced skill. `update_available` and `update_blocked` mean that the
 * source has new content that waits for review, and that the security check blocked it.
 */
export type SkillSyncState =
	| 'up_to_date'
	| 'update_available'
	| 'update_blocked'
	| 'source_unavailable';

/** The answer of Check now. */
export type SkillSourceCheckResponse = {
	/** The source, such as `owner/repository`. */
	label: string;
	/** Skills of the source with an update that waits for review, after the check. */
	updatesFound: number;
	/** True when the source was checked less than a minute ago, so n8n did not check it again. */
	throttled: boolean;
	lastCheckedAt: string | null;
};

/** Where a synced skill comes from, for the "Synced from" banner. */
export type SkillSyncedFrom = {
	sourceId: string;
	type: 'github';
	/** Such as `owner/repository`. */
	label: string;
	/** The page of the skill in the source. */
	webUrl: string;
	/** Whether the user may stop syncing the skill, which makes it a normal skill. */
	canStopSyncing: boolean;
};

/** The credentials that can read a private source in a scope, for the credential select. */
export class ListSkillSourceCredentialsQueryDto extends Z.class(skillSourceScope) {}

/** A credential that a source in the scope accepts and that the user can use. */
export type SkillSourceCredentialOption = { id: string; name: string; type: string };

/** The repositories that a credential can read, to pick one in place of a link. */
export class ListSkillSourceRepositoriesQueryDto extends Z.class({
	...skillSourceScope,
	credentialId: z.string().min(1).max(36),
}) {}

/** One repository in the repository select. */
export type SkillSourceRepositoryOption = {
	owner: string;
	name: string;
	private: boolean;
	/** The link to send as `url` to discover and connect. */
	url: string;
};

export type SkillSourceRepositoryList = {
	repositories: SkillSourceRepositoryOption[];
	/** True when the credential can read more repositories than n8n lists. */
	truncated: boolean;
};

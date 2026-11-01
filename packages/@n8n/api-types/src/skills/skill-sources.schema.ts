import { z } from 'zod';

import type { AgentSkill } from '../agents/types';

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
	'over_limit',
	'name_taken',
	'duplicate_source',
	'credential_invalid',
	'credential_missing',
	'credential_out_of_scope',
	'host_blocked',
	'stale',
	'name_clash',
	'skill_deleted',
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

const skillSourceSelection = {
	/** The `key` of each picked skill, as discover answered it. */
	skillKeys: z.array(z.string().min(1).max(2048)).min(1).max(SKILL_SOURCE_MAX_SKILLS),
	/**
	 * The `key` of each picked skill that the picker showed as needing review, when the user
	 * ticked "I reviewed the warnings". A skill that needs review comes in only when its key is
	 * in this list.
	 */
	reviewedSkillKeys: z.array(z.string().min(1).max(2048)).max(SKILL_SOURCE_MAX_SKILLS).optional(),
};

/** Connects the source in the scope and imports the picked skills. */
export class ConnectSkillSourceDto extends Z.class({
	...skillSourceTarget,
	...skillSourceSelection,
}) {}

/** Adds picked skills to an existing source. Its stored scope and branch apply. */
export class AddSkillSourceSkillsDto extends Z.class(skillSourceSelection) {}

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

/** The part of SKILL.md that holds a finding. A reference file has one text, so it has no part. */
export type SkillScanPart = 'name' | 'description' | 'frontmatter' | 'instructions';

/**
 * Where a finding is, so a reviewer can read it in place. The snippet is for display only: it
 * shortens long lines and shows each hidden character as a visible marker such as `⟦U+200B⟧`.
 */
export type SkillScanLocation = {
	part?: SkillScanPart;
	/** The line of the finding, from 1, in its part or file. */
	line: number;
	/** The lines around the finding. */
	snippet: Array<{ line: number; text: string }>;
	/** Where the finding is in the snippet line with the number `line`, as string offsets. */
	start: number;
	end: number;
};

export type SkillScanFinding = {
	rule: SkillScanRule;
	severity: SkillScanSeverity;
	/** `SKILL.md`, or the path of a file in the skill folder. */
	file?: string;
	/** English text for logs and for a reviewer. Telemetry sends only the rule. */
	detail: string;
	/** The linked domain of a `new_url` finding. */
	domain?: string;
	/** Set for the rules that find a place in the text. */
	location?: SkillScanLocation;
};

/** The most severe finding gives the verdict. No one can override `blocked`. */
export type SkillScanResult = { verdict: SkillScanVerdict; findings: SkillScanFinding[] };
/** A display group. It does not change the identity or content of a skill. */
export type SkillSourceGroup = { id: string; name: string };

export type ExternalSkillPlugin = {
	name: string;
	manifestPath: string;
	/** A web link to the repository of the plugin. Absent when the entry has no http(s) link. */
	url?: string;
};

/** One file of a skill as the import keeps it, so a reviewer can read the full skill. */
export type SkillPreviewFile = {
	/** `SKILL.md`, or the path of a reference file. */
	path: string;
	/** The text. Each hidden character shows as a marker such as `⟦U+200B⟧`, as in the snippets. */
	text: string;
	/** In SKILL.md: the line where the instructions start, so a finding in them maps to the file. */
	instructionsLine?: number;
};

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
	/** The files that the import keeps. Empty when n8n cannot read the skill. */
	previewFiles: SkillPreviewFile[];
	/** True when the skill is too large to show in full. `previewFiles` then lists only the first files. */
	previewTruncated?: boolean;
	/** The chosen scope already has a skill with this name. */
	nameTaken: boolean;
	error: { reason: SkillSourceReason; message: string } | null;
	/** The security check. Null when the skill is gone from the source. */
	check: SkillScanResult | null;
	webUrl: string;
	group?: SkillSourceGroup;
};

export type SkillSourceDiscovery = {
	source: SkillSourceSummary;
	duplicate: SkillSourceDuplicate;
	skills: DiscoveredSkill[];
	/** Manifests that could not be read. The skills remain selectable. */
	groupingWarnings?: string[];
	/** Marketplace entries that require a separate connection. */
	externalPlugins?: ExternalSkillPlugin[];
	/** True when the source has more skills than n8n lists (`too_many_skills`). */
	truncated: boolean;
	/** Skills that n8n did not list, as they are deeper in the source than n8n looks (`too_deep`). */
	tooDeep?: number;
};

/** The skills that a source has gained since the user last imported from it. */
export type SkillSourceNewSkills = {
	/** Skills that are new in the source since the last import, and that n8n can import. Blocked skills do not count. */
	newSkillCount: number;
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

/** A connected source that the user can see. Credential data stays on the server. */
export type SkillSourceListItem = SkillSourceSummary & {
	id: string;
	scope: 'instance' | 'project';
	/** Null for a Global source. */
	projectId: string | null;
	projectName: string | null;
	projectType: 'personal' | 'team' | null;
	/** Synced skills of the source. */
	skillCount: number;
	canAddSkills: boolean;
	/** True when the user may delete the source. A delete also deletes its skills. */
	canDelete: boolean;
	/** How many skills of the source an agent uses. A delete needs none. */
	skillsInUse: number;
	/** Updates that wait for review and that the security check did not block. */
	updatesAvailable: number;
	/** Updates that the security check blocked. */
	updatesBlocked: number;
	lastCheckedAt: string | null;
	/** Whether the user may review updates and check the source now. */
	canReview: boolean;
};

/** The commits between the content of a skill in n8n and its update, from the source. */
export type SkillUpdateCommit = {
	/** The revision of the update, such as a commit SHA. */
	revision: string;
	/** The revision of the content that n8n has. */
	baseRevision: string;
	/** The latest commit. Null when the source could not describe it, such as on a rate limit. */
	message: string | null;
	author: string | null;
	/** ISO date of the latest commit. */
	date: string | null;
	/** Commits between the two revisions. Null when unknown. */
	commits: number | null;
	/** A page in the source that shows the change. */
	webUrl: string;
};

/** What Accept changes for agents. */
export type SkillUpdateImpact = {
	/** The version that Accept creates. */
	nextVersion: number;
	/** Agents whose draft follows the latest version: they get unpublished changes. */
	followingAgents: number;
	/** Agents with a published version that pins the skill: they do not change. */
	publishedAgents: number;
};

/** An update from the source that waits for review. */
export type SkillPendingUpdate = {
	skillId: string;
	/** The name of the skill in n8n. */
	name: string;
	/** Where the skill is in the source, such as its folder. */
	location: string;
	webUrl: string;
	/** The hash of the update. Send it back to accept or skip exactly this content. */
	contentHash: string;
	revision: string;
	check: SkillScanResult;
	/** The latest version in n8n. */
	current: AgentSkill;
	/** The update. Null when n8n cannot read its SKILL.md: the check then blocks it. */
	update: AgentSkill | null;
	/** The frontmatter of SKILL.md in the latest version and in the update. Accept stores it too. */
	currentFrontmatter: Record<string, unknown> | null;
	updateFrontmatter: Record<string, unknown> | null;
	/**
	 * Set when the update renames the skill to a name that the scope or an agent already uses.
	 * Accept is refused (`name_clash`) until the name is free.
	 */
	nameClash: {
		name: string;
		/** `scope`: a skill in the same scope has the name. `agent`: an agent that uses the skill has a skill with that name. */
		where: 'scope' | 'agent';
	} | null;
	impact: SkillUpdateImpact;
};

/** The "Updates from" dialog of one source. */
export type SkillSourceUpdates = {
	source: SkillSourceListItem;
	/** The commits of the newest update, for the rows of the dialog. Null when unknown. */
	commit: SkillUpdateCommit | null;
	updates: SkillPendingUpdate[];
};

/** The review of one update. */
export type SkillUpdateReview = {
	source: SkillSourceListItem;
	commit: SkillUpdateCommit | null;
	update: SkillPendingUpdate;
};

/** Accepts or skips the update with exactly the content that the user reviewed. */
export class ReviewSkillUpdateDto extends Z.class({
	/** `contentHash` of the reviewed update. A newer update gives `stale`. */
	contentHash: z.string().min(1).max(64),
	/** True when the user ticked "I reviewed the warnings". Accept of a `needs_review` update needs it. */
	reviewedWarnings: z.boolean().optional(),
}) {}

/** Update all: accepts each reviewed update of the source that is not blocked. */
export class AcceptSkillUpdatesDto extends Z.class({
	updates: z
		.array(z.object({ skillId: z.string().min(1).max(36), contentHash: z.string().min(1).max(64) }))
		.min(1)
		.max(SKILL_SOURCE_MAX_SKILLS),
	reviewedWarnings: z.boolean().optional(),
}) {}

export type SkillUpdateAcceptResponse = {
	skillId: string;
	name: string;
	version: number;
};

export type SkillUpdatesAcceptResponse = {
	accepted: SkillUpdateAcceptResponse[];
	/** Updates that did not come in. The others did. `unexpected` is a failure with no known reason. */
	failed: Array<{ skillId: string; reason: SkillSourceReason | 'unexpected' }>;
};

/** Remaining remote skills and the fixed destination for Add more. */
export type SkillSourceMoreDiscovery = Omit<SkillSourceDiscovery, 'source' | 'duplicate'> & {
	source: SkillSourceListItem;
};

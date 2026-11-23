import { z } from 'zod';

import { Z } from '../zod-class';
import { booleanFromString } from '../schemas/boolean-from-string';
import type { ProjectIcon } from '../schemas/project.schema';

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
	'stale',
	'name_clash',
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

export const discoverPublicSkillSourceSchema = DiscoverSkillSourceDto.schema
	.omit({ credentialId: true })
	.extend({
		url: skillSourceTarget.url.describe('A public GitHub repository, folder, or SKILL.md URL'),
		scope: skillSourceScopeSchema.describe('Global (instance) or one project (project)'),
		projectId: skillSourceScope.projectId.describe('Required when scope is project'),
	});

export const connectPublicSkillSourceSchema = discoverPublicSkillSourceSchema.extend({
	skillKeys: ConnectSkillSourceDto.schema.shape.skillKeys.describe(
		'The keys of the selected skills that passed the check',
	),
	revision: z
		.string()
		.min(1)
		.max(128)
		.nullable()
		.describe('The revision returned by discovery. Null when discovery returned null'),
});

export type DiscoverPublicSkillSource = z.infer<typeof discoverPublicSkillSourceSchema>;
export type ConnectPublicSkillSource = z.infer<typeof connectPublicSkillSourceSchema>;

/** Checks or moves a source without reading its remote repository. */
export class MoveSkillSourceDto extends Z.class({
	...skillSourceScope,
	/** The scope shown when the dialog opened. Reject a stale request. */
	fromProjectId: z.string().min(1).max(36).nullable(),
	credentialId: z.string().min(1).max(36).optional(),
}) {}

/** Removes a source. Skills are deleted unless the user chooses to keep them. */
export class DeleteSkillSourceQueryDto extends Z.class({
	/** Keep the skills as local, editable skills. */
	keepSkills: booleanFromString.optional(),
	/** Delete only if this skill is still the source's only linked skill. */
	onlySkillId: z.string().min(1).max(36).optional(),
}) {}

const skillSourceDuplicateSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('none') }),
	z.object({
		kind: z.literal('blocked'),
		where: z.enum(['global', 'scope']),
		sourceId: z.string().nullable(),
	}),
	z.object({
		kind: z.literal('warning'),
		projects: z.array(z.object({ id: z.string(), name: z.string() })),
	}),
]);

export const skillSourceMovePreviewSchema = z.object({
	skillCount: z.number(),
	canMove: z.boolean(),
	/** A null name or destination hides a skill the user cannot read. */
	nameConflicts: z.array(
		z.object({
			moving: z.object({ id: z.string(), name: z.string().nullable() }),
			existing: z.object({ id: z.string(), name: z.string() }).nullable(),
		}),
	),
	usageConflicts: z.array(
		z.object({
			skill: z.object({ id: z.string(), name: z.string().nullable() }),
			agents: z.array(z.object({ id: z.string(), name: z.string() })),
			hiddenAgents: z.number(),
		}),
	),
	duplicate: skillSourceDuplicateSchema,
	credential: z.object({
		required: z.boolean(),
		reason: z.enum(['credential_missing', 'credential_out_of_scope']).nullable(),
	}),
});

export type SkillSourceMovePreview = z.infer<typeof skillSourceMovePreviewSchema>;

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
 * chosen scope. `sourceId` is set when the user may add skills to that source.
 * `warning`: the same source is in other projects that the user can see.
 */
export type SkillSourceDuplicate = z.infer<typeof skillSourceDuplicateSchema>;

/** The rules of the security check. The build spec lists them in Appendix B. */
export const SKILL_SCAN_RULES = [
	'invalid_skill',
	'over_limit',
	'file_skipped',
	'file_unstorable',
	'hidden_unicode',
	'new_url',
	'risky_url',
	'permission_change',
	'lossy_conversion',
] as const;

export type SkillScanRule = (typeof SKILL_SCAN_RULES)[number];

/** Why a `risky_url` finding needs review. `unreadable`: n8n cannot read the address of the link. */
export const SKILL_LINK_REVIEW_REASONS = [
	'ip_address',
	'not_https',
	'paste_site',
	'webhook_catcher',
	'url_shortener',
	'unreadable',
] as const;

export type SkillLinkReviewReason = (typeof SKILL_LINK_REVIEW_REASONS)[number];

/** `info` only tells the user something. It does not change the verdict. */
export type SkillScanSeverity = 'blocked' | 'needs_review' | 'info';

export type SkillScanVerdict = 'pass' | 'needs_review' | 'blocked';

/**
 * Where a finding is in the preview text of its file (`SkillPreviewFile.text`), so the review
 * can mark it. `start` and `end` are offsets in that line, and they count the visible markers
 * of hidden characters. A finding over several lines is marked to the end of its first line.
 */
export type SkillScanLocation = {
	/** From 1. */
	line: number;
	start: number;
	end: number;
};

/** The part of a skill that a size limit applies to. */
export const SKILL_SCAN_LIMIT_FIELDS = [
	'name',
	'description',
	'instructions',
	'frontmatter',
	'referenceCount',
	'referencePath',
	'referenceContent',
	'referencesTotal',
] as const;

export type SkillScanLimitField = (typeof SKILL_SCAN_LIMIT_FIELDS)[number];

/** A size limit and the size that the skill has. `referenceCount` counts files, each other field counts characters. */
export type SkillScanLimit = { field: SkillScanLimitField; max: number; current: number };

export type SkillScanFinding = {
	rule: SkillScanRule;
	severity: SkillScanSeverity;
	/** `SKILL.md`, or the path of a file in the skill folder. */
	file?: string;
	/** English text for logs. The UI shows it only where no field of the finding gives the reason. */
	detail: string;
	/** Set for an `over_limit` finding, so the UI can write the reason in its language. */
	limit?: SkillScanLimit;
	/** The linked domain of a `new_url` or `risky_url` finding. */
	domain?: string;
	/** Set for a `risky_url` finding. */
	linkReason?: SkillLinkReviewReason;
	/** Set for a rule that finds text. A frontmatter finding marks its top-level key. */
	location?: SkillScanLocation;
};

/** The most severe finding gives the verdict. No one can override `blocked`. */
export type SkillScanResult = { verdict: SkillScanVerdict; findings: SkillScanFinding[] };

/** One file of a skill as the import keeps it, so a reviewer can read the full skill. */
export type SkillPreviewFile = {
	/** `SKILL.md`, or the path of a reference file. */
	path: string;
	/**
	 * The text. SKILL.md shows the name, the description and each frontmatter key on its own
	 * line. Each hidden character shows as a marker such as `⟦U+200B⟧`.
	 */
	text: string;
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
	/** The files that the import keeps, for the review. Empty when n8n cannot read the skill. */
	previewFiles: SkillPreviewFile[];
	/** True when the skill is too large to show in full. `previewFiles` then lists the first files. */
	previewTruncated: boolean;
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

export type PublicSkillSourceDiscovery = Omit<SkillSourceDiscovery, 'skills'> & {
	revision: string | null;
	skills: Array<
		Pick<DiscoveredSkill, 'key' | 'location' | 'name' | 'nameTaken' | 'webUrl'> & {
			verdict: SkillScanVerdict | null;
			reason: SkillSourceReason | null;
		}
	>;
};

/**
 * What an import of the selection does at the previewed revision, before anything is
 * stored. n8n Assistant shows it on the approval card.
 */
export type PublicSkillSourceImportCheck = {
	source: SkillSourceSummary;
	/** Selected skills that the import takes. */
	importable: Array<{ key: string; name: string }>;
	/** Selected skills that the import leaves out. */
	failed: SkillSourceConnectResponse['failed'];
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
	/** Unlinked skills that are not hidden from the new count. */
	newSkillsFound: number;
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
	/** The branch, or null for a source type without branches. */
	ref: string | null;
	/** The page of the skill in the source. */
	webUrl: string;
	/** Whether the user may stop syncing the skill, which makes it a normal skill. */
	canStopSyncing: boolean;
};

/** The credentials that can read a private source in a scope, for the credential select. */
export class ListSkillSourceCredentialsQueryDto extends Z.class(skillSourceScope) {}

/** Replaces the credential only after n8n verifies that it can read the source. */
export class ReplaceSkillSourceCredentialDto extends Z.class({
	credentialId: z.string().min(1).max(36),
}) {}

/** A credential that a source in the scope accepts and that the user can use. */
export type SkillSourceCredentialOption = { id: string; name: string; type: string };

/** The n8n credential types that read a private GitHub source. */
export const GITHUB_SKILL_SOURCE_CREDENTIAL_TYPES = [
	'githubApi',
	'githubAppApi',
	'githubOAuth2Api',
] as const;
export type GitHubSkillSourceCredentialType = (typeof GITHUB_SKILL_SOURCE_CREDENTIAL_TYPES)[number];

export function isGitHubSkillSourceCredentialType(
	type: string,
): type is GitHubSkillSourceCredentialType {
	return GITHUB_SKILL_SOURCE_CREDENTIAL_TYPES.some((known) => known === type);
}

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

/** Health of a source, based on its latest check result. */
export type SkillSourceHealth = 'connected' | 'credential_issue' | 'source_unavailable' | 'delayed';

/** One connected source, for its group row in the skills table. */
export type SkillSourceListItem = {
	id: string;
	type: 'github';
	/** Such as `owner/repository`. */
	label: string;
	/** The branch, or null for a source type without branches. */
	ref: string | null;
	/** The folder in the source that the source reads. Empty for the whole source. */
	path: string;
	webUrl: string;
	/** Null for a Global source. */
	projectId: string | null;
	projectName: string | null;
	projectType: 'personal' | 'team' | null;
	projectIcon: ProjectIcon | null;
	/** Synced skills of the source. */
	skillCount: number;
	/** Updates that wait for review and that the security check did not block. */
	updatesAvailable: number;
	/** Updates that the security check blocked. */
	updatesBlocked: number;
	/** New skills that are not hidden from the count. Includes blocked skills. */
	newSkillsAvailable: number;
	health: SkillSourceHealth;
	lastCheckedAt: string | null;
	/** Names of synced skills whose folders are gone. Their saved versions still work. */
	missingSkills: string[];
	/** Whether the user may replace the credential of this source. */
	canReplaceCredential: boolean;
	/** Whether the user may review updates and check the source now. */
	canReview: boolean;
	/** Whether the user may import new skills into the source scope. */
	canImport: boolean;
	/** Whether the user may remove the source from this scope. The destination is checked separately. */
	canMove: boolean;
	/** Whether the user may delete the source and its synced skills. */
	canDelete: boolean;
};

const reviewedUpdate = {
	contentHash: z.string().regex(/^[a-f0-9]{64}$/),
	baseVersionId: z.string().min(1).max(36),
};

export class ReviewSkillSourceUpdateQueryDto extends Z.class(reviewedUpdate) {}

/** Applies every selected update in one transaction. */
const acceptSkillSourceUpdatesShape = {
	updates: z
		.array(z.object({ skillId: z.string().min(1).max(36), ...reviewedUpdate }))
		.max(SKILL_SOURCE_MAX_SKILLS)
		.refine(
			(updates) => new Set(updates.map(({ skillId }) => skillId)).size === updates.length,
			'Select each skill once',
		),
	newSkills: z
		.array(z.object({ key: z.string().min(1).max(2048), contentHash: reviewedUpdate.contentHash }))
		.max(SKILL_SOURCE_MAX_SKILLS)
		.default([]),
	skippedNewSkills: z
		.array(z.object({ key: z.string().min(1).max(2048), contentHash: reviewedUpdate.contentHash }))
		.max(SKILL_SOURCE_MAX_SKILLS)
		.default([]),
	reviewedWarnings: z.boolean().default(false),
};
const acceptSkillSourceUpdatesSchema = z.object(acceptSkillSourceUpdatesShape).refine((value) => {
	const keys = [...value.newSkills, ...value.skippedNewSkills].map(({ key }) => key);
	return (
		value.updates.length + keys.length > 0 &&
		value.updates.length + keys.length <= SKILL_SOURCE_MAX_SKILLS &&
		new Set(keys).size === keys.length
	);
}, 'Select each skill once, and select at least one skill');

export class AcceptSkillSourceUpdatesDto extends Z.class(acceptSkillSourceUpdatesShape) {
	constructor(data: z.infer<typeof acceptSkillSourceUpdatesSchema>) {
		super(acceptSkillSourceUpdatesSchema.parse(data));
	}
	static override safeParse(data: unknown) {
		return acceptSkillSourceUpdatesSchema.safeParse(data);
	}
	static override parse(data: unknown) {
		return acceptSkillSourceUpdatesSchema.parse(data);
	}
}

export class SkillSourceCommitQueryDto extends Z.class({
	revision: z.string().min(1).max(255),
}) {}

export type SkillUpdateCommit = {
	revision: string;
	webUrl: string | null;
	message: string | null;
	author: string | null;
	date: string | null;
};

export type SkillPendingUpdate = {
	revisionUrl: string | null;
	skillId: string;
	name: string;
	location: string;
	webUrl: string;
	contentHash: string;
	baseVersionId: string;
	revision: string;
	check: SkillScanResult;
	nameClash: { name: string; where: 'scope' | 'agent' } | null;
	changes: { added: number; removed: number };
	nextVersion: number;
};

export type SkillSourceUpdates = {
	updates: SkillPendingUpdate[];
	/** Read live only when the user opens the review. Includes hidden new skills. */
	newSkills?: SkillNewUpdate[];
	/** Set when n8n could not read the new skills. Stored updates stay available. */
	newSkillsError?: { reason: SkillSourceReason | null };
	commit: SkillUpdateCommit | null;
};

export type SkillNewUpdate = DiscoveredSkill & {
	contentHash: string;
	revision: string;
	skipped: boolean;
};

export type SkillUpdateFile = {
	path: string;
	before: string;
	after: string;
	status?: 'added' | 'removed';
};

/** Names are limited to agents the user can read. */
export type SkillUpdateAgents = {
	agents: Array<{ id: string; name: string }>;
	hiddenAgentCount: number;
};

export type SkillUpdateReview = SkillUpdateAgents & {
	files: SkillUpdateFile[];
	/** Use a bounded preview when blocked content is too large for the diff viewer. */
	preview?: Pick<DiscoveredSkill, 'previewFiles' | 'previewTruncated'>;
};
export type SkillSourceAcceptResponse = SkillUpdateAgents & {
	updatedCount: number;
	importedCount?: number;
};

/** A refused source delete names only the agents that the user may read. */
export const skillSourceDeleteBlockSchema = z.object({
	reason: z.literal('skills_in_use'),
	agents: z.array(
		z.object({
			agentId: z.string(),
			agentName: z.string(),
			projectId: z.string(),
			projectName: z.string(),
		}),
	),
	hiddenAgents: z.number().int().nonnegative(),
});

export type SkillSourceDeleteBlock = z.infer<typeof skillSourceDeleteBlockSchema>;

export class SkillSyncSettingsDto extends Z.class({
	enabled: z.boolean(),
}) {}

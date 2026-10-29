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
	'name_taken',
	'duplicate_source',
] as const;

export type SkillSourceReason = (typeof SKILL_SOURCE_REASONS)[number];

/** Where a source puts its skills: Global (`instance`), or a team or personal project. */
export const skillSourceScopeSchema = z.enum(['instance', 'project']);

const skillSourceTarget = {
	/** A link to a repository, a folder, or one SKILL.md. */
	url: z.string().trim().min(1).max(2048),
	scope: skillSourceScopeSchema,
	/** Required when `scope` is `project`, absent otherwise. */
	projectId: z.string().max(36).optional(),
};

/** Reads a link and lists the skills in it, for the picker. Writes nothing. */
export class DiscoverSkillSourceDto extends Z.class(skillSourceTarget) {}

export const SKILL_SOURCE_MAX_SKILLS = 200;

const skillSourceSelection = {
	/** The `key` of each picked skill, as discover answered it. */
	skillKeys: z.array(z.string().min(1).max(2048)).min(1).max(SKILL_SOURCE_MAX_SKILLS),
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

/** A connected source that the user can see. Credential data stays on the server. */
export type SkillSourceListItem = SkillSourceSummary & {
	id: string;
	scope: 'instance' | 'project';
	projectId: string | null;
	projectName: string | null;
	projectType: 'personal' | 'team' | null;
	skillCount: number;
	canAddSkills: boolean;
};

/** Remaining remote skills and the fixed destination for Add more. */
export type SkillSourceMoreDiscovery = Omit<SkillSourceDiscovery, 'source' | 'duplicate'> & {
	source: SkillSourceListItem;
};

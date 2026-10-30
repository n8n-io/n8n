import {
	AGENT_SKILL_NAME_MAX_LENGTH,
	agentSkillSchema,
	type AgentSkill,
	type SkillScope,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserError } from '@n8n/errors';
import { z } from 'zod';

import { skillContentHash, type SkillContent } from './skill-content-hash';
import type { SkillFile } from '../database/entities/skill-file.entity';
import type { SkillFrontmatter, SkillVersion } from '../database/entities/skill-version.entity';
import type { SkillSourceType } from '../database/entities/skill-source-connection.entity';
import type { Skill, SkillSource } from '../database/entities/skill.entity';

/** Where a skill lives: a project, or the instance (null). */
export type SkillTarget = { projectId: string | null };

export function isSameSkillTarget(a: SkillTarget, b: SkillTarget): boolean {
	return a.projectId === b.projectId;
}

/** One skill with one of its version rows and that row's files, sorted by path. */
export type ResolvedSkillRow = {
	skill: Skill;
	version: SkillVersion;
	files: SkillFile[];
};

/** A skill ref in an agent config. A ref with `versionId` runs that version. */
/** The version a skill ref runs, whether a pin decides it, and the latest version. */
export type RuntimeVersion = { version: number; pinned: boolean; latest: number };

export type SkillRef = { id: string; versionId?: string };

/**
 * Fields to change, plus the hash of the version the editor started from. Omitted
 * `frontmatter` keeps the frontmatter of the latest version. `baseSkillHash` leaves out
 * the frontmatter, so the type requires `baseVersionId` when `frontmatter` is set. With
 * `checkedTarget`, the save is refused if the skill left the scope the caller checked.
 * Every field that the update leaves out keeps its stored value, so a caller that replaces
 * the whole content, such as Skill Sync, sends every field: `references: []` removes all
 * files, and `frontmatter: null` removes the frontmatter.
 */
export type SkillUpdate = Partial<AgentSkill> & {
	baseSkillHash: string;
	checkedTarget?: SkillTarget;
} & (
		| { frontmatter?: undefined; baseVersionId?: string }
		| { frontmatter: SkillFrontmatter | null; baseVersionId: string }
	);

/** The latest saved version of a skill, for a module that reads skills without their rows. */
export type LatestSkill = {
	id: string;
	target: SkillTarget;
	versionId: string;
	skill: AgentSkill;
	frontmatter: SkillFrontmatter | null;
	/** The hash of the stored content, frontmatter included. */
	contentHash: string;
};

export type SkillSaveResult = {
	versionId: string;
	version: number;
	/** False when the content matched the latest version and nothing was saved. */
	created: boolean;
	/** The content of the latest version after the save. */
	skill: AgentSkill;
	/** Agents that follow the skill. A save in a caller's transaction does not refresh them. */
	followingAgentIds: string[];
};

export type SkillMoveOptions = {
	/** The name the skill has after this request, when the same request renames it. */
	nameAfterMove?: string;
	/** The scope `assertCanMove` checked. The move is refused if the skill left it since. */
	checkedSource?: SkillTarget;
	/**
	 * The projects whose agents a refusal names, as for `delete`. It only counts the
	 * agents in other projects.
	 */
	agentProjectIds?: string[] | 'all';
};

export interface AssistantSkillContext {
	user: User;
	/** The current session project. Absent means instance skills only. */
	projectId?: string;
}

export interface AssistantSkillSummary {
	id: string;
	projectId: string | null;
	name: string;
	description: string;
	versionId: string;
	version: number;
}

export interface AssistantSkillContent extends AssistantSkillSummary {
	instructions: string;
	frontmatter: Record<string, unknown> | null;
	/** Reference paths only. The Assistant reads a body on demand with `readFileForAssistant`. */
	files: Array<{ path: string }>;
}

export interface AssistantSkillFileContent {
	skillId: string;
	versionId: string;
	path: string;
	content: string;
}

/** A skill as the MCP skills extension serves it: the latest saved version. */
export type McpSkillContent = {
	id: string;
	projectId: string | null;
	skill: AgentSkill;
	/** Set for a synced skill. */
	origin?: { provider: SkillSourceType; access: 'public' | 'credential' };
};

/**
 * The content of one version. Skills ignore `allowedTools`: the frontmatter, the
 * `allowed-tools` key included, stays as given.
 */
export function toSkillContent(skill: AgentSkill, frontmatter: SkillFrontmatter | null = null) {
	const content: SkillContent = {
		name: skill.name,
		description: skill.description,
		instructions: skill.instructions,
		frontmatter: frontmatter && Object.keys(frontmatter).length > 0 ? { ...frontmatter } : null,
		files: (skill.references ?? []).map(({ path, content: text }) => ({ path, content: text })),
	};
	return content;
}

/**
 * The name of the source of each synced skill source, or null for a skill that n8n owns. A
 * synced skill is read-only. A new source value must be added here, so the compiler forces
 * the choice.
 */
const SYNCED_SOURCE_LABELS: Record<SkillSource, string | null> = {
	ui: null,
	agent: null,
	mcp: null,
	assistant: null,
	import: null,
	github: 'GitHub',
};

/** The name of the source of a synced skill. Undefined for a skill that n8n owns. */
export function syncedSourceLabel(source: SkillSource): string | undefined {
	return SYNCED_SOURCE_LABELS[source] ?? undefined;
}

/** The `AgentSkill` shape the runtime and the API use, from one version row. */
export function toAgentSkill(row: ResolvedSkillRow): AgentSkill {
	return contentToAgentSkill(rowContent(row));
}

/** The content of one version row. */
export function rowContent(row: ResolvedSkillRow): SkillContent {
	return {
		name: row.version.name,
		description: row.version.description,
		instructions: row.version.instructions,
		frontmatter: row.version.frontmatter,
		files: row.files.map(({ path, content }) => ({ path, content })),
	};
}

/** The `AgentSkill` shape of a content. It has no frontmatter. */
export function contentToAgentSkill(content: SkillContent): AgentSkill {
	return {
		name: content.name,
		description: content.description,
		instructions: content.instructions,
		...(content.files.length
			? { references: content.files.map(({ path, content: text }) => ({ path, content: text })) }
			: {}),
	};
}

export function toLatestSkill(row: ResolvedSkillRow): LatestSkill {
	return {
		id: row.skill.id,
		target: { projectId: row.skill.projectId },
		versionId: row.version.id,
		skill: toAgentSkill(row),
		frontmatter: row.version.frontmatter,
		contentHash: row.version.contentHash,
	};
}

/** The content hash that a version with this skill and frontmatter stores. */
export function skillContentHashOf(
	skill: AgentSkill,
	frontmatter: SkillFrontmatter | null,
): string {
	return skillContentHash(toSkillContent(skill, frontmatter));
}

/** A skill with a project is a project skill. Any other skill belongs to the instance. */
export function skillScopeOf(skill: Pick<Skill, 'projectId'>): SkillScope {
	return skill.projectId ? 'project' : 'instance';
}

/**
 * Builder and MCP tools write without the REST DTOs, so the name is trimmed here too. A
 * name of only spaces is refused.
 */
export function trimmedName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) throw new UserError('Skill name is required.');
	return trimmed;
}

/**
 * The skill with the name that a create stores. A caller that answers with the body or
 * its hash uses this, so the answer matches the stored skill.
 */
export function withTrimmedName<T extends { name: string }>(skill: T): T {
	return { ...skill, name: trimmedName(skill.name) };
}

/**
 * What a skill from a source must be to come in. Skills ignore `allowedTools`, as a create does.
 * The name is trimmed as a create stores it, so the name checks and the hashes match the stored
 * skill.
 */
export const importableSkillSchema = agentSkillSchema
	.omit({ allowedTools: true })
	.extend({ name: z.string().trim().min(1).max(AGENT_SKILL_NAME_MAX_LENGTH) });

/**
 * The content of a skill from a source as a version would store it, so its hash compares with
 * the hash of the stored version. Content that n8n cannot store stays as the source sent it:
 * the security check blocks it anyway.
 */
export function storedContentOf(content: SkillContent): SkillContent {
	const parsed = importableSkillSchema.safeParse(contentToAgentSkill(content));
	return parsed.success ? toSkillContent(parsed.data, content.frontmatter) : content;
}

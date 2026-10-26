import type { AgentSkill } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserError } from '@n8n/errors';

import type { SkillContent } from './skill-content-hash';
import type { SkillFile } from '../database/entities/skill-file.entity';
import type { SkillFrontmatter, SkillVersion } from '../database/entities/skill-version.entity';
import type { Skill, SkillSource } from '../database/entities/skill.entity';

/**
 * Where a skill lives: a project, one agent, or the instance (both null). An agent skill
 * has no projectId: its project is the agent's.
 */
export type SkillTarget = { projectId: string | null; agentId: string | null };

/** One skill with one of its version rows and that row's files, sorted by path. */
export type ResolvedSkillRow = {
	skill: Skill;
	version: SkillVersion;
	files: SkillFile[];
};

/** A skill ref in an agent config. A ref with `versionId` runs that version. */
export type SkillRef = { id: string; versionId?: string };

/**
 * Content fields to change, plus the version the change starts from. A field that the
 * update leaves out keeps its stored value. An editor sends `baseSkillHash`, the `skillHash`
 * that the API returned. Skill Sync sends `baseContentHash`, the stored `contentHash`, which
 * also covers the frontmatter.
 */
export type SkillUpdate = Partial<SkillContent> &
	(
		| { baseSkillHash: string; baseContentHash?: never }
		| { baseContentHash: string; baseSkillHash?: never }
	);

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
export type McpSkillContent = { id: string; projectId: string | null; skill: AgentSkill };

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

/**
 * An edit from REST, an AI tool or the agent builder as a `SkillUpdate`. Skills ignore
 * `allowedTools`, and an edit never changes the frontmatter.
 */
export function toSkillUpdate(changes: Partial<AgentSkill>, baseSkillHash: string): SkillUpdate {
	const { name, description, instructions, references } = changes;
	return {
		baseSkillHash,
		...(name !== undefined ? { name } : {}),
		...(description !== undefined ? { description } : {}),
		...(instructions !== undefined ? { instructions } : {}),
		...(references !== undefined
			? { files: references.map(({ path, content }) => ({ path, content })) }
			: {}),
	};
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

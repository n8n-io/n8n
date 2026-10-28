import { z } from 'zod';

import {
	AGENT_SKILL_NAME_MAX_LENGTH,
	agentSkillSchema,
	agentSkillShape,
	skillCreateMethodSchema,
} from './agent-skill.schema';
import type { AgentSkill } from './types';
import type { ProjectType } from '../schemas/project.schema';
import { paginationSchema } from '../dto/pagination/pagination.dto';
import { Z } from '../zod-class';

export const SKILLS_MAX_PAGE_SIZE = 100;
export const ASSISTANT_SKILLS_FLAG = '130_attach_skills_to_assistant';

/** Optional on purpose: without `take` the caller gets every visible skill. */
const optionalTake = z
	.string()
	.optional()
	.transform((value) => (value === undefined || value === '' ? undefined : Number(value)))
	.refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
		message: 'Param `take` must be a positive integer',
	})
	.transform((value) => (value === undefined ? undefined : Math.min(value, SKILLS_MAX_PAGE_SIZE)));

/** Who owns a skill: one project, one agent (only that agent can use it), or the instance. */
export const skillScopeSchema = z.enum(['project', 'agent', 'instance']);

export type SkillScope = z.infer<typeof skillScopeSchema>;

/**
 * How a skill was created: `ui` on the skills settings page, `agent` from the agent builder or the
 * migration, `mcp` from an MCP client, `assistant` from n8n Assistant.
 */
export type SkillSource = 'ui' | 'agent' | 'mcp' | 'assistant';

/** The user who created a skill, as the settings list names them. */
export type SkillUserDto = {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
};

/** One row of the skills list. Name and description come from the latest version. */
export type SkillListItem = {
	id: string;
	name: string;
	description: string;
	scope: SkillScope;
	/** The project of a project skill, or the project of the agent of an agent skill. */
	projectId: string | null;
	projectName: string | null;
	/** Lets the editor name another member's personal project, which it does not list. */
	projectType: ProjectType | null;
	/** Set for an agent skill: the only agent that can use it. */
	agentId: string | null;
	agentName: string | null;
	source: SkillSource;
	/** Null when the creator is unknown or the user no longer exists. */
	createdBy: SkillUserDto | null;
	/** Number of the latest version, the one following agents run. */
	latestVersion: number;
	/** Distinct agents that use the skill: draft refs plus published pins. */
	usedByAgents: number;
	availableToAssistant: boolean;
	canEdit: boolean;
	canDelete: boolean;
	createdAt: string;
	updatedAt: string;
};

export type SkillListResponse = {
	count: number;
	data: SkillListItem[];
};

/** The agents that use a skill, limited to the agents the caller may read. */
export type SkillUsedBy = {
	/** Agents whose draft references the skill. */
	drafts: Array<{ agentId: string; agentName: string; projectId: string }>;
	/** Agents with a published version that pins the skill, one row each. */
	pins: Array<{
		agentId: string;
		agentName: string;
		projectId: string;
		/** The skill version the current published version runs. Null when only older ones pin it. */
		version: number | null;
	}>;
	/** Agents in projects the caller may not read. */
	hiddenAgents: number;
};

/** One skill with the content of its latest version. */
export type SkillDetail = SkillListItem & {
	skill: AgentSkill;
	/** Hash of `skill`. Send it back as `baseSkillHash` so a save cannot overwrite a newer version. */
	skillHash: string;
	usedBy: SkillUsedBy;
};

export type SkillSaveResponse = {
	id: string;
	versionId: string;
	version: number;
	/** False when the content matched the latest version and nothing was saved. */
	created: boolean;
	/** The content of the latest version after the save. */
	skill: AgentSkill;
	skillHash: string;
};

/** Without `sortBy` the list shows the most recently changed skill first. */
export const SKILLS_SORT_OPTIONS = [
	'name:asc',
	'name:desc',
	'updatedAt:asc',
	'updatedAt:desc',
] as const;

export type SkillSortOption = (typeof SKILLS_SORT_OPTIONS)[number];

export class ListSkillsQueryDto extends Z.class({
	skip: paginationSchema.skip,
	take: optionalTake,
	search: z.string().trim().max(200).optional(),
	scope: skillScopeSchema.optional(),
	projectId: z.string().max(36).optional(),
	/**
	 * The id of an agent: the skills it uses (a draft ref or a published pin) and its own
	 * agent skills. Not combined with `attachableTo`.
	 */
	agentId: z.string().max(36).optional(),
	/** The id of the user who created the skill. User ids are UUIDs. */
	createdById: z.string().uuid().optional(),
	/**
	 * The id of an agent: the skills it may attach, which are its project's skills, its own
	 * agent skills and instance skills. Not combined with `scope`, `projectId` or `agentId`.
	 */
	attachableTo: z.string().max(36).optional(),
	sortBy: z
		.enum(SKILLS_SORT_OPTIONS, {
			message: `sortBy must be one of: ${SKILLS_SORT_OPTIONS.join(', ')}`,
		})
		.optional(),
}) {}

export const SKILL_AGENTS_MAX_PAGE_SIZE = 50;

/** The agents for the agent filter of the skills list, searched by name. */
export class ListSkillAgentsQueryDto extends Z.class({
	search: z.string().trim().max(200).optional(),
	take: z
		.string()
		.optional()
		.transform((value) => (value === undefined || value === '' ? undefined : Number(value)))
		.refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
			message: 'Param `take` must be a positive integer',
		})
		.transform((value) =>
			Math.min(value ?? SKILL_AGENTS_MAX_PAGE_SIZE, SKILL_AGENTS_MAX_PAGE_SIZE),
		),
}) {}

/** An agent as the agent filter of the skills list names it. */
export type SkillAgentOption = { id: string; name: string };

/**
 * A skill name, trimmed first. A name of only spaces is refused, and padding is not
 * stored, so it cannot make a name look free or show as an untitled row.
 */
const skillNameSchema = z.string().trim().min(1).max(AGENT_SKILL_NAME_MAX_LENGTH);

/**
 * Asks for a name that no skill in the scope has yet, as `/workflows/new` does for a
 * workflow: the requested name, or the same name with the first free number after it.
 */
export class SkillNewNameQueryDto extends Z.class({
	scope: skillScopeSchema,
	/** Required for a project skill, absent otherwise. */
	projectId: z.string().max(36).optional(),
	/** Required for an agent skill, absent otherwise. */
	agentId: z.string().max(36).optional(),
	name: skillNameSchema,
}) {}

export type SkillNewNameResponse = { name: string };

/** The 409 message for a skill name that its scope already holds. The editor matches it. */
export const SKILL_NAME_TAKEN_MESSAGE = 'That name is taken, choose another';

export class CreateSkillDto extends Z.class({
	scope: skillScopeSchema,
	/** Required for a project skill, absent otherwise. */
	projectId: z.string().max(36).optional(),
	/** Required for an agent skill, absent otherwise. */
	agentId: z.string().max(36).optional(),
	availableToAssistant: z.boolean().optional(),
	/** Skills ignore `allowedTools`, so a create that sends it is refused. */
	skill: agentSkillSchema.omit({ allowedTools: true }).extend({ name: skillNameSchema }),
	/** For telemetry only. Absent counts as `manual`. */
	method: skillCreateMethodSchema.optional(),
}) {}

/**
 * Saves the next version of a skill. `baseSkillHash` is the `skillHash` the editor
 * started from: a save based on an older version is refused with 409.
 */
export class SaveSkillDto extends Z.class({
	availableToAssistant: z.boolean().optional(),
	name: skillNameSchema.optional(),
	description: agentSkillShape.description.optional(),
	instructions: agentSkillShape.instructions.optional(),
	references: agentSkillShape.references.optional(),
	baseSkillHash: z.string().min(1),
	/**
	 * Moves the skill to the instance or to a project. Refused with 409 when an agent that
	 * uses the skill cannot use it there. An agent skill is made from inside its agent, so
	 * `agent` is not a choice.
	 */
	scope: z.enum(['project', 'instance']).optional(),
	/** Required when `scope` is `project`, absent otherwise. */
	projectId: z.string().max(36).optional(),
}) {}

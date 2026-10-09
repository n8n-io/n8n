import { z } from 'zod';

import { agentSkillSchema } from './agent-skill.schema';
import type { AgentSkill } from './types';
import { paginationSchema } from '../dto/pagination/pagination.dto';
import { Z } from '../zod-class';

/**
 * PostHog flag for the controlled rollout of skills. A user without it gets 404 from
 * `/rest/skills`. Not an experiment: the flag is on or off.
 */
export const SKILLS_FLAG = '125_context_skills';

export const SKILLS_MAX_PAGE_SIZE = 100;

/** Optional on purpose: without `take` the caller gets every visible skill. */
const optionalTake = z
	.string()
	.optional()
	.transform((value) => (value === undefined || value === '' ? undefined : Number(value)))
	.refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
		message: 'Param `take` must be a positive integer',
	})
	.transform((value) => (value === undefined ? undefined : Math.min(value, SKILLS_MAX_PAGE_SIZE)));

/** Who owns a skill: one user ("Just you"), one project, or the instance. */
export const skillScopeSchema = z.enum(['user', 'project', 'instance']);

export type SkillScope = z.infer<typeof skillScopeSchema>;

export type SkillSource = 'ui' | 'upload' | 'agent';

/** One row of the skills list. Name and description come from the latest version. */
export type SkillListItem = {
	id: string;
	name: string;
	description: string;
	scope: SkillScope;
	/** Set for a project skill. */
	projectId: string | null;
	projectName: string | null;
	/** Set for a "Just you" skill. */
	userId: string | null;
	source: SkillSource;
	/** Number of the latest version, the one following agents run. */
	latestVersion: number;
	/** Distinct agents that use the skill: draft refs plus published pins. */
	usedByAgents: number;
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
export type SkillUsage = {
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
	usedBy: SkillUsage;
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

export class ListSkillsQueryDto extends Z.class({
	skip: paginationSchema.skip,
	take: optionalTake,
	search: z.string().trim().max(200).optional(),
	scope: skillScopeSchema.optional(),
	projectId: z.string().max(36).optional(),
}) {}

export class CreateSkillDto extends Z.class({
	scope: skillScopeSchema,
	/** Required for a project skill, absent otherwise. */
	projectId: z.string().max(36).optional(),
	skill: agentSkillSchema,
}) {}

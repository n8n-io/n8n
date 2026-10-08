import { z } from 'zod';

import { agentSkillSchema } from './agent-skill.schema';
import type { AgentSkill } from './types';
import { paginationSchema } from '../dto/pagination/pagination.dto';
import { Z } from '../zod-class';

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

/** One row of the skills list. Name and description come from the latest saved version. */
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
	/** Number of the latest saved version, the one following agents run. */
	latestVersion: number;
	/** The draft row differs from the latest saved version. */
	hasUnsavedChanges: boolean;
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

export type SkillUsage = {
	drafts: Array<{ agentId: string; agentName: string; projectId: string }>;
	pins: Array<{
		agentId: string;
		agentName: string;
		agentVersionId: string;
		version: number;
		isActive: boolean;
	}>;
};

/** One skill with its editable draft. */
export type SkillDetail = SkillListItem & {
	/** The draft row: what the editor shows and autosave writes. */
	skill: AgentSkill;
	/** Hash of `skill`, for the concurrency check of a draft update (`baseSkillHash`). */
	skillHash: string;
	usedBy: SkillUsage;
};

export type SkillDraftResponse = {
	skill: AgentSkill;
	skillHash: string;
};

export type SkillSaveResponse = {
	id: string;
	versionId: string;
	version: number;
	/** False when the draft matched the latest version and nothing was saved. */
	created: boolean;
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

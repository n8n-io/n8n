import { z } from 'zod';

import { agentSkillSchema } from './agent-skill.schema';
import type { AgentSkill } from './types';
import { paginationSchema } from '../dto/pagination/pagination.dto';
import { Z } from '../zod-class';

export const HUB_SKILLS_MAX_PAGE_SIZE = 100;
export const HUB_SKILLS_DEFAULT_PAGE_SIZE = 50;

/** Optional on purpose: a request without `take` gets every visible skill, which the agent builder's picker and the assistant's menu need. */
const optionalTake = z
	.string()
	.optional()
	.transform((value) => (value === undefined || value === '' ? undefined : parseInt(value, 10)))
	.refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
		message: 'Param `take` must be a positive integer',
	})
	.transform((value) =>
		value === undefined ? undefined : Math.min(value, HUB_SKILLS_MAX_PAGE_SIZE),
	);

/** Derived from `userId` and `projectId` on the skill row. A CHECK constraint forbids both. */
export const hubSkillScopeSchema = z.enum(['user', 'project', 'instance']);

export type HubSkillScope = z.infer<typeof hubSkillScopeSchema>;

export const hubSkillSourceSchema = z.enum(['ui', 'upload', 'agent']);

export type HubSkillSource = z.infer<typeof hubSkillSourceSchema>;

/** One row of the skills hub list. Name and description come from the latest saved version. */
export type HubSkillListItem = {
	id: string;
	name: string;
	description: string;
	scope: HubSkillScope;
	/** Set for a project skill. */
	projectId: string | null;
	projectName: string | null;
	/** Set for a "Just you" skill. */
	userId: string | null;
	source: HubSkillSource;
	/** Number of the latest saved version, the one following agents read. */
	latestVersion: number;
	/** The draft row differs from the latest saved version. */
	hasUnsavedChanges: boolean;
	/** Distinct agents that use the skill: draft refs plus published pins. */
	usedByAgents: number;
	canEdit: boolean;
	canDelete: boolean;
	/**
	 * Only when the list was asked for a project (`attachableToProjectId`): whether an
	 * agent of that project may attach the skill. A team agent may attach its project's
	 * skills and instance skills; a personal agent its owner's "Just you" skills and
	 * instance skills.
	 */
	attachable?: boolean;
	createdAt: string;
	updatedAt: string;
};

export type HubSkillListResponse = {
	count: number;
	data: HubSkillListItem[];
};

export type HubSkillUsage = {
	drafts: Array<{ agentId: string; agentName: string; projectId: string }>;
	pins: Array<{
		agentId: string;
		agentName: string;
		agentVersionId: string;
		version: number;
		isActive: boolean;
	}>;
};

/** One skill with its editable draft, for the hub editor. */
export type HubSkillDetail = HubSkillListItem & {
	/** The draft row: what the editor shows and autosave writes. */
	skill: AgentSkill;
	/** Hash of `skill`, for the autosave concurrency check (`baseSkillHash`). */
	skillHash: string;
	usedBy: HubSkillUsage;
};

export type HubSkillSaveResponse = {
	id: string;
	versionId: string;
	version: number;
	/** False when the draft matched the latest version and nothing was saved. */
	created: boolean;
};

/** The request side of {@link ListHubSkillsQueryDto}: every field optional, numbers as the client holds them. */
export type HubSkillListQuery = {
	skip?: number;
	take?: number;
	search?: string;
	scope?: HubSkillScope;
	projectId?: string;
	attachableToProjectId?: string;
};

export class ListHubSkillsQueryDto extends Z.class({
	skip: paginationSchema.skip,
	take: optionalTake,
	search: z.string().trim().max(200).optional(),
	scope: hubSkillScopeSchema.optional(),
	projectId: z.string().max(36).optional(),
	/** Mark each skill with `attachable` for an agent of this project (the builder's picker). */
	attachableToProjectId: z.string().max(36).optional(),
}) {}

export class CreateHubSkillDto extends Z.class({
	scope: hubSkillScopeSchema,
	/** Required for a project skill. */
	projectId: z.string().max(36).optional(),
	skill: agentSkillSchema,
}) {}

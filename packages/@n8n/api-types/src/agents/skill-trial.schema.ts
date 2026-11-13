import { z } from 'zod';

import { Z } from '../zod-class';
import { skillCatalogIdSchema } from '../skills/skill-catalog.schema';
import type { SkillScanResult } from '../skills';
import type { AgentSkill } from './types';
import { AgentModelSchema } from './agent-json-config.schema';

export class PrepareSkillTrialQueryDto extends Z.class({
	catalogId: skillCatalogIdSchema,
}) {}

export class RunSkillTrialDto extends Z.class({
	catalogId: skillCatalogIdSchema,
	contentHash: z.string().regex(/^[a-f0-9]{64}$/),
	message: z.string().trim().min(1).max(10_000),
	model: AgentModelSchema,
	credential: z.string().trim().min(1).max(128),
}) {}

export type SkillTrialPreview = {
	skill: AgentSkill;
	contentHash: string;
	revision: string;
	check: SkillScanResult;
	skippedFiles: string[];
	defaultModel: { model: string; credential: string } | null;
};

export type SkillTrialResult = {
	response: string;
	skillLoaded: boolean;
	model: string;
	durationMs: number;
	totalTokens?: number;
};

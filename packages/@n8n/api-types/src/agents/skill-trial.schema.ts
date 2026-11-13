import { z } from 'zod';

import { Z } from '../zod-class';
import { skillCatalogIdSchema } from '../skills/skill-catalog.schema';
import type { SkillScanResult } from '../skills';
import type { AgentSkill } from './types';
import { AgentModelSchema } from './agent-json-config.schema';

export class PrepareSkillTrialQueryDto extends Z.class({
	catalogId: skillCatalogIdSchema,
}) {}

export const SKILL_TRIAL_MAX_HISTORY_MESSAGES = 40;
export const SKILL_TRIAL_MAX_HISTORY_CHARACTERS = 60_000;

const skillTrialMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string().trim().min(1).max(16_000),
});

export type SkillTrialMessage = z.infer<typeof skillTrialMessageSchema>;

export class RunSkillTrialDto extends Z.class({
	catalogId: skillCatalogIdSchema,
	contentHash: z.string().regex(/^[a-f0-9]{64}$/),
	message: z.string().trim().min(1).max(10_000),
	history: z
		.array(skillTrialMessageSchema)
		.max(SKILL_TRIAL_MAX_HISTORY_MESSAGES)
		.refine(
			(messages) =>
				messages.length % 2 === 0 &&
				messages.every(
					(message, index) => message.role === (index % 2 === 0 ? 'user' : 'assistant'),
				),
			'History must contain complete user and assistant turns',
		)
		.refine(
			(messages) =>
				messages.reduce((length, message) => length + message.content.length, 0) <=
				SKILL_TRIAL_MAX_HISTORY_CHARACTERS,
			'This chat is full. Start a new chat to continue.',
		)
		.optional(),
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

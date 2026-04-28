import { z } from 'zod';

import { Z } from '../../zod-class';

const skillIdSchema = z
	.string()
	.min(1)
	.regex(/^[a-z0-9_-]+$/);

export const AGENT_SKILL_DESCRIPTION_USE_WHEN_REGEX = /^Use when\s+\S/i;

export const agentSkillSchema = z.object({
	name: z.string().min(1).max(128),
	description: z
		.string()
		.regex(AGENT_SKILL_DESCRIPTION_USE_WHEN_REGEX, 'Description must start with "Use when ..."')
		.max(512),
	instructions: z.string().min(1),
});

export class CreateAgentSkillDto extends Z.class({
	id: skillIdSchema,
	...agentSkillSchema.shape,
}) {}

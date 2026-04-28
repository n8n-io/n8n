import { z } from 'zod';

import { Z } from '../../zod-class';

const skillIdSchema = z
	.string()
	.min(1)
	.regex(/^[a-z0-9_-]+$/);

export const AGENT_SKILL_DESCRIPTION_USE_WHEN_REGEX = /^Use when\s+\S/i;

/** Hard cap on a skill body. Large enough for serious playbooks, small enough
 * to keep a single skill from blowing past the LLM's context window when loaded. */
export const AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH = 50_000;

export const agentSkillSchema = z.object({
	name: z.string().min(1).max(128),
	description: z
		.string()
		.regex(AGENT_SKILL_DESCRIPTION_USE_WHEN_REGEX, 'Description must start with "Use when ..."')
		.max(512),
	instructions: z.string().min(1).max(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
});

export class CreateAgentSkillDto extends Z.class({
	id: skillIdSchema,
	...agentSkillSchema.shape,
}) {}

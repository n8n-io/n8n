import { z } from 'zod';

import { Z } from '../../zod-class';

/** Hard cap on a skill body. Large enough for serious playbooks, small enough
 * to keep a single skill from blowing past the LLM's context window when loaded. */
export const AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH = 10_000;

export const agentSkillSchema = z.object({
	name: z.string().min(1).max(128),
	description: z.string().min(1).max(512),
	instructions: z.string().min(1).max(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
});

export class CreateAgentSkillDto extends Z.class({
	...agentSkillSchema.shape,
}) {}

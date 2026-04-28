import { z } from 'zod';

import { Z } from '../../zod-class';

const skillIdSchema = z
	.string()
	.min(1)
	.regex(/^[a-z0-9_-]+$/);

export const agentSkillSchema = z.object({
	name: z.string().min(1).max(128),
	description: z.string().max(512),
	instructions: z.string().min(1),
});

export class CreateAgentSkillDto extends Z.class({
	id: skillIdSchema,
	...agentSkillSchema.shape,
}) {}

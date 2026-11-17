import { AgentJsonConfigBaseSchema, agentSkillSchema, skillScopeSchema } from '@n8n/api-types';
import { z } from 'zod';

export const skillIdSchema = AgentJsonConfigBaseSchema.shape.skills.unwrap().innerType().element
	.shape.id;

/**
 * One skill, at its latest saved version: a project skill or an instance skill. Version
 * pins and n8n Assistant availability do not travel.
 */
export const serializedSkillSchema = z
	.object({
		id: skillIdSchema,
		scope: skillScopeSchema,
		skill: agentSkillSchema.omit({ allowedTools: true }),
		frontmatter: z.record(z.unknown()).nullable(),
	})
	.strict();

export type SerializedSkill = z.infer<typeof serializedSkillSchema>;

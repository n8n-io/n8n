import { AgentJsonConfigBaseSchema, agentSkillSchema, skillScopeSchema } from '@n8n/api-types';
import { z } from 'zod';

export const skillIdSchema = AgentJsonConfigBaseSchema.shape.skills.unwrap().innerType().element
	.shape.id;

/**
 * One skill of the skills hub, at its latest saved version. A skill of one agent names
 * that agent. Version pins and n8n Assistant availability do not travel.
 */
export const serializedSkillSchema = z
	.object({
		id: skillIdSchema,
		scope: skillScopeSchema,
		agentId: z.string().min(1).optional(),
		skill: agentSkillSchema.omit({ allowedTools: true }),
		frontmatter: z.record(z.unknown()).nullable(),
	})
	.strict()
	.refine(({ scope, agentId }) => (scope === 'agent') === (agentId !== undefined), {
		message: 'A skill of one agent must name its agent, and only such a skill can.',
		path: ['agentId'],
	});

export type SerializedSkill = z.infer<typeof serializedSkillSchema>;

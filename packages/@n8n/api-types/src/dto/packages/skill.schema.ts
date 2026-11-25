import { z } from 'zod';

import { AgentJsonConfigBaseSchema } from '../../agents/agent-json-config.schema';
import { CreateSkillDto, skillScopeSchema } from '../../agents/skills.schema';

export const skillIdSchema = AgentJsonConfigBaseSchema.shape.skills.unwrap().innerType().element
	.shape.id;

/** The latest saved Skill. Version pins and Assistant availability do not travel. */
export const serializedSkillSchema = z
	.object({
		id: skillIdSchema,
		scope: skillScopeSchema,
		// Strict parsing still rejects these retired fields. Omit them from the public schema.
		skill: CreateSkillDto.schema.shape.skill.omit({
			scripts: true,
			templates: true,
			assets: true,
			examples: true,
			other: true,
		}),
		frontmatter: z.record(z.unknown()).nullable(),
	})
	.strict();

export type SerializedSkill = z.infer<typeof serializedSkillSchema>;

import { z } from 'zod';

export const ROLE_MAPPING_RULE_TYPES = ['instance', 'project'] as const;

export const roleMappingRuleResponseSchema = z.object({
	id: z.string().length(16),
	expression: z.string(),
	role: z.string(),
	type: z.enum(ROLE_MAPPING_RULE_TYPES),
	order: z.number().int(),
	projectIds: z.array(z.string()),
});

export type RoleMappingRuleResponse = z.infer<typeof roleMappingRuleResponseSchema>;

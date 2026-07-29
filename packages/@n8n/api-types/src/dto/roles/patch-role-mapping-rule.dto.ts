import { z } from 'zod';

import { Z } from '../../zod-class';

export class PatchRoleMappingRuleDto extends Z.class({
	expression: z.string().min(1).optional(),
	role: z.string().min(1).max(128).optional(),
	type: z.enum(['instance', 'project']).optional(),
	order: z.number().int().optional(),
	projectIds: z.array(z.string()).optional(),
}) {}

export type PatchRoleMappingRuleInput = z.infer<(typeof PatchRoleMappingRuleDto)['schema']>;

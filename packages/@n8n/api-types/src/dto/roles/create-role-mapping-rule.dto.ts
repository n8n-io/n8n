import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateRoleMappingRuleDto extends Z.class({
	expression: z.string().min(1),
	role: z.string().min(1).max(128),
	type: z.enum(['instance', 'project']),
	order: z.number().int(),
	projectIds: z.array(z.string()).optional(),
}) {}

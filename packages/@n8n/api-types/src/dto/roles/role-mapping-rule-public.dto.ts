import { z } from 'zod';

import { Z } from '../../zod-class';

export class RoleMappingRulePublicDto extends Z.class({
	id: z.string(),
	expression: z.string(),
	role: z.string(),
	type: z.enum(['instance', 'project']),
	order: z.number().int(),
	projectIds: z.array(z.string()),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
}) {}

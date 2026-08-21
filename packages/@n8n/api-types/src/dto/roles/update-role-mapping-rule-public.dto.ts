import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateRoleMappingRulePublicDto extends Z.class({
	expression: z.string().min(1).optional(),
	role: z.string().min(1).max(128).optional(),
	projectIds: z.array(z.string()).optional(),
}) {}

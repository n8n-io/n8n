import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const roleMappingRulePublicSchema = z.object({
	id: z.string(),
	expression: z.string(),
	role: z.string(),
	type: z.enum(['instance', 'project']),
	order: z.number().int(),
	projectIds: z.array(z.string()),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class RoleMappingRulePublicDto extends Z.class(roleMappingRulePublicSchema.shape) {}

export class RoleMappingRuleListPublicDto extends Z.class({
	data: z.array(roleMappingRulePublicSchema),
	nextCursor: z.string().nullable(),
}) {}

export class RoleMappingRuleListQueryPublicDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
	type: z.enum(['instance', 'project']).optional(),
}) {}

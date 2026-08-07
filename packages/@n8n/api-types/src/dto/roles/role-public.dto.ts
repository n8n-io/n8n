import { z } from 'zod';

import { Z } from '../../zod-class';

export class RolePublicDto extends Z.class({
	slug: z.string(),
	displayName: z.string(),
	description: z.string().nullable(),
	systemRole: z.boolean(),
	roleType: z.enum(['project', 'global']),
	scopes: z.array(z.string()),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
}) {}

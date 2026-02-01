import { scopeSchema } from '@n8n/permissions';
import { z } from 'zod';
import { Z } from 'zod-class';

export class CreateRoleDto extends Z.class({
	displayName: z.string().min(2).max(100),
	description: z.string().max(500).optional(),
	roleType: z.enum(['project']),
	scopes: z.array(scopeSchema),
}) {}

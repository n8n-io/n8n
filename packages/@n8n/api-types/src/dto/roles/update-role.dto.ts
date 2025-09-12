import { scopeSchema } from '@n8n/permissions';
import { z } from 'zod';
import { Z } from 'zod-class';

export class UpdateRoleDto extends Z.class({
	displayName: z.string().min(2).max(100).optional(),
	description: z.string().max(500).optional(),
	scopes: z.array(scopeSchema).optional(),
}) {}

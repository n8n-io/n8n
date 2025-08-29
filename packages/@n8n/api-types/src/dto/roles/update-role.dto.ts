import { scopeSchema } from '@n8n/permissions';
import { z } from 'zod';

export const updateRoleDtoSchema = z.object({
	displayName: z.string().min(2).max(100).optional(),
	description: z.string().max(500).optional(),
	scopes: z.array(scopeSchema).optional(),
});

export type UpdateRoleDto = z.infer<typeof updateRoleDtoSchema>;

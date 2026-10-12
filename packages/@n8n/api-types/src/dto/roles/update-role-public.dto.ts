import { scopeSchema } from '@n8n/permissions';
import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateRolePublicDto extends Z.class({
	displayName: z.string().min(2).max(100),
	description: z.string().max(500).nullable(),
	scopes: z.array(scopeSchema),
}) {}

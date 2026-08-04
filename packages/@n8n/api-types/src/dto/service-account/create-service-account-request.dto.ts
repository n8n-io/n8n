import { assignableGlobalRoleSchema } from '@n8n/permissions';
import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateServiceAccountRequestDto extends Z.class({
	// Stored in `user.firstName`, which is `varchar(32)`.
	name: z.string().trim().min(1, 'Name is required').max(32),
	role: assignableGlobalRoleSchema.default('global:member'),
}) {}

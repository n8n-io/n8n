import { z } from 'zod';

import { Z } from '../../zod-class';

const poolNameOrEmptySchema = z.string().regex(/^([a-z0-9][a-z0-9-]{0,62})?$/);
const nonEmptyPoolNameSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/);

export class UpdateProjectPoolSettingsDto extends Z.class({
	assignment: z
		.object({
			production: poolNameOrEmptySchema.optional(),
			manual: poolNameOrEmptySchema.optional(),
			evaluation: poolNameOrEmptySchema.optional(),
		})
		.optional(),
	allowedPools: z.array(nonEmptyPoolNameSchema).optional(),
}) {}

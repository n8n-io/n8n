import { z } from 'zod';

import { Z } from '../../zod-class';

// Empty string or null clears the project's pool (routes to the system default queue).
const poolNameOrEmptySchema = z.string().regex(/^([a-z0-9][a-z0-9-]{0,62})?$/);

export class UpdateProjectPoolSettingsDto extends Z.class({
	defaultPool: poolNameOrEmptySchema.nullable(),
}) {}

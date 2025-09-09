import { Z } from 'zod-class';

import { booleanFromString } from '../../schemas/boolean-from-string';

/**
 * Query DTO for retrieving a single role with optional usage count
 */
export class RoleGetQueryDto extends Z.class({
	withUsageCount: booleanFromString.optional().default('false'),
}) {}

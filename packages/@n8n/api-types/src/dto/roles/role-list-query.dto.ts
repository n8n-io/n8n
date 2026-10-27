import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

/**
 * Query DTO for listing roles with optional usage count
 */
export class RoleListQueryDto extends Z.class({
	withUsageCount: booleanFromString.optional().default('false'),
}) {}

import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Query DTO for deleting a role. When the role still has users assigned,
 * `reassignRoleSlug` selects the role those users are moved to before deletion.
 */
export class RoleDeleteQueryDto extends Z.class({
	reassignRoleSlug: z.string().min(1).optional(),
}) {}

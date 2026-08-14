import { assignableGlobalRoleSchema } from '@n8n/permissions';

import { Z } from '../../zod-class';

/**
 * Query DTO for deleting a role. When the role still has users assigned,
 * `reassignRoleSlug` selects the role those users are moved to before deletion.
 *
 * Reassignment is only supported for global roles, and the target must be an
 * assignable global role — the owner role is never a valid target.
 */
export class RoleDeleteQueryDto extends Z.class({
	reassignRoleSlug: assignableGlobalRoleSchema.optional(),
}) {}

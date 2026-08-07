import type { User } from '@n8n/db';
import { hasGlobalScope, type RoleNamespace } from '@n8n/permissions';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * Managing a role requires `role:manage`; `role:manageProject` grants it for
 * project roles only. Shared by the internal and public API controllers.
 */
export function assertCanManageRoleType(user: User, roleType: RoleNamespace): void {
	if (hasGlobalScope(user, 'role:manage')) return;
	if (roleType === 'project' && hasGlobalScope(user, 'role:manageProject')) return;
	throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE);
}

import { hasPermission } from '@/app/utils/rbac/permissions';

/** Instance AI settings and opt-in flows require this scope. */
export function canManageInstanceAi(): boolean {
	return hasPermission(['rbac'], { rbac: { scope: 'instanceAi:manage' } });
}

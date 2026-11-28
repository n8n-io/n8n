import { hasPermission } from '@/app/utils/rbac/permissions';

/** Instance AI settings and opt-in flows require this scope. */
export function canManageInstanceAi(): boolean {
	return hasPermission(['rbac'], { rbac: { scope: 'instanceAi:manage' } });
}

/** Sending messages to Instance AI (and reaching the chat view) requires this scope. */
export function canMessageInstanceAi(): boolean {
	return hasPermission(['rbac'], { rbac: { scope: 'instanceAi:message' } });
}

/** The usage insights of the Assistant require this scope. */
export function canViewAssistantUsage(): boolean {
	return hasPermission(['rbac'], { rbac: { scope: 'instanceAi:viewUsage' } });
}

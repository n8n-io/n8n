import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useUsersStore } from '@n8n/stores/users.store';

/**
 * Central place for the rules that make a custom role non-deletable, mirroring the
 * backend guards so the UI can disable the action and explain why up front.
 * Only instance (global) roles are gated; project roles are unaffected.
 */
export function useRoleDeleteGuard() {
	const rbacStore = useRBACStore();
	const usersStore = useUsersStore();
	const i18n = useI18n();

	/** Returns a message explaining why the role can't be deleted, or undefined when it can. */
	function deleteBlockedReason(role: Role, roleType: 'global' | 'project'): string | undefined {
		if (roleType !== 'global') return undefined;

		// Your own instance role always includes you, and you can't reassign yourself
		// off it, so it can never be deleted from here.
		if (role.slug === usersStore.currentUser?.role) {
			return i18n.baseText('roles.action.delete.ownRole');
		}

		// A role with assigned users can only be removed by reassigning them, which the
		// backend gates on user:changeRole.
		if ((role.usedByUsers ?? 0) > 0 && !rbacStore.hasScope('user:changeRole')) {
			return i18n.baseText('roles.action.delete.hasAssignedUsers');
		}

		return undefined;
	}

	return { deleteBlockedReason };
}

import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { ref } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';

type RoleType = 'global' | 'project';

interface RequestDeleteOptions {
	roleType: RoleType;
	/** Where to navigate after a successful deletion (e.g. the detail view returns to the list). */
	redirectTo?: RouteLocationRaw;
	/**
	 * Guard run before anything else. Return `false` to abort the deletion
	 * (e.g. when the role is still in use and can't be deleted).
	 */
	onBeforeDelete?: (role: Role) => Promise<boolean>;
}

/** A pending reassign-then-delete, carrying what the modal needs plus the follow-up. */
interface ReassignState extends Pick<RequestDeleteOptions, 'roleType' | 'redirectTo'> {
	role: Role;
	userCount: number;
}

/**
 * Encapsulates the full role-deletion UX so every entry point (roles list, role detail)
 * behaves identically: guard → for instance roles with assigned users open the
 * reassign-then-delete modal, otherwise confirm and delete.
 */
export function useRoleDeletion() {
	const rolesStore = useRolesStore();
	const { showError, showMessage } = useToast();
	const message = useMessage();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const router = useRouter();

	/** When set, an instance role with assigned users is awaiting reassignment in the modal. */
	const reassignState = ref<ReassignState | null>(null);

	/**
	 * Fetch the current number of users assigned to a role. Returns `null` (and surfaces
	 * an error toast) if the lookup fails, so callers can abort rather than act on a
	 * stale, page-load snapshot.
	 */
	async function resolveAssignedUserCount(slug: string): Promise<number | null> {
		try {
			const role = await rolesStore.fetchRoleBySlug({ slug });
			return role.usedByUsers ?? 0;
		} catch (error) {
			showError(error, i18n.baseText('roles.action.delete.error'));
			return null;
		}
	}

	async function performRoleDeletion(options: {
		role: Role;
		roleType: RoleType;
		reassignRoleSlug?: string;
		redirectTo?: RouteLocationRaw;
	}): Promise<void> {
		const { role, roleType, reassignRoleSlug, redirectTo } = options;

		try {
			await rolesStore.deleteRole(role.slug, reassignRoleSlug);

			const index = rolesStore.roles[roleType].findIndex((r) => r.slug === role.slug);
			if (index !== -1) {
				rolesStore.roles[roleType].splice(index, 1);
			}

			// Reassignment shifts the target role's member count, so refetch to reconcile.
			if (reassignRoleSlug) {
				void rolesStore.fetchRoles();
			}

			showMessage({ title: i18n.baseText('roles.action.delete.success'), type: 'success' });
			telemetry.track('User successfully deleted role', {
				role_id: role.slug,
				role_name: role.displayName,
				role_type: roleType === 'global' ? 'instance' : 'project',
				permissions: role.scopes,
			});

			if (redirectTo) {
				void router.push(redirectTo);
			}
		} catch (error) {
			showError(error, i18n.baseText('roles.action.delete.error'));
		}
	}

	/**
	 * Entry point for deleting a role. Instance roles with assigned users open the
	 * reassign modal (resolved later via {@link confirmReassignDelete}); everything else
	 * goes through a confirmation dialog and is deleted immediately.
	 */
	async function requestDelete(role: Role, options: RequestDeleteOptions): Promise<void> {
		const { roleType, redirectTo, onBeforeDelete } = options;

		if (onBeforeDelete) {
			const proceed = await onBeforeDelete(role);
			if (!proceed) return;
		}

		if (roleType === 'global') {
			const userCount = await resolveAssignedUserCount(role.slug);
			if (userCount === null) return;

			if (userCount > 0) {
				reassignState.value = { role, userCount, roleType, redirectTo };
				return;
			}
		}

		const confirmed = await message.confirm(
			i18n.baseText('roles.action.delete.text', { interpolate: { roleName: role.displayName } }),
			i18n.baseText('roles.action.delete.title', { interpolate: { roleName: role.displayName } }),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('roles.action.delete'),
				cancelButtonText: i18n.baseText('roles.action.cancel'),
			},
		);
		if (confirmed !== MODAL_CONFIRM) return;

		await performRoleDeletion({ role, roleType, redirectTo });
	}

	/** Complete a pending reassign-then-delete with the chosen replacement role. */
	function confirmReassignDelete(reassignRoleSlug: string): void {
		const state = reassignState.value;
		if (!state) return;
		reassignState.value = null;
		void performRoleDeletion({
			role: state.role,
			roleType: state.roleType,
			reassignRoleSlug,
			redirectTo: state.redirectTo,
		});
	}

	function cancelReassign(): void {
		reassignState.value = null;
	}

	return { reassignState, requestDelete, confirmReassignDelete, cancelReassign };
}

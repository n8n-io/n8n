import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useRolesStore } from '@/app/stores/roles.store';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useRouter } from 'vue-router';
import { useRoleDeletion } from './useRoleDeletion';

export interface RoleListViews {
	/** Route name for read-only system-role detail page. */
	viewRoute: string;
	/** Route name for editable custom-role detail page. */
	editRoute: string;
}

export interface UseRolesListActionsOptions {
	roleType: 'project' | 'global';
	views: RoleListViews;
	/**
	 * Called before the standard delete confirmation dialog.
	 * Return `false` to abort the deletion (e.g. when the role is still in use).
	 */
	onBeforeDelete?: (item: Role) => Promise<boolean>;
}

export function useRolesListActions({
	roleType,
	views,
	onBeforeDelete,
}: UseRolesListActionsOptions) {
	const { showError, showMessage } = useToast();
	const rolesStore = useRolesStore();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const router = useRouter();
	const { reassignState, requestDelete, confirmReassignDelete, cancelReassign } = useRoleDeletion();

	async function duplicateRole(item: Role): Promise<Role | undefined> {
		try {
			const displayName = i18n.baseText('roles.action.duplicate.name', {
				interpolate: { roleName: item.displayName },
			});
			const role = await rolesStore.createRole({
				displayName,
				description: item.description ?? undefined,
				roleType,
				scopes: item.scopes,
			});

			// Optimistic update — background fetch reconciles with server state.
			rolesStore.roles[roleType].push(role);
			void rolesStore.fetchRoles();

			telemetry.track('User duplicated role', {
				role_id: item.slug,
				role_name: item.displayName,
				permissions: item.scopes,
			});

			showMessage({
				type: 'success',
				message: i18n.baseText('roles.action.duplicate.success', {
					interpolate: { roleName: item.displayName, roleDuplicateName: displayName },
				}),
			});

			return role;
		} catch (error) {
			showError(error, i18n.baseText('roles.action.duplicate.error'));
			return undefined;
		}
	}

	async function deleteRole(item: Role): Promise<void> {
		await requestDelete(item, { roleType, onBeforeDelete });
	}

	const actions = { duplicate: duplicateRole, delete: deleteRole } as const;

	function rowActions(
		_item: Role,
	): Array<{ label: string; value: keyof typeof actions; disabled?: boolean }> {
		return [
			{ label: i18n.baseText('roles.action.duplicate'), value: 'duplicate' },
			{ label: i18n.baseText('roles.action.delete'), value: 'delete' },
		];
	}

	function handleAction(action: string, item: Role): void {
		void actions[action as keyof typeof actions](item);
	}

	function handleRowClick(item: Role): void {
		void router.push({
			name: item.systemRole ? views.viewRoute : views.editRoute,
			params: { roleSlug: item.slug },
		});
	}

	return {
		duplicateRole,
		deleteRole,
		actions,
		rowActions,
		handleAction,
		handleRowClick,
		reassignState,
		confirmReassignDelete,
		cancelReassign,
	};
}

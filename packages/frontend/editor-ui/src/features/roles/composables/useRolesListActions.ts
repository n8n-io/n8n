import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useRouter } from 'vue-router';

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
	const message = useMessage();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const router = useRouter();

	const storeKey = roleType === 'project' ? 'project' : 'global';

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
			rolesStore.roles[storeKey].push(role);
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
		if (onBeforeDelete) {
			const proceed = await onBeforeDelete(item);
			if (!proceed) return;
		}

		const confirmed = await message.confirm(
			i18n.baseText('roles.action.delete.text', {
				interpolate: { roleName: item.displayName },
			}),
			i18n.baseText('roles.action.delete.title', {
				interpolate: { roleName: item.displayName },
			}),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('roles.action.delete'),
				cancelButtonText: i18n.baseText('roles.action.cancel'),
			},
		);

		if (confirmed !== MODAL_CONFIRM) return;

		try {
			await rolesStore.deleteRole(item.slug);

			const index = rolesStore.roles[storeKey].findIndex((r) => r.slug === item.slug);
			if (index !== -1) {
				rolesStore.roles[storeKey].splice(index, 1);
			}

			showMessage({ title: i18n.baseText('roles.action.delete.success'), type: 'success' });
		} catch (error) {
			showError(error, i18n.baseText('roles.action.delete.error'));
		}
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

	return { duplicateRole, deleteRole, actions, rowActions, handleAction, handleRowClick };
}

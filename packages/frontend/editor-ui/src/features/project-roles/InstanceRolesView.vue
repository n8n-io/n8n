<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import RolesTable from './RolesTable.vue';

const { showError, showMessage } = useToast();

const rolesStore = useRolesStore();
const message = useMessage();
const i18n = useI18n();
const settingsStore = useSettingsStore();
const telemetry = useTelemetry();

async function deleteRole(item: Role) {
	const deleteConfirmed = await message.confirm(
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

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		await rolesStore.deleteRole(item.slug);

		const index = rolesStore.roles.global.findIndex((role) => role.slug === item.slug);
		if (index !== -1) {
			rolesStore.roles.global.splice(index, 1);
		}

		showMessage({ title: i18n.baseText('roles.action.delete.success'), type: 'success' });
	} catch (error) {
		showError(error, i18n.baseText('roles.action.delete.error'));
	}
}

async function duplicateRole(item: Role) {
	try {
		const displayName = i18n.baseText('roles.action.duplicate.name', {
			interpolate: { roleName: item.displayName },
		});
		const role = await rolesStore.createRole({
			displayName,
			description: item.description ?? undefined,
			roleType: 'global',
			scopes: item.scopes,
		});

		rolesStore.roles.global.push(role);
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
	} catch (error) {
		showError(error, i18n.baseText('roles.action.duplicate.error'));
	}
}

const actions = {
	duplicate: duplicateRole,
	delete: deleteRole,
} as const;

function rowActions(
	_item: Role,
): Array<{ label: string; value: keyof typeof actions; disabled?: boolean }> {
	return [
		{ label: i18n.baseText('roles.action.duplicate'), value: 'duplicate' },
		{ label: i18n.baseText('roles.action.delete'), value: 'delete' },
	];
}

function handleAction(action: string, item: Role) {
	void actions[action as keyof typeof actions](item);
}

function handleRowClick(_item: Role) {
	// Instance role detail (view/edit) routes are introduced in a follow-up ticket.
}
</script>

<template>
	<div>
		<RolesTable
			:roles="rolesStore.processedInstanceRoles"
			:show-paywall="!settingsStore.isCustomRolesFeatureEnabled"
			:count-column-title="i18n.baseText('instanceRoles.table.membersAssigned')"
			count-column-key="usedByUsers"
			:row-actions="rowActions"
			@action="handleAction"
			@row-click="handleRowClick"
		/>
	</div>
</template>

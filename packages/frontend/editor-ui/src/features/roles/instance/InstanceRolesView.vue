<script setup lang="ts">
import { computed } from 'vue';
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import RolesTable from '../components/RolesTable.vue';
import { useRolesListActions } from '../composables/useRolesListActions';
import DeleteInstanceRoleModal from './components/DeleteInstanceRoleModal.vue';

const rolesStore = useRolesStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();

const {
	rowActions,
	handleAction,
	handleRowClick,
	reassignState,
	confirmReassignDelete,
	cancelReassign,
} = useRolesListActions({
	roleType: 'global',
	views: { viewRoute: VIEWS.INSTANCE_ROLE_VIEW, editRoute: VIEWS.INSTANCE_ROLE_SETTINGS },
});

const reassignTargetRoles = computed(() =>
	reassignState.value
		? rolesStore.processedInstanceRoles.filter((r) => r.slug !== reassignState.value?.role.slug)
		: [],
);
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

		<DeleteInstanceRoleModal
			:model-value="reassignState !== null"
			:role="reassignState?.role ?? null"
			:user-count="reassignState?.userCount ?? 0"
			:available-roles="reassignTargetRoles"
			@confirm="confirmReassignDelete"
			@update:model-value="(open?: boolean) => !open && cancelReassign()"
		/>
	</div>
</template>

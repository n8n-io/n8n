<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import RolesTable from '../components/RolesTable.vue';
import { useRolesListActions } from '../composables/useRolesListActions';

const rolesStore = useRolesStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();

const { rowActions, handleAction, handleRowClick } = useRolesListActions({
	roleType: 'global',
	views: { viewRoute: VIEWS.INSTANCE_ROLE_VIEW, editRoute: VIEWS.INSTANCE_ROLE_SETTINGS },
});
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

<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useRouter } from 'vue-router';
import RolesTable from '../components/RolesTable.vue';
import { useRolesListActions } from '../composables/useRolesListActions';

const rolesStore = useRolesStore();
const router = useRouter();
const message = useMessage();
const i18n = useI18n();
const settingsStore = useSettingsStore();

function projectAssignmentsRoute(item: Role) {
	return {
		name: item.systemRole ? VIEWS.PROJECT_ROLE_VIEW : VIEWS.PROJECT_ROLE_SETTINGS,
		params: { roleSlug: item.slug },
		query: { tab: 'assignments' },
	};
}

async function onBeforeDelete(item: Role): Promise<boolean> {
	// When role is in use, show "Go to assignments" dialog instead of delete confirmation.
	if (!item.usedByProjects || item.usedByProjects === 0) return true;

	const inUseText =
		[
			i18n.baseText('projectRoles.action.delete.useWarning.before'),
			i18n.baseText('projectRoles.action.delete.useWarning.linkText', {
				adjustToNumber: item.usedByProjects,
				interpolate: { count: item.usedByProjects },
			}),
		].join(' ') +
		'. ' +
		i18n.baseText('projectRoles.action.delete.useWarning.after');

	const goToAssignments = await message.confirm(
		inUseText,
		i18n.baseText('projectRoles.action.delete.inUse.title', {
			interpolate: { roleName: item.displayName },
		}),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('projectRoles.action.delete.inUse.goToAssignments'),
			cancelButtonText: i18n.baseText('roles.action.cancel'),
		},
	);

	if (goToAssignments === MODAL_CONFIRM) {
		void router.push({
			name: item.systemRole ? VIEWS.PROJECT_ROLE_VIEW : VIEWS.PROJECT_ROLE_SETTINGS,
			params: { roleSlug: item.slug },
			query: { tab: 'assignments' },
		});
	}
	return false;
}

const { rowActions, handleAction, handleRowClick } = useRolesListActions({
	roleType: 'project',
	views: { viewRoute: VIEWS.PROJECT_ROLE_VIEW, editRoute: VIEWS.PROJECT_ROLE_SETTINGS },
	onBeforeDelete,
});
</script>

<template>
	<div class="pb-xl">
		<RolesTable
			:roles="rolesStore.processedProjectRoles"
			:show-paywall="!settingsStore.isCustomRolesFeatureEnabled"
			:count-column-title="i18n.baseText('projectRoles.sourceControl.table.projectsAssigned')"
			count-column-key="usedByProjects"
			:row-actions="rowActions"
			:get-count-route="projectAssignmentsRoute"
			@action="handleAction"
			@row-click="handleRowClick"
		/>
	</div>
</template>

<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { N8nButton, N8nHeading, N8nTag } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { onMounted, useCssModule } from 'vue';
import { useRouter } from 'vue-router';
import RolesTable from '../components/RolesTable.vue';
import { useRolesListActions } from '../composables/useRolesListActions';

const props = defineProps<{
	/** When rendered inside the tabbed Roles shell, the shell owns the page heading. */
	embedded?: boolean;
}>();

const { showError } = useToast();

const rolesStore = useRolesStore();
const router = useRouter();
const message = useMessage();
const i18n = useI18n();
const $style = useCssModule();
const settingsStore = useSettingsStore();
const telemetry = useTelemetry();

onMounted(async () => {
	if (!props.embedded) {
		useDocumentTitle().set(i18n.baseText('settings.projectRoles'));
		try {
			await rolesStore.fetchRoles();
		} catch (error) {
			showError(error, i18n.baseText('roles.fetch.error'));
		}
	}
});

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

function addRole() {
	telemetry.track('User clicked add role');
	void router.push({ name: VIEWS.PROJECT_NEW_ROLE });
}
</script>

<template>
	<div class="pb-xl">
		<div v-if="!embedded" class="mb-xl" :class="$style.headerContainer">
			<div :class="$style.headerTitle">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('settings.projectRoles') }}
				</N8nHeading>
				<N8nTag :clickable="false" text="New" :class="$style.newTag" />
			</div>
			<N8nButton
				v-if="settingsStore.isCustomRolesFeatureEnabled"
				variant="solid"
				icon="plus"
				@click="addRole"
			>
				{{ i18n.baseText('roles.addRole') }}
			</N8nButton>
		</div>

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

<style lang="css" module>
.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.newTag {
	background-color: var(--color--foreground--shade-2);
	color: var(--color--background);
	border-color: var(--color--foreground--shade-2);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: var(--spacing--sm);
	min-height: auto;
	height: auto;
	line-height: 1;
}
</style>

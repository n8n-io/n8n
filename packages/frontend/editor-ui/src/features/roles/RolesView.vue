<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants/urls';
import { useRolesStore } from '@n8n/stores/roles.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { TabOptions } from '@n8n/design-system';
import { N8nButton, N8nSettingsLayout, N8nSettingsPageHeader, N8nTabs } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import InstanceRolesView from './instance/InstanceRolesView.vue';
import ProjectRolesView from './project/ProjectRolesView.vue';
import { useRBACStore } from '@n8n/stores/rbac.store';

type RolesTab = 'instance' | 'project';
const DEFAULT_TAB: RolesTab = 'instance';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const rolesStore = useRolesStore();
const settingsStore = useSettingsStore();
const { showError } = useToast();
const rbacStore = useRBACStore();

function normalizeTab(value: unknown): RolesTab {
	return value === 'project' || !rbacStore.hasScope('role:manage') ? 'project' : DEFAULT_TAB;
}

const canManageInstanceRoles = computed(() => rbacStore.hasScope('role:manage'));

const activeTab = ref<RolesTab>(normalizeTab(route.query.tab));

function addRole() {
	void router.push({
		name: activeTab.value === 'project' ? VIEWS.PROJECT_NEW_ROLE : VIEWS.INSTANCE_NEW_ROLE,
	});
}

// Reflect the active tab in the button, mirroring the resource-scoped labels used
// on the workflows and credentials lists.
const addRoleLabel = computed(() =>
	i18n.baseText(activeTab.value === 'project' ? 'roles.addRole.project' : 'roles.addRole.instance'),
);

const tabOptions = computed<Array<TabOptions<RolesTab>>>(() => [
	{
		label: i18n.baseText('roles.tab.instance'),
		value: 'instance',
		disabled: !canManageInstanceRoles.value,
		tooltip: canManageInstanceRoles.value
			? undefined
			: i18n.baseText('roles.tab.instance.disabledTooltip'),
	},
	{ label: i18n.baseText('roles.tab.project'), value: 'project' },
]);

// Reflect tab selection in the URL (replace keeps history clean / back-button safe).
watch(activeTab, (tab) => {
	if (normalizeTab(route.query.tab) !== tab) {
		void router.replace({ query: { ...route.query, tab } });
	}
});

// Reflect external URL changes (back/forward, deep links) into the active tab.
watch(
	() => route.query.tab,
	(tab) => {
		activeTab.value = normalizeTab(tab);
	},
);

onMounted(async () => {
	useDocumentTitle().set(i18n.baseText('settings.roles'));
	try {
		await rolesStore.fetchRoles();
	} catch (error) {
		showError(error, i18n.baseText('roles.fetch.error'));
	}
});
</script>

<template>
	<N8nSettingsLayout size="wide">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.roles')"
			:description="i18n.baseText('roles.description')"
			:docs-url="CUSTOM_ROLES_DOCS_URL"
			:docs-label="i18n.baseText('roles.description.docsLink')"
			docs-leading-text=""
		/>

		<div :class="$style.tabsRow" class="mb-l">
			<N8nTabs v-model="activeTab" :options="tabOptions" data-test-id="roles-tabs" />
			<N8nButton
				v-if="settingsStore.isCustomRolesFeatureEnabled"
				variant="solid"
				icon="plus"
				@click="addRole"
			>
				{{ addRoleLabel }}
			</N8nButton>
		</div>

		<InstanceRolesView v-if="activeTab === 'instance' && canManageInstanceRoles" />
		<ProjectRolesView v-else />
	</N8nSettingsLayout>
</template>

<style lang="css" module>
.tabsRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
</style>

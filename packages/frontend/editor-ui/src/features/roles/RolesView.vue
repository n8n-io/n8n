<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants/urls';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { TabOptions } from '@n8n/design-system';
import { N8nButton, N8nHeading, N8nLink, N8nTabs, N8nTag, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import InstanceRolesView from './instance/InstanceRolesView.vue';
import ProjectRolesView from './project/ProjectRolesView.vue';
import { useRBACStore } from '@/app/stores/rbac.store';

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

const tabOptions = computed<Array<TabOptions<RolesTab>>>(() =>
	canManageInstanceRoles.value
		? [
				{ label: i18n.baseText('roles.tab.instance'), value: 'instance' },
				{ label: i18n.baseText('roles.tab.project'), value: 'project' },
			]
		: [{ label: i18n.baseText('roles.tab.project'), value: 'project' }],
);

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
	<div class="pb-xl">
		<div class="mb-m" :class="$style.headerTitle">
			<N8nHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('settings.roles') }}
			</N8nHeading>
			<N8nTag :clickable="false" text="New" :class="$style.newTag" />
		</div>

		<N8nText color="text-base" class="mb-xl" tag="p">
			{{ i18n.baseText('roles.description') }}
			<N8nLink :href="CUSTOM_ROLES_DOCS_URL" target="_blank" new-window>{{
				i18n.baseText('roles.description.docsLink')
			}}</N8nLink>
		</N8nText>

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
	</div>
</template>

<style lang="css" module>
.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.tabsRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
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

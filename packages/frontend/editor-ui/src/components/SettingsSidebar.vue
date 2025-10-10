<script lang="ts" setup>
import { computed } from 'vue';
import { ABOUT_MODAL_KEY, VIEWS } from '@/constants';
import { useUserHelpers } from '@/composables/useUserHelpers';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { hasPermission } from '@/utils/rbac/permissions';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';

import { N8nIcon, N8nLink, N8nMenuItem, N8nText, type IMenuItem } from '@n8n/design-system';
const emit = defineEmits<{
	return: [];
}>();

const router = useRouter();
const route = useRoute();
const i18n = useI18n();

const { canUserAccessRouteByName } = useUserHelpers(router, route);

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

const sidebarMenuItems = computed<IMenuItem[]>(() => {
	const menuItems: IMenuItem[] = [
		{
			id: 'settings-usage-and-plan',
			icon: 'chart-column-decreasing',
			label: i18n.baseText('settings.usageAndPlan.title'),
			position: 'top',
			available: canUserAccessRouteByName(VIEWS.USAGE),
			route: { to: { name: VIEWS.USAGE } },
		},
		{
			id: 'settings-personal',
			icon: 'circle-user-round',
			label: i18n.baseText('settings.personal'),
			position: 'top',
			available: canUserAccessRouteByName(VIEWS.PERSONAL_SETTINGS),
			route: { to: { name: VIEWS.PERSONAL_SETTINGS } },
		},
		{
			id: 'settings-users',
			icon: 'user-round',
			label: i18n.baseText('settings.users'),
			position: 'top',
			available: canUserAccessRouteByName(VIEWS.USERS_SETTINGS),
			route: { to: { name: VIEWS.USERS_SETTINGS } },
		},
		{
			id: 'settings-api',
			icon: 'plug',
			label: i18n.baseText('settings.n8napi'),
			position: 'top',
			available: settingsStore.isPublicApiEnabled && canUserAccessRouteByName(VIEWS.API_SETTINGS),
			route: { to: { name: VIEWS.API_SETTINGS } },
		},
		{
			id: 'settings-external-secrets',
			icon: 'vault',
			label: i18n.baseText('settings.externalSecrets.title'),
			position: 'top',
			available: canUserAccessRouteByName(VIEWS.EXTERNAL_SECRETS_SETTINGS),
			route: { to: { name: VIEWS.EXTERNAL_SECRETS_SETTINGS } },
		},

		{
			id: 'settings-source-control',
			icon: 'git-branch',
			label: i18n.baseText('settings.sourceControl.title'),
			position: 'top',
			available: canUserAccessRouteByName(VIEWS.SOURCE_CONTROL),
			route: { to: { name: VIEWS.SOURCE_CONTROL } },
		},
		{
			id: 'settings-sso',
			icon: 'user-lock',
			label: i18n.baseText('settings.sso'),
			position: 'top',
			available: canUserAccessRouteByName(VIEWS.SSO_SETTINGS),
			route: { to: { name: VIEWS.SSO_SETTINGS } },
		},
		{
			id: 'settings-ldap',
			icon: 'network',
			label: i18n.baseText('settings.ldap'),
			position: 'top',
			available: canUserAccessRouteByName(VIEWS.LDAP_SETTINGS),
			route: { to: { name: VIEWS.LDAP_SETTINGS } },
		},
		{
			id: 'settings-workersview',
			icon: 'waypoints',
			label: i18n.baseText('mainSidebar.workersView'),
			position: 'top',
			available:
				settingsStore.isQueueModeEnabled &&
				hasPermission(['rbac'], { rbac: { scope: 'workersView:manage' } }),
			route: { to: { name: VIEWS.WORKER_VIEW } },
		},
	];

	menuItems.push({
		id: 'settings-log-streaming',
		icon: 'log-in',
		label: i18n.baseText('settings.log-streaming'),
		position: 'top',
		available: canUserAccessRouteByName(VIEWS.LOG_STREAMING_SETTINGS),
		route: { to: { name: VIEWS.LOG_STREAMING_SETTINGS } },
	});

	menuItems.push({
		id: 'settings-community-nodes',
		icon: 'box',
		label: i18n.baseText('settings.communityNodes'),
		position: 'top',
		available: canUserAccessRouteByName(VIEWS.COMMUNITY_NODES),
		route: { to: { name: VIEWS.COMMUNITY_NODES } },
	});

	// Append module-registered settings sidebar items.
	const moduleItems = uiStore.settingsSidebarItems;

	return menuItems.concat(moduleItems.filter((item) => !menuItems.some((m) => m.id === item.id)));
});

const visibleItems = computed(() => sidebarMenuItems.value.filter((item) => item.available));
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.returnButton" data-test-id="settings-back" @click="emit('return')">
			<i>
				<N8nIcon icon="arrow-left" />
			</i>
			<N8nText bold>{{ i18n.baseText('settings') }}</N8nText>
		</div>
		<div :class="$style.items">
			<N8nMenuItem v-for="item in visibleItems" :key="item.id" :item="item" />
		</div>
		<div :class="$style.versionContainer">
			<N8nLink size="small" @click="uiStore.openModal(ABOUT_MODAL_KEY)">
				{{ i18n.baseText('settings.version') }} {{ rootStore.versionCli }}
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	min-width: $sidebar-expanded-width;
	height: 100%;
	background-color: var(--color--background--light-3);
	border-right: var(--border);
	position: relative;
	overflow: auto;
}

.returnButton {
	padding: var(--spacing--xs);
	cursor: pointer;
	display: flex;
	gap: var(--spacing--3xs);
	align-items: center;
	&:hover {
		color: var(--color--primary);
	}
}

.items {
	display: flex;
	flex-direction: column;

	padding: 0 var(--spacing--3xs);
}

.versionContainer {
	padding: var(--spacing--xs);
}

@media screen and (max-height: 420px) {
	.versionContainer {
		display: none;
	}
}
</style>

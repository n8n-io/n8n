import { useRouter } from 'vue-router';
import { useUserHelpers } from './useUserHelpers';
import { computed } from 'vue';
import type { IMenuItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '../constants';
import { useUIStore } from '../stores/ui.store';
import { useSettingsStore } from '../stores/settings.store';
import { hasPermission } from '../utils/rbac/permissions';

export function useSettingsItems() {
	const router = useRouter();
	const i18n = useI18n();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();
	const { canUserAccessRouteByName } = useUserHelpers(router);

	const settingsItems = computed<IMenuItem[]>(() => {
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
				id: 'settings-project-roles',
				icon: 'user-round',
				label: i18n.baseText('settings.projectRoles'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.PROJECT_ROLES_SETTINGS),
				route: { to: { name: VIEWS.PROJECT_ROLES_SETTINGS } },
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

		menuItems.push({
			id: 'settings-migration-report',
			icon: 'list-checks',
			label: i18n.baseText('settings.migrationReport'),
			position: 'top',
			available: canUserAccessRouteByName(VIEWS.MIGRATION_REPORT),
			route: { to: { name: VIEWS.MIGRATION_REPORT } },
		});

		// Append module-registered settings sidebar items.
		const moduleItems = uiStore.settingsSidebarItems;

		return menuItems.concat(moduleItems.filter((item) => !menuItems.some((m) => m.id === item.id)));
	});

	const visibleSettingsItems = computed(() => settingsItems.value.filter((item) => item.available));

	return { settingsItems: visibleSettingsItems };
}

import { useRouter } from 'vue-router';
import { useUserHelpers } from './useUserHelpers';
import { useAiGateway } from './useAiGateway';
import { useAiGatewayTopUp } from './useAiGatewayTopUp';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '../constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { hasPermission } from '../utils/rbac/permissions';
import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import {
	flattenSettingsEntries,
	type SettingsSidebarGroup,
	type SettingsSidebarGroupId,
} from '@/app/composables/settingsSidebar.utils';
import { useUIStore } from '@/app/stores/ui.store';
import type { IMenuItem } from '@n8n/design-system';

const SETTINGS_SIDEBAR_GROUP_IDS: SettingsSidebarGroupId[] = [
	'account',
	'users',
	'ai',
	'security',
	'instance',
];

function moduleSettingsGroupId(item: IMenuItem): SettingsSidebarGroupId {
	const group = 'group' in item ? item.group : undefined;
	return typeof group === 'string' &&
		SETTINGS_SIDEBAR_GROUP_IDS.includes(group as SettingsSidebarGroupId)
		? (group as SettingsSidebarGroupId)
		: 'instance';
}

export function useSettingsItems() {
	const router = useRouter();
	const i18n = useI18n();
	const settingsStore = useSettingsStore();
	const { canUserAccessRouteByName } = useUserHelpers(router);
	const { balance } = useAiGateway();
	const { openTopUp } = useAiGatewayTopUp();
	const { check: envFeatureFlagCheck } = useEnvFeatureFlag();
	const uiStore = useUIStore();

	const settingsEntries = computed<SettingsSidebarGroup[]>(() => {
		const groups: SettingsSidebarGroup[] = [
			{
				type: 'group',
				id: 'account',
				label: i18n.baseText('settings.sidebar.group.account'),
				items: [
					{
						type: 'item',
						id: 'settings-personal',
						icon: 'circle-user-round',
						label: i18n.baseText('settings.personal'),
						available: canUserAccessRouteByName(VIEWS.PERSONAL_SETTINGS),
						route: { to: { name: VIEWS.PERSONAL_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-usage-and-plan',
						icon: 'chart-column-decreasing',
						label: i18n.baseText('settings.usageAndPlan.title'),
						available: canUserAccessRouteByName(VIEWS.USAGE),
						route: { to: { name: VIEWS.USAGE } },
					},
				],
			},
			{
				type: 'group',
				id: 'users',
				label: i18n.baseText('settings.sidebar.group.users'),
				items: [
					{
						type: 'item',
						id: 'settings-users',
						icon: 'user-round',
						label: i18n.baseText('settings.users'),
						available: canUserAccessRouteByName(VIEWS.USERS_SETTINGS),
						route: { to: { name: VIEWS.USERS_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-roles',
						icon: 'user-round',
						label: i18n.baseText('settings.roles'),
						available: canUserAccessRouteByName(VIEWS.ROLES_SETTINGS),
						route: { to: { name: VIEWS.ROLES_SETTINGS } },
						new: true,
					},
					{
						type: 'item',
						id: 'settings-sso',
						icon: 'user-lock',
						label: i18n.baseText('settings.sso'),
						available: canUserAccessRouteByName(VIEWS.SSO_SETTINGS),
						route: { to: { name: VIEWS.SSO_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-ldap',
						icon: 'network',
						label: i18n.baseText('settings.ldap'),
						available: canUserAccessRouteByName(VIEWS.LDAP_SETTINGS),
						route: { to: { name: VIEWS.LDAP_SETTINGS } },
					},
				],
			},
			{
				type: 'group',
				id: 'ai',
				label: i18n.baseText('settings.sidebar.group.ai'),
				items: [
					{
						type: 'item',
						id: 'settings-ai',
						icon: 'sparkles',
						label: i18n.baseText('settings.ai'),
						available:
							settingsStore.isAiAssistantEnabled && canUserAccessRouteByName(VIEWS.AI_SETTINGS),
						route: { to: { name: VIEWS.AI_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-n8n-connect',
						icon: 'plug-zap',
						label: i18n.baseText(
							settingsStore.isAiGatewayCloudUbbEnabled
								? 'settings.n8nCredits'
								: 'settings.n8nConnect',
						),
						available:
							settingsStore.isAiGatewayEnabled &&
							(settingsStore.isAiGatewayCloudUbbEnabled ||
								canUserAccessRouteByName(VIEWS.AI_GATEWAY_SETTINGS)),
						route: settingsStore.isAiGatewayCloudUbbEnabled
							? undefined
							: { to: { name: VIEWS.AI_GATEWAY_SETTINGS } },
						creditsTag:
							balance.value !== undefined
								? i18n.baseText('aiGateway.wallet.balanceRemaining', {
										interpolate: { balance: `$${Number(balance.value).toFixed(2)}` },
									})
								: undefined,
					},
				],
			},
			{
				type: 'group',
				id: 'security',
				label: i18n.baseText('settings.sidebar.group.security'),
				items: [
					{
						type: 'item',
						id: 'settings-api',
						icon: 'plug',
						label: i18n.baseText('settings.n8napi'),
						available:
							settingsStore.isPublicApiEnabled && canUserAccessRouteByName(VIEWS.API_SETTINGS),
						route: { to: { name: VIEWS.API_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-external-secrets',
						icon: 'vault',
						label: i18n.baseText('settings.externalSecrets.title'),
						available: canUserAccessRouteByName(VIEWS.EXTERNAL_SECRETS_SETTINGS),
						route: { to: { name: VIEWS.EXTERNAL_SECRETS_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-credential-resolvers',
						icon: 'key-round',
						label: i18n.baseText('credentialResolver.view.title'),
						available: canUserAccessRouteByName(VIEWS.RESOLVERS),
						route: { to: { name: VIEWS.RESOLVERS } },
					},
					{
						type: 'item',
						id: 'settings-encryption-keys',
						icon: 'key-round',
						label: i18n.baseText('settings.encryptionKeys'),
						available:
							envFeatureFlagCheck.value('ENCRYPTION_KEY_ROTATION') &&
							canUserAccessRouteByName(VIEWS.ENCRYPTION_KEYS_SETTINGS),
						route: { to: { name: VIEWS.ENCRYPTION_KEYS_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-security',
						icon: 'shield',
						label: i18n.baseText('settings.security'),
						available: canUserAccessRouteByName(VIEWS.SECURITY_SETTINGS),
						route: { to: { name: VIEWS.SECURITY_SETTINGS } },
					},
				],
			},
			{
				type: 'group',
				id: 'instance',
				label: i18n.baseText('settings.sidebar.group.instance'),
				items: [
					{
						type: 'item',
						id: 'settings-source-control',
						icon: 'git-branch',
						label: i18n.baseText('settings.sourceControl.title'),
						available: canUserAccessRouteByName(VIEWS.SOURCE_CONTROL),
						route: { to: { name: VIEWS.SOURCE_CONTROL } },
					},
					{
						type: 'item',
						id: 'settings-git-connections',
						icon: 'git-branch',
						label: i18n.baseText('settings.gitConnections.title'),
						available: canUserAccessRouteByName(VIEWS.GIT_CONNECTIONS_SETTINGS),
						route: { to: { name: VIEWS.GIT_CONNECTIONS_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-workersview',
						icon: 'waypoints',
						label: i18n.baseText('mainSidebar.workersView'),
						available:
							settingsStore.isQueueModeEnabled &&
							hasPermission(['rbac'], { rbac: { scope: 'workersView:manage' } }),
						route: { to: { name: VIEWS.WORKER_VIEW } },
					},
					{
						type: 'item',
						id: 'settings-log-streaming',
						icon: 'log-in',
						label: i18n.baseText('settings.log-streaming'),
						available: canUserAccessRouteByName(VIEWS.LOG_STREAMING_SETTINGS),
						route: { to: { name: VIEWS.LOG_STREAMING_SETTINGS } },
					},
					{
						type: 'item',
						id: 'settings-community-nodes',
						icon: 'box',
						label: i18n.baseText('settings.communityNodes'),
						available: canUserAccessRouteByName(VIEWS.COMMUNITY_NODES),
						route: { to: { name: VIEWS.COMMUNITY_NODES } },
					},
					{
						type: 'item',
						id: 'settings-migration-report',
						icon: 'list-checks',
						label: i18n.baseText('settings.migrationReport'),
						available:
							Boolean(MIGRATION_REPORT_TARGET_VERSION) &&
							canUserAccessRouteByName(VIEWS.MIGRATION_REPORT),
						route: { to: { name: VIEWS.MIGRATION_REPORT } },
					},
				],
			},
		];

		const usedIds = new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
		for (const item of uiStore.settingsSidebarItems) {
			if (usedIds.has(item.id)) {
				continue;
			}

			const group = groups.find((entry) => entry.id === moduleSettingsGroupId(item));
			if (!group) {
				continue;
			}

			group.items.push({ ...item, type: 'item' });
			usedIds.add(item.id);
		}

		return groups;
	});

	const settingsItems = computed(() => flattenSettingsEntries(settingsEntries.value));

	const handleSettingsItemSelect = async (itemId: string) => {
		if (itemId === 'settings-n8n-connect' && settingsStore.isAiGatewayCloudUbbEnabled) {
			await openTopUp({ source: 'settings_page' });
		}
	};

	return { settingsItems, settingsEntries, handleSettingsItemSelect };
}

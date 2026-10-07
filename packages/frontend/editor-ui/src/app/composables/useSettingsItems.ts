import { useRouter } from 'vue-router';
import { useUserHelpers } from './useUserHelpers';
import { useAiGateway } from './useAiGateway';
import { useAiGatewayTopUp } from './useAiGatewayTopUp';
import { computed } from 'vue';
import type { IMenuSettingItem } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '../constants';
import { isContextPreferencesEnabled } from '@/features/settings/context/context.utils';
import { useUIStore } from '../stores/ui.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { hasPermission } from '../utils/rbac/permissions';
import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';
import { PROMOTIONS_SETTINGS_VIEW } from '@/features/integrations/promotions.ee/promotions.constants';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';

type ShellSettingsItem = IMenuSettingItem & { order: number };

export function useSettingsItems() {
	const router = useRouter();
	const i18n = useI18n();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();
	const { canUserAccessRouteByName } = useUserHelpers(router);
	const { isEnabled: isPromotionsEnabled } = usePromotionsEnabled();
	const { balance } = useAiGateway();
	const { openTopUp } = useAiGatewayTopUp();

	const settingsItems = computed<IMenuSettingItem[]>(() => {
		const shellItems: ShellSettingsItem[] = [
			{
				id: 'settings-usage-and-plan',
				order: 10,
				icon: 'chart-column-decreasing',
				label: i18n.baseText('settings.usageAndPlan.title'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.USAGE),
				route: { to: { name: VIEWS.USAGE } },
			},
			{
				id: 'settings-personal',
				order: 20,
				icon: 'circle-user-round',
				label: i18n.baseText('settings.personal'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.PERSONAL_SETTINGS),
				route: { to: { name: VIEWS.PERSONAL_SETTINGS } },
			},
			{
				id: 'settings-users',
				order: 30,
				icon: 'user-round',
				label: i18n.baseText('settings.users'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.USERS_SETTINGS),
				route: { to: { name: VIEWS.USERS_SETTINGS } },
			},
			{
				id: 'settings-ai',
				order: 40,
				icon: 'sparkles',
				label: i18n.baseText('settings.ai'),
				position: 'top',
				available:
					settingsStore.isAiAssistantEnabled && canUserAccessRouteByName(VIEWS.AI_SETTINGS),
				route: { to: { name: VIEWS.AI_SETTINGS } },
			},
			{
				id: 'settings-n8n-connect',
				order: 50,
				icon: 'plug-zap',
				label: i18n.baseText(
					settingsStore.isAiGatewayCloudUbbEnabled ? 'settings.n8nCredits' : 'settings.n8nConnect',
				),
				position: 'top',
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
			{
				id: 'settings-roles',
				order: 60,
				icon: 'user-round',
				label: i18n.baseText('settings.roles'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.ROLES_SETTINGS),
				route: { to: { name: VIEWS.ROLES_SETTINGS } },
				new: true,
			},
			{
				id: 'settings-api',
				order: 70,
				icon: 'plug',
				label: i18n.baseText('settings.n8napi'),
				position: 'top',
				available: settingsStore.isPublicApiEnabled && canUserAccessRouteByName(VIEWS.API_SETTINGS),
				route: { to: { name: VIEWS.API_SETTINGS } },
			},
			{
				id: 'settings-external-secrets',
				order: 80,
				icon: 'vault',
				label: i18n.baseText('settings.externalSecrets.title'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.EXTERNAL_SECRETS_SETTINGS),
				route: { to: { name: VIEWS.EXTERNAL_SECRETS_SETTINGS } },
			},
			{
				id: 'settings-credential-resolvers',
				order: 90,
				icon: 'key-round',
				label: i18n.baseText('credentialResolver.view.title'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.RESOLVERS),
				route: { to: { name: VIEWS.RESOLVERS } },
			},
			{
				id: 'settings-source-control',
				order: 100,
				icon: 'git-branch',
				label: i18n.baseText('settings.sourceControl.title'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.SOURCE_CONTROL),
				route: { to: { name: VIEWS.SOURCE_CONTROL } },
			},
			{
				id: 'settings-promotions',
				order: 110,
				icon: 'git-branch',
				label: i18n.baseText('settings.promotions.title'),
				position: 'top',
				available: isPromotionsEnabled.value && canUserAccessRouteByName(PROMOTIONS_SETTINGS_VIEW),
				route: { to: { name: PROMOTIONS_SETTINGS_VIEW } },
				preview: true,
			},
			{
				id: 'settings-sso',
				order: 120,
				icon: 'user-lock',
				label: i18n.baseText('settings.sso'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.SSO_SETTINGS),
				route: { to: { name: VIEWS.SSO_SETTINGS } },
			},
			{
				id: 'settings-encryption-keys',
				order: 130,
				icon: 'key-round',
				label: i18n.baseText('settings.encryptionKeys'),
				position: 'top',
				available:
					settingsStore.moduleSettings['encryption-key-manager']?.rotationEnabled === true &&
					canUserAccessRouteByName(VIEWS.ENCRYPTION_KEYS_SETTINGS),
				route: { to: { name: VIEWS.ENCRYPTION_KEYS_SETTINGS } },
			},
			{
				id: 'settings-security',
				order: 140,
				icon: 'shield',
				label: i18n.baseText('settings.security'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.SECURITY_SETTINGS),
				route: { to: { name: VIEWS.SECURITY_SETTINGS } },
			},
			{
				id: 'settings-ldap',
				order: 150,
				icon: 'network',
				label: i18n.baseText('settings.ldap'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.LDAP_SETTINGS),
				route: { to: { name: VIEWS.LDAP_SETTINGS } },
			},
			{
				id: 'settings-workersview',
				order: 160,
				icon: 'waypoints',
				label: i18n.baseText('mainSidebar.workersView'),
				position: 'top',
				available:
					settingsStore.isQueueModeEnabled &&
					hasPermission(['rbac'], { rbac: { scope: 'workersView:manage' } }),
				route: { to: { name: VIEWS.WORKER_VIEW } },
			},
			{
				id: 'settings-log-streaming',
				order: 170,
				icon: 'log-in',
				label: i18n.baseText('settings.log-streaming'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.LOG_STREAMING_SETTINGS),
				route: { to: { name: VIEWS.LOG_STREAMING_SETTINGS } },
			},
			{
				id: 'settings-community-nodes',
				order: 180,
				icon: 'box',
				label: i18n.baseText('settings.communityNodes'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.COMMUNITY_NODES),
				route: { to: { name: VIEWS.COMMUNITY_NODES } },
			},
			{
				id: 'settings-migration-report',
				order: 190,
				icon: 'list-checks',
				label: i18n.baseText('settings.migrationReport'),
				position: 'top',
				available:
					!!MIGRATION_REPORT_TARGET_VERSION && canUserAccessRouteByName(VIEWS.MIGRATION_REPORT),
				route: { to: { name: VIEWS.MIGRATION_REPORT } },
			},
			{
				// The flag is read here because the middleware check does not run route guards.
				id: 'settings-context',
				order: 300,
				icon: 'brain',
				label: i18n.baseText('settings.context.title'),
				position: 'top',
				available:
					isContextPreferencesEnabled() && canUserAccessRouteByName(VIEWS.SETTINGS_CONTEXT),
				route: { to: { name: VIEWS.SETTINGS_CONTEXT } },
				preview: true,
			},
		];

		const moduleItems = uiStore.settingsSidebarItems.filter(
			(item) => !shellItems.some((shellItem) => shellItem.id === item.id),
		);

		return [...shellItems, ...moduleItems].sort(
			(a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
		);
	});

	const visibleSettingsItems = computed(() => settingsItems.value.filter((item) => item.available));

	const handleSettingsItemSelect = async (itemId: string) => {
		if (itemId === 'settings-n8n-connect' && settingsStore.isAiGatewayCloudUbbEnabled) {
			await openTopUp({ source: 'settings_page' });
		}
	};

	return { settingsItems: visibleSettingsItems, handleSettingsItemSelect };
}

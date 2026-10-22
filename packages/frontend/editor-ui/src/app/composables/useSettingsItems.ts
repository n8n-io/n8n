import { useRouter } from 'vue-router';
import { useUserHelpers } from './useUserHelpers';
import { useAiGateway } from './useAiGateway';
import { useAiGatewayTopUp } from './useAiGatewayTopUp';
import { computed } from 'vue';
import type { IMenuSettingItem, SettingsSectionId } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '../constants';
import { isContextEnabled } from '@/features/settings/context/context.utils';
import { useUIStore } from '../stores/ui.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { hasPermission } from '../utils/rbac/permissions';
import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';
import { PROMOTIONS_SETTINGS_VIEW } from '@/features/integrations/promotions.ee/promotions.constants';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';

type ShellSettingsItem = IMenuSettingItem & { order: number };

/**
 * The module whose Assistant settings page carries the AI usage controls. It runs by
 * default; only `N8N_DISABLED_MODULES` turns it off.
 */
const INSTANCE_AI_MODULE = 'instance-ai';

/**
 * Links without a `section` form the `general` group: it has no heading and is listed first.
 * The other groups follow in the order of `SETTINGS_SECTION_ORDER`.
 */
export type SettingsSectionGroupId = SettingsSectionId | 'general';

export type SettingsSectionGroup = {
	id: SettingsSectionGroupId;
	/** No title for the `general` group. */
	title?: string;
	items: IMenuSettingItem[];
};

const SETTINGS_SECTION_ORDER: SettingsSectionGroupId[] = [
	'general',
	'personal',
	'people',
	'ai',
	'integrations',
	'security',
	'operations',
	'billing',
];

const sectionOf = (item: IMenuSettingItem): SettingsSectionGroupId => item.section ?? 'general';

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
		// `order` is the row inside the section, in steps of ten so a module can slot in between.
		const shellItems: ShellSettingsItem[] = [
			// Personal
			{
				id: 'settings-personal',
				order: 10,
				section: 'personal',
				// The circled person reads as "your account"; the bare person is the generic user glyph.
				icon: 'circle-user-round',
				label: i18n.baseText('settings.personal.personalSettings'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.PERSONAL_SETTINGS),
				route: { to: { name: VIEWS.PERSONAL_SETTINGS } },
			},
			// People & access
			{
				id: 'settings-users',
				order: 10,
				section: 'people',
				icon: 'users',
				label: i18n.baseText('settings.users'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.USERS_SETTINGS),
				route: { to: { name: VIEWS.USERS_SETTINGS } },
			},
			{
				id: 'settings-roles',
				order: 20,
				section: 'people',
				icon: 'briefcase',
				label: i18n.baseText('settings.roles'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.ROLES_SETTINGS),
				route: { to: { name: VIEWS.ROLES_SETTINGS } },
				new: true,
			},
			{
				// One entry for how people sign in; SSO and LDAP are rows on this page.
				id: 'settings-authentication',
				order: 30,
				section: 'people',
				icon: 'lock',
				label: i18n.baseText('settings.authentication'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.AUTHENTICATION_SETTINGS),
				route: { to: { name: VIEWS.AUTHENTICATION_SETTINGS } },
			},
			// AI (modules add MCP at 10, Assistant at 20, Agents at 30 and Chat at 70).
			// Features come first. Chat is last because it is on its way out.
			{
				// The AI usage controls live in the "Data sent to the model" section of the
				// Assistant page. This standalone page is a fallback for one case only: the
				// instance-ai module is disabled while the licensed AI Assistant and Builder
				// still run and still honour the switch. It sits second last, before Chat.
				id: 'settings-ai',
				order: 60,
				section: 'ai',
				icon: 'sparkles',
				label: i18n.baseText('settings.ai'),
				position: 'top',
				available:
					settingsStore.isAiAssistantEnabled &&
					!settingsStore.isModuleActive(INSTANCE_AI_MODULE) &&
					canUserAccessRouteByName(VIEWS.AI_SETTINGS),
				route: { to: { name: VIEWS.AI_SETTINGS } },
			},
			{
				// The flag is read here because the middleware check does not run route guards.
				id: 'settings-context',
				order: 40,
				section: 'ai',
				icon: 'brain',
				label: i18n.baseText('settings.context.title'),
				position: 'top',
				available: isContextEnabled() && canUserAccessRouteByName(VIEWS.SETTINGS_CONTEXT),
				route: { to: { name: VIEWS.SETTINGS_CONTEXT } },
				preview: true,
			},
			// Integrations
			{
				id: 'settings-api',
				order: 10,
				section: 'integrations',
				icon: 'plug',
				label: i18n.baseText('settings.n8napi'),
				position: 'top',
				available: settingsStore.isPublicApiEnabled && canUserAccessRouteByName(VIEWS.API_SETTINGS),
				route: { to: { name: VIEWS.API_SETTINGS } },
			},
			{
				id: 'settings-community-nodes',
				order: 20,
				section: 'integrations',
				icon: 'box',
				label: i18n.baseText('settings.communityNodes'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.COMMUNITY_NODES),
				route: { to: { name: VIEWS.COMMUNITY_NODES } },
			},
			// Security
			{
				id: 'settings-security',
				order: 10,
				section: 'security',
				icon: 'shield',
				label: i18n.baseText('settings.security'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.SECURITY_SETTINGS),
				route: { to: { name: VIEWS.SECURITY_SETTINGS } },
			},
			{
				id: 'settings-external-secrets',
				order: 20,
				section: 'security',
				icon: 'vault',
				label: i18n.baseText('settings.externalSecrets.title'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.EXTERNAL_SECRETS_SETTINGS),
				route: { to: { name: VIEWS.EXTERNAL_SECRETS_SETTINGS } },
			},
			{
				id: 'settings-credential-resolvers',
				order: 30,
				section: 'security',
				icon: 'flow',
				label: i18n.baseText('credentialResolver.view.title'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.RESOLVERS),
				route: { to: { name: VIEWS.RESOLVERS } },
			},
			{
				id: 'settings-encryption-keys',
				order: 40,
				section: 'security',
				icon: 'key-round',
				label: i18n.baseText('settings.encryptionKeys'),
				position: 'top',
				available:
					settingsStore.moduleSettings['encryption-key-manager']?.rotationEnabled === true &&
					canUserAccessRouteByName(VIEWS.ENCRYPTION_KEYS_SETTINGS),
				route: { to: { name: VIEWS.ENCRYPTION_KEYS_SETTINGS } },
			},
			// Operations (modules add Log streaming at 40 and OpenTelemetry at 50)
			{
				id: 'settings-source-control',
				order: 10,
				section: 'operations',
				icon: 'git-branch',
				label: i18n.baseText('settings.sourceControl.title'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.SOURCE_CONTROL),
				route: { to: { name: VIEWS.SOURCE_CONTROL } },
			},
			{
				id: 'settings-promotions',
				order: 20,
				section: 'operations',
				icon: 'git-branch',
				label: i18n.baseText('settings.promotions.title'),
				position: 'top',
				available: isPromotionsEnabled.value && canUserAccessRouteByName(PROMOTIONS_SETTINGS_VIEW),
				route: { to: { name: PROMOTIONS_SETTINGS_VIEW } },
				preview: true,
			},
			{
				id: 'settings-workersview',
				order: 30,
				section: 'operations',
				icon: 'wrench',
				label: i18n.baseText('mainSidebar.workersView'),
				position: 'top',
				available:
					settingsStore.isQueueModeEnabled &&
					hasPermission(['rbac'], { rbac: { scope: 'workersView:manage' } }),
				route: { to: { name: VIEWS.WORKER_VIEW } },
			},
			{
				id: 'settings-migration-report',
				order: 60,
				section: 'operations',
				icon: 'clipboard',
				label: i18n.baseText('settings.migrationReport'),
				position: 'top',
				available:
					!!MIGRATION_REPORT_TARGET_VERSION && canUserAccessRouteByName(VIEWS.MIGRATION_REPORT),
				route: { to: { name: VIEWS.MIGRATION_REPORT } },
			},
			// Billing. Gateway credits is a wallet with a top-up flow, so it lives with
			// the money pages, not with the AI feature controls.
			{
				id: 'settings-n8n-connect',
				order: 10,
				section: 'billing',
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
				id: 'settings-usage-and-plan',
				order: 20,
				section: 'billing',
				icon: 'chart-column-decreasing',
				label: i18n.baseText('settings.usageAndPlan.title'),
				position: 'top',
				available: canUserAccessRouteByName(VIEWS.USAGE),
				route: { to: { name: VIEWS.USAGE } },
			},
		];

		const moduleItems = uiStore.settingsSidebarItems.filter(
			(item) => !shellItems.some((shellItem) => shellItem.id === item.id),
		);

		// Stable sort: section first, then `order`, then registration order.
		return [...shellItems, ...moduleItems].sort(
			(a, b) =>
				SETTINGS_SECTION_ORDER.indexOf(sectionOf(a)) -
					SETTINGS_SECTION_ORDER.indexOf(sectionOf(b)) ||
				(a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
		);
	});

	const visibleSettingsItems = computed(() => settingsItems.value.filter((item) => item.available));

	/** Visible items grouped under their headings. Empty groups are left out. */
	const settingsSections = computed<SettingsSectionGroup[]>(() => {
		const titles: Record<SettingsSectionGroupId, string | undefined> = {
			general: undefined,
			personal: i18n.baseText('settings.sections.personal'),
			people: i18n.baseText('settings.sections.people'),
			ai: i18n.baseText('settings.sections.ai'),
			integrations: i18n.baseText('settings.sections.integrations'),
			security: i18n.baseText('settings.sections.security'),
			operations: i18n.baseText('settings.sections.operations'),
			billing: i18n.baseText('settings.sections.billing'),
		};

		return SETTINGS_SECTION_ORDER.map((id) => ({
			id,
			title: titles[id],
			items: visibleSettingsItems.value.filter((item) => sectionOf(item) === id),
		})).filter((section) => section.items.length > 0);
	});

	const handleSettingsItemSelect = async (itemId: string) => {
		if (itemId === 'settings-n8n-connect' && settingsStore.isAiGatewayCloudUbbEnabled) {
			await openTopUp({ source: 'settings_page' });
		}
	};

	return { settingsItems: visibleSettingsItems, settingsSections, handleSettingsItemSelect };
}

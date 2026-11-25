import { $d as init_runtime_core_esm_bundler, Rd as computed, Xo as useRouter } from "./vendor-Hx42-oQF.js";
import { Cr as useAiGateway, Jg as useUIStore, fC as VIEWS, jN as useI18n, rn as usePromotionsEnabled, xm as hasPermission, xr as useAiGatewayTopUp, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { t as useUserHelpers } from "./useUserHelpers-DWLy61VY.js";
//#region src/app/composables/useSettingsItems.ts
init_runtime_core_esm_bundler();
/**
* The module whose Assistant settings page carries the AI usage controls. It runs by
* default; only `N8N_DISABLED_MODULES` turns it off.
*/
var INSTANCE_AI_MODULE = "instance-ai";
var SETTINGS_SECTION_ORDER = [
	"general",
	"personal",
	"people",
	"ai",
	"integrations",
	"security",
	"operations",
	"billing"
];
var sectionOf = (item) => item.section ?? "general";
function useSettingsItems() {
	const router = useRouter();
	const i18n = useI18n();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();
	const { canUserAccessRouteByName } = useUserHelpers(router);
	const { isEnabled: isPromotionsEnabled } = usePromotionsEnabled();
	const { balance } = useAiGateway();
	const { openTopUp } = useAiGatewayTopUp();
	const settingsItems = computed(() => {
		const shellItems = [
			{
				id: "settings-personal",
				order: 10,
				section: "personal",
				icon: "circle-user-round",
				label: i18n.baseText("settings.personal.personalSettings"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.PERSONAL_SETTINGS),
				route: { to: { name: VIEWS.PERSONAL_SETTINGS } }
			},
			{
				id: "settings-users",
				order: 10,
				section: "people",
				icon: "users",
				label: i18n.baseText("settings.users"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.USERS_SETTINGS),
				route: { to: { name: VIEWS.USERS_SETTINGS } }
			},
			{
				id: "settings-roles",
				order: 20,
				section: "people",
				icon: "briefcase",
				label: i18n.baseText("settings.roles"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.ROLES_SETTINGS),
				route: { to: { name: VIEWS.ROLES_SETTINGS } }
			},
			{
				id: "settings-authentication",
				order: 30,
				section: "people",
				icon: "lock",
				label: i18n.baseText("settings.authentication"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.AUTHENTICATION_SETTINGS),
				route: { to: { name: VIEWS.AUTHENTICATION_SETTINGS } }
			},
			{
				id: "settings-ai",
				order: 60,
				section: "ai",
				icon: "sparkles",
				label: i18n.baseText("settings.ai"),
				position: "top",
				available: settingsStore.isAiAssistantEnabled && !settingsStore.isModuleActive(INSTANCE_AI_MODULE) && canUserAccessRouteByName(VIEWS.AI_SETTINGS),
				route: { to: { name: VIEWS.AI_SETTINGS } }
			},
			{
				id: "settings-context",
				order: 40,
				section: "ai",
				icon: "brain",
				label: i18n.baseText("settings.context.title"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.SETTINGS_CONTEXT),
				route: { to: { name: VIEWS.SETTINGS_CONTEXT } },
				preview: true
			},
			{
				id: "settings-api",
				order: 10,
				section: "integrations",
				icon: "plug",
				label: i18n.baseText("settings.n8napi"),
				position: "top",
				available: settingsStore.isPublicApiEnabled && canUserAccessRouteByName(VIEWS.API_SETTINGS),
				route: { to: { name: VIEWS.API_SETTINGS } }
			},
			{
				id: "settings-community-nodes",
				order: 20,
				section: "integrations",
				icon: "box",
				label: i18n.baseText("settings.communityNodes"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.COMMUNITY_NODES),
				route: { to: { name: VIEWS.COMMUNITY_NODES } }
			},
			{
				id: "settings-security",
				order: 10,
				section: "security",
				icon: "shield",
				label: i18n.baseText("settings.security"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.SECURITY_SETTINGS),
				route: { to: { name: VIEWS.SECURITY_SETTINGS } }
			},
			{
				id: "settings-external-secrets",
				order: 20,
				section: "security",
				icon: "vault",
				label: i18n.baseText("settings.externalSecrets.title"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.EXTERNAL_SECRETS_SETTINGS),
				route: { to: { name: VIEWS.EXTERNAL_SECRETS_SETTINGS } }
			},
			{
				id: "settings-credential-resolvers",
				order: 30,
				section: "security",
				icon: "flow",
				label: i18n.baseText("credentialResolver.view.title"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.RESOLVERS),
				route: { to: { name: VIEWS.RESOLVERS } }
			},
			{
				id: "settings-encryption-keys",
				order: 40,
				section: "security",
				icon: "key-round",
				label: i18n.baseText("settings.encryptionKeys"),
				position: "top",
				available: settingsStore.moduleSettings["encryption-key-manager"]?.rotationEnabled === true && canUserAccessRouteByName(VIEWS.ENCRYPTION_KEYS_SETTINGS),
				route: { to: { name: VIEWS.ENCRYPTION_KEYS_SETTINGS } }
			},
			{
				id: "settings-source-control",
				order: 10,
				section: "operations",
				icon: "git-branch",
				label: i18n.baseText("settings.sourceControl.title"),
				position: "top",
				available: !isPromotionsEnabled.value && canUserAccessRouteByName(VIEWS.SOURCE_CONTROL),
				route: { to: { name: VIEWS.SOURCE_CONTROL } }
			},
			{
				id: "settings-workersview",
				order: 30,
				section: "operations",
				icon: "wrench",
				label: i18n.baseText("mainSidebar.workersView"),
				position: "top",
				available: settingsStore.isQueueModeEnabled && hasPermission(["rbac"], { rbac: { scope: "workersView:manage" } }),
				route: { to: { name: VIEWS.WORKER_VIEW } }
			},
			{
				id: "settings-migration-report",
				order: 60,
				section: "operations",
				icon: "clipboard",
				label: i18n.baseText("settings.migrationReport"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.MIGRATION_REPORT),
				route: { to: { name: VIEWS.MIGRATION_REPORT } }
			},
			{
				id: "settings-n8n-connect",
				order: 10,
				section: "billing",
				icon: "circles",
				label: i18n.baseText(settingsStore.isAiGatewayCloudUbbEnabled ? "settings.n8nCredits" : "settings.n8nConnect"),
				position: "top",
				available: settingsStore.isAiGatewayEnabled && (settingsStore.isAiGatewayCloudUbbEnabled || canUserAccessRouteByName(VIEWS.AI_GATEWAY_SETTINGS)),
				route: settingsStore.isAiGatewayCloudUbbEnabled ? void 0 : { to: { name: VIEWS.AI_GATEWAY_SETTINGS } },
				creditsTag: balance.value !== void 0 ? i18n.baseText("aiGateway.wallet.balanceRemaining", { interpolate: { balance: `$${Number(balance.value).toFixed(2)}` } }) : void 0
			},
			{
				id: "settings-usage-and-plan",
				order: 20,
				section: "billing",
				icon: "chart-column-decreasing",
				label: i18n.baseText("settings.usageAndPlan.title"),
				position: "top",
				available: canUserAccessRouteByName(VIEWS.USAGE),
				route: { to: { name: VIEWS.USAGE } }
			}
		];
		const moduleItems = uiStore.settingsSidebarItems.filter((item) => !shellItems.some((shellItem) => shellItem.id === item.id));
		return [...shellItems, ...moduleItems].sort((a, b) => SETTINGS_SECTION_ORDER.indexOf(sectionOf(a)) - SETTINGS_SECTION_ORDER.indexOf(sectionOf(b)) || (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
	});
	const visibleSettingsItems = computed(() => settingsItems.value.filter((item) => item.available));
	/** Visible items grouped under their headings. Empty groups are left out. */
	const settingsSections = computed(() => {
		const titles = {
			general: void 0,
			personal: i18n.baseText("settings.sections.personal"),
			people: i18n.baseText("settings.sections.people"),
			ai: i18n.baseText("settings.sections.ai"),
			integrations: i18n.baseText("settings.sections.integrations"),
			security: i18n.baseText("settings.sections.security"),
			operations: i18n.baseText("settings.sections.operations"),
			billing: i18n.baseText("settings.sections.billing")
		};
		return SETTINGS_SECTION_ORDER.map((id) => ({
			id,
			title: titles[id],
			items: visibleSettingsItems.value.filter((item) => sectionOf(item) === id)
		})).filter((section) => section.items.length > 0);
	});
	const handleSettingsItemSelect = async (itemId) => {
		if (itemId === "settings-n8n-connect" && settingsStore.isAiGatewayCloudUbbEnabled) await openTopUp({ source: "settings_page" });
	};
	return {
		settingsItems: visibleSettingsItems,
		settingsSections,
		handleSettingsItemSelect
	};
}
//#endregion
export { useSettingsItems as t };

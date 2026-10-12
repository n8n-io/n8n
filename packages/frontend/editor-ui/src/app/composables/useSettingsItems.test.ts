import { computed, ref } from 'vue';

import { PROMOTIONS_SETTINGS_VIEW } from '@/features/integrations/promotions.ee/promotions.constants';
import { useSettingsItems } from './useSettingsItems';
import { VIEWS } from '../constants';
import { hasPermission } from '../utils/rbac/permissions';

const isAiGatewayCloudUbbEnabled = ref(false);
const isAiGatewayEnabled = ref(true);
const isAiAssistantEnabled = ref(false);
const isPublicApiEnabled = ref(false);
const isQueueModeEnabled = ref(false);
const balance = ref<number>();
const moduleSettings = ref<Record<string, unknown>>({});
// `ui.store` stamps `available: true` onto every module item before exposing it.
const settingsSidebarItems = ref<Array<{ id: string; available: boolean; order?: number }>>([]);
const activeModules = ref<string[]>([]);
const promotionsFlag = ref('false');
const canUserAccessRouteByName = vi.hoisted(() => vi.fn<(name: string) => boolean>(() => true));
const contextPreferencesEnabled = vi.hoisted(() => ({ value: true }));
const openTopUpMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({ useRouter: vi.fn(() => ({})) }));
vi.mock('./useUserHelpers', () => ({
	useUserHelpers: vi.fn(() => ({ canUserAccessRouteByName })),
}));
vi.mock('@/features/settings/context/context.utils', () => ({
	isContextPreferencesEnabled: () => contextPreferencesEnabled.value,
}));
vi.mock('./useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({ balance: computed(() => balance.value) })),
}));
vi.mock('./useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: vi.fn(() => ({ openTopUp: openTopUpMock })),
}));
vi.mock('@n8n/i18n', () => ({ useI18n: vi.fn(() => ({ baseText: (key: string) => key })) }));
vi.mock('../stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		get settingsSidebarItems() {
			return settingsSidebarItems.value;
		},
	})),
}));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		get isAiAssistantEnabled() {
			return isAiAssistantEnabled.value;
		},
		get isAiGatewayEnabled() {
			return isAiGatewayEnabled.value;
		},
		get isAiGatewayCloudUbbEnabled() {
			return isAiGatewayCloudUbbEnabled.value;
		},
		get isPublicApiEnabled() {
			return isPublicApiEnabled.value;
		},
		get isQueueModeEnabled() {
			return isQueueModeEnabled.value;
		},
		isModuleActive: (name: string) => activeModules.value.includes(name),
		get settings() {
			return { envFeatureFlags: { N8N_ENV_FEAT_PROMOTIONS: promotionsFlag.value } };
		},
		get moduleSettings() {
			return moduleSettings.value;
		},
	})),
}));
vi.mock('../utils/rbac/permissions', () => ({ hasPermission: vi.fn(() => false) }));

describe('useSettingsItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isAiGatewayEnabled.value = true;
		isAiGatewayCloudUbbEnabled.value = false;
		isAiAssistantEnabled.value = false;
		isPublicApiEnabled.value = false;
		isQueueModeEnabled.value = false;
		balance.value = undefined;
		moduleSettings.value = {};
		settingsSidebarItems.value = [];
		activeModules.value = [];
		promotionsFlag.value = 'false';
		canUserAccessRouteByName.mockReturnValue(true);
		contextPreferencesEnabled.value = true;
	});

	describe('sidebar order', () => {
		it('lists every link in the established order when all are available', () => {
			isAiAssistantEnabled.value = true;
			isPublicApiEnabled.value = true;
			isQueueModeEnabled.value = true;
			moduleSettings.value = { 'encryption-key-manager': { rotationEnabled: true } };
			activeModules.value = ['promotions'];
			promotionsFlag.value = 'true';
			vi.mocked(hasPermission).mockReturnValue(true);
			// Module items in registration order, with the orders the real modules set.
			settingsSidebarItems.value = [
				{ id: 'settings-log-streaming', available: true, order: 170 },
				{ id: 'settings-mcp', available: true, order: 200 },
				{ id: 'settings-chat-hub', available: true, order: 220 },
				{ id: 'settings-instance-ai', available: true, order: 230 },
				{ id: 'settings-agents', available: true, order: 240 },
				{ id: 'settings-opentelemetry', available: true },
			];

			const ids = useSettingsItems().settingsItems.value.map(({ id }) => id);

			expect(ids).toEqual([
				'settings-usage-and-plan',
				'settings-personal',
				'settings-users',
				'settings-ai',
				'settings-n8n-connect',
				'settings-roles',
				'settings-api',
				'settings-external-secrets',
				'settings-credential-resolvers',
				'settings-source-control',
				'settings-promotions',
				'settings-sso',
				'settings-encryption-keys',
				'settings-security',
				'settings-ldap',
				'settings-workersview',
				'settings-log-streaming',
				'settings-community-nodes',
				'settings-migration-report',
				'settings-mcp',
				'settings-context',
				'settings-chat-hub',
				'settings-instance-ai',
				'settings-agents',
				'settings-opentelemetry',
			]);
		});
	});

	describe('module item order', () => {
		const idsOf = () => useSettingsItems().settingsItems.value.map(({ id }) => id);

		it('places a module item between the shell items with the nearest orders', () => {
			settingsSidebarItems.value = [{ id: 'settings-module', available: true, order: 25 }];

			const ids = idsOf();

			expect(ids.indexOf('settings-module')).toBe(ids.indexOf('settings-personal') + 1);
			expect(ids.indexOf('settings-module')).toBe(ids.indexOf('settings-users') - 1);
		});

		it('places a module item without order last', () => {
			settingsSidebarItems.value = [{ id: 'settings-module', available: true }];

			expect(idsOf().at(-1)).toBe('settings-module');
		});

		it('keeps registration order for equal orders', () => {
			settingsSidebarItems.value = [
				{ id: 'settings-first', available: true, order: 25 },
				{ id: 'settings-second', available: true, order: 25 },
				{ id: 'settings-third', available: true },
				{ id: 'settings-fourth', available: true },
			];

			const ids = idsOf();

			expect(ids.indexOf('settings-second')).toBe(ids.indexOf('settings-first') + 1);
			expect(ids.indexOf('settings-fourth')).toBe(ids.indexOf('settings-third') + 1);
		});
	});

	describe('the Context item', () => {
		const idsOf = () => useSettingsItems().settingsItems.value.map(({ id }) => id);

		it('sorts between module items with a lower and a higher order', () => {
			settingsSidebarItems.value = [
				{ id: 'settings-mcp', available: true, order: 200 },
				{ id: 'settings-chat-hub', available: true, order: 220 },
			];

			const ids = idsOf();

			expect(ids.indexOf('settings-context')).toBe(ids.indexOf('settings-mcp') + 1);
			expect(ids.indexOf('settings-context')).toBe(ids.indexOf('settings-chat-hub') - 1);
		});

		it('is hidden when the flag is off, because the route guard does not run here', () => {
			contextPreferencesEnabled.value = false;

			expect(idsOf()).not.toContain('settings-context');
		});

		it('is last when no module item is registered', () => {
			settingsSidebarItems.value = [];

			expect(idsOf().at(-1)).toBe('settings-context');
		});

		it('carries the preview label', () => {
			const item = useSettingsItems().settingsItems.value.find(
				({ id }) => id === 'settings-context',
			);

			expect(item?.preview).toBe(true);
		});
	});

	describe('Environments v2', () => {
		beforeEach(() => {
			activeModules.value = ['promotions'];
			promotionsFlag.value = 'true';
		});

		it('appears directly after Environments when enabled', () => {
			const items = useSettingsItems().settingsItems.value;
			const environmentsIndex = items.findIndex(({ id }) => id === 'settings-source-control');

			expect(items[environmentsIndex + 1]).toMatchObject({
				id: 'settings-promotions',
				route: { to: { name: PROMOTIONS_SETTINGS_VIEW } },
			});
		});

		it('is hidden when the feature flag is off', () => {
			promotionsFlag.value = 'false';

			expect(useSettingsItems().settingsItems.value.map(({ id }) => id)).not.toContain(
				'settings-promotions',
			);
		});

		it('is hidden when the promotions module is inactive', () => {
			activeModules.value = ['source-control'];

			expect(useSettingsItems().settingsItems.value.map(({ id }) => id)).not.toContain(
				'settings-promotions',
			);
		});

		it('is hidden when route access is denied', () => {
			canUserAccessRouteByName.mockImplementation((name) => name !== PROMOTIONS_SETTINGS_VIEW);

			expect(useSettingsItems().settingsItems.value.map(({ id }) => id)).not.toContain(
				'settings-promotions',
			);
		});
	});

	it('hides the encryption keys item while rotation is disabled', () => {
		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-encryption-keys',
		);

		expect(item).toBeUndefined();
	});

	it('shows the encryption keys item when the module reports rotation as enabled', () => {
		moduleSettings.value = { 'encryption-key-manager': { rotationEnabled: true } };

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-encryption-keys',
		);

		expect(item?.available).toBe(true);
	});

	it('links to the n8n Connect settings page for the legacy cohort', () => {
		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toMatchObject({
			label: 'settings.n8nConnect',
			route: { to: { name: VIEWS.AI_GATEWAY_SETTINGS } },
		});
	});

	it('shows n8n credits with the balance and no internal route for Cloud UBB', () => {
		isAiGatewayCloudUbbEnabled.value = true;
		balance.value = 1.23;

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toMatchObject({
			label: 'settings.n8nCredits',
			creditsTag: 'aiGateway.wallet.balanceRemaining',
		});
		expect(item?.route).toBeUndefined();
	});

	it('hides n8n credits when AI Gateway is disabled', () => {
		isAiGatewayEnabled.value = false;
		isAiGatewayCloudUbbEnabled.value = true;

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toBeUndefined();
	});

	it('opens the top-up flow only for the Cloud UBB credits item', async () => {
		const { handleSettingsItemSelect } = useSettingsItems();

		await handleSettingsItemSelect('settings-n8n-connect');
		expect(openTopUpMock).not.toHaveBeenCalled();

		isAiGatewayCloudUbbEnabled.value = true;
		await handleSettingsItemSelect('settings-users');
		expect(openTopUpMock).not.toHaveBeenCalled();

		await handleSettingsItemSelect('settings-n8n-connect');
		expect(openTopUpMock).toHaveBeenCalledWith({ source: 'settings_page' });
	});
});

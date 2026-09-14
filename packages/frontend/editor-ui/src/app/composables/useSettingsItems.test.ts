import { computed, ref } from 'vue';

import { PROMOTIONS_SETTINGS_VIEW } from '@/features/integrations/promotions.ee/promotions.constants';
import { useSettingsItems } from './useSettingsItems';
import { VIEWS } from '../constants';

const isAiGatewayCloudUbbEnabled = ref(false);
const isAiGatewayEnabled = ref(true);
const balance = ref<number>();
const moduleSettings = ref<Record<string, unknown>>({});
const activeModules = ref<string[]>([]);
const promotionsFlag = ref('false');
const canUserAccessRouteByName = vi.hoisted(() => vi.fn<(name: string) => boolean>(() => true));
const openTopUpMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({ useRouter: vi.fn(() => ({})) }));
vi.mock('./useUserHelpers', () => ({
	useUserHelpers: vi.fn(() => ({ canUserAccessRouteByName })),
}));
vi.mock('./useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({ balance: computed(() => balance.value) })),
}));
vi.mock('./useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: vi.fn(() => ({ openTopUp: openTopUpMock })),
}));
vi.mock('@n8n/i18n', () => ({ useI18n: vi.fn(() => ({ baseText: (key: string) => key })) }));
vi.mock('../stores/ui.store', () => ({ useUIStore: vi.fn(() => ({ settingsSidebarItems: [] })) }));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		isAiAssistantEnabled: false,
		get isAiGatewayEnabled() {
			return isAiGatewayEnabled.value;
		},
		get isAiGatewayCloudUbbEnabled() {
			return isAiGatewayCloudUbbEnabled.value;
		},
		isPublicApiEnabled: false,
		isQueueModeEnabled: false,
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
		balance.value = undefined;
		moduleSettings.value = {};
		activeModules.value = [];
		promotionsFlag.value = 'false';
		canUserAccessRouteByName.mockReturnValue(true);
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

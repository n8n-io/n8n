import { computed, ref } from 'vue';

import { useSettingsItems } from './useSettingsItems';

const isAiGatewayCloudUbbEnabled = ref(false);

vi.mock('vue-router', () => ({ useRouter: vi.fn(() => ({})) }));
vi.mock('./useUserHelpers', () => ({
	useUserHelpers: vi.fn(() => ({ canUserAccessRouteByName: vi.fn(() => true) })),
}));
vi.mock('./useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({ balance: computed(() => undefined) })),
}));
vi.mock('@n8n/i18n', () => ({ useI18n: vi.fn(() => ({ baseText: (key: string) => key })) }));
vi.mock('../stores/ui.store', () => ({ useUIStore: vi.fn(() => ({ settingsSidebarItems: [] })) }));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		isAiAssistantEnabled: false,
		isAiGatewayEnabled: true,
		isAiGatewayCloudUbbEnabled: isAiGatewayCloudUbbEnabled.value,
		isPublicApiEnabled: false,
		isQueueModeEnabled: false,
		isModuleActive: vi.fn(() => false),
	})),
}));
vi.mock('../utils/rbac/permissions', () => ({ hasPermission: vi.fn(() => false) }));
vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: vi.fn(() => ({ check: computed(() => () => false) })),
}));

describe('useSettingsItems', () => {
	it.each([
		[false, true],
		[true, false],
	])('shows n8n Connect only when Cloud UBB is %s', (cloudUbbEnabled, visible) => {
		isAiGatewayCloudUbbEnabled.value = cloudUbbEnabled;

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item !== undefined).toBe(visible);
	});
});

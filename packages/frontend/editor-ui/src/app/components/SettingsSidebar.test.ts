import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsSidebar from './SettingsSidebar.vue';

const handleSettingsItemSelectMock = vi.hoisted(() => vi.fn());

vi.mock('../composables/useSettingsItems', () => ({
	useSettingsItems: () => ({
		settingsItems: ref([
			{
				id: 'settings-n8n-connect',
				label: 'n8n credits',
			},
		]),
		handleSettingsItemSelect: handleSettingsItemSelectMock,
	}),
}));

vi.mock('../composables/useAiGateway', () => ({
	useAiGateway: () => ({
		fetchWallet: vi.fn(),
		isEnabled: ref(false),
	}),
}));

describe('SettingsSidebar', () => {
	it('delegates settings item clicks', () => {
		const renderComponent = createComponentRenderer(SettingsSidebar, {
			pinia: createTestingPinia(),
		});

		const { getByText } = renderComponent();
		getByText('n8n credits').click();

		expect(handleSettingsItemSelectMock).toHaveBeenCalledWith('settings-n8n-connect');
	});
});

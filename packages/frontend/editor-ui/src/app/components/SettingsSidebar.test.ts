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
				label: 'Gateway credits',
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
		getByText('Gateway credits').click();

		expect(handleSettingsItemSelectMock).toHaveBeenCalledWith('settings-n8n-connect');
	});
});

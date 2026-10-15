import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsSidebar from './SettingsSidebar.vue';

const handleSettingsItemSelectMock = vi.hoisted(() => vi.fn());

const personal = { id: 'settings-personal', label: 'Personal' };
const credits = { id: 'settings-n8n-connect', label: 'Gateway credits' };

vi.mock('../composables/useSettingsItems', () => ({
	useSettingsItems: () => ({
		settingsItems: ref([personal, credits]),
		settingsSections: ref([
			{ id: 'general', title: undefined, items: [personal] },
			{ id: 'ai', title: 'AI', items: [credits] },
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
	const renderComponent = createComponentRenderer(SettingsSidebar, {
		pinia: createTestingPinia(),
	});

	it('delegates settings item clicks', () => {
		const { getByText } = renderComponent();
		getByText('Gateway credits').click();

		expect(handleSettingsItemSelectMock).toHaveBeenCalledWith('settings-n8n-connect');
	});

	it('lists the links under their section headings', () => {
		const { getByTestId, getByText } = renderComponent();

		expect(getByTestId('settings-section-general')).toContainElement(getByText('Personal'));
		expect(getByTestId('settings-section-general')).not.toHaveTextContent('General');
		expect(getByTestId('settings-section-ai')).toContainElement(getByText('AI'));
		expect(getByTestId('settings-section-ai')).toContainElement(getByText('Gateway credits'));
	});
});

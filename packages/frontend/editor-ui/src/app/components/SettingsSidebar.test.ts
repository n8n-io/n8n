import { nextTick, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsSidebar from './SettingsSidebar.vue';

const handleSettingsItemSelectMock = vi.hoisted(() => vi.fn());

const moduleLink = { id: 'settings-module', label: 'Module page' };
const personal = { id: 'settings-personal', label: 'Profile & preferences' };
const credits = { id: 'settings-n8n-connect', label: 'Gateway credits' };

vi.mock('../composables/useSettingsItems', () => ({
	useSettingsItems: () => ({
		settingsItems: ref([moduleLink, personal, credits]),
		settingsSections: ref([
			{ id: 'general', title: undefined, items: [moduleLink] },
			{ id: 'personal', title: 'Personal', items: [personal] },
			{ id: 'billing', title: 'Billing', items: [credits] },
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

		expect(getByTestId('settings-section-general')).toContainElement(getByText('Module page'));
		expect(getByTestId('settings-section-general')).not.toHaveTextContent('General');
		expect(getByTestId('settings-section-personal')).toContainElement(getByText('Personal'));
		expect(getByTestId('settings-section-personal')).toContainElement(
			getByText('Profile & preferences'),
		);
		expect(getByTestId('settings-section-billing')).toContainElement(getByText('Billing'));
		expect(getByTestId('settings-section-billing')).toContainElement(getByText('Gateway credits'));
	});

	it('keeps the back link out of the scrolling list', async () => {
		const { getByTestId } = renderComponent();

		const scrollArea = getByTestId('settings-sidebar-scroll');
		expect(scrollArea).not.toContainElement(getByTestId('settings-back'));
		expect(scrollArea).toContainElement(getByTestId('settings-section-personal'));

		// jsdom has no layout. Give the viewport content that is hidden past both edges.
		const viewport = scrollArea.querySelector<HTMLElement>('[data-reka-scroll-area-viewport]')!;
		for (const [name, value] of [
			['scrollHeight', 200],
			['clientHeight', 100],
			['scrollTop', 50],
		] as const) {
			Object.defineProperty(viewport, name, { configurable: true, writable: true, value });
		}
		viewport.dispatchEvent(new Event('scroll'));
		await nextTick();

		// Both edges fade while the list has more content above and below.
		expect(viewport).toHaveClass('fadeY');
	});
});

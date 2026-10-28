import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import ChatHubSidebar from './ChatHubSidebar.vue';

const handleSettingsItemSelectMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useSettingsItems', () => ({
	useSettingsItems: () => ({
		settingsItems: ref([]),
		settingsSections: ref([]),
		handleSettingsItemSelect: handleSettingsItemSelectMock,
	}),
}));

vi.mock('@/app/composables/useKeybindings', () => ({
	useKeybindings: vi.fn(),
}));

vi.mock('@/app/composables/useSidebarLayout', () => ({
	MAX_SIDEBAR_WIDTH: 500,
	MIN_SIDEBAR_WIDTH: 100,
	useSidebarLayout: () => ({
		isCollapsed: ref(false),
		isResizing: ref(false),
		sidebarWidth: ref(200),
		onResizeStart: vi.fn(),
		onResize: vi.fn(),
		onResizeEnd: vi.fn(),
		toggleCollapse: vi.fn(),
	}),
}));

describe('ChatHubSidebar', () => {
	it('delegates settings item selections', () => {
		const renderComponent = createComponentRenderer(ChatHubSidebar, {
			pinia: createTestingPinia(),
			global: {
				stubs: {
					N8nResizeWrapper: {
						template: '<div><slot /></div>',
					},
					N8nScrollArea: {
						template: '<div><slot /></div>',
					},
					MainSidebarHeader: true,
					ChatHubSidebarContent: true,
					BottomMenu: {
						emits: ['select'],
						template:
							'<button data-test-id="select-credits" @click="$emit(\'select\', \'settings-n8n-connect\')" />',
					},
				},
			},
		});

		const { getByTestId } = renderComponent();
		getByTestId('select-credits').click();

		expect(handleSettingsItemSelectMock).toHaveBeenCalledWith('settings-n8n-connect');
	});
});

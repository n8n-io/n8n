import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import ChatSidebar from './ChatSidebar.vue';

const handleSettingsItemSelectMock = vi.hoisted(() => vi.fn());
const fetchWalletMock = vi.hoisted(() => vi.fn());
const isAiGatewayEnabled = vi.hoisted(() => ({ value: false }));

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: () => ({ fetchWallet: fetchWalletMock, isEnabled: isAiGatewayEnabled }),
}));

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

const renderComponent = createComponentRenderer(ChatSidebar, {
	global: {
		stubs: {
			N8nResizeWrapper: {
				template: '<div><slot /></div>',
			},
			N8nScrollArea: {
				template: '<div><slot /></div>',
			},
			MainSidebarHeader: true,
			ChatSidebarContent: true,
			BottomMenu: {
				emits: ['select'],
				template:
					'<button data-test-id="select-credits" @click="$emit(\'select\', \'settings-n8n-connect\')" />',
			},
		},
	},
});

describe('ChatSidebar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		isAiGatewayEnabled.value = false;
	});

	it('delegates settings item selections', () => {
		const { getByTestId } = renderComponent();
		getByTestId('select-credits').click();

		expect(handleSettingsItemSelectMock).toHaveBeenCalledWith('settings-n8n-connect');
	});

	// The settings menu shows the balance, so the sidebar fetches it itself.
	it('fetches the wallet on mount when the gateway is enabled', () => {
		isAiGatewayEnabled.value = true;

		renderComponent();

		expect(fetchWalletMock).toHaveBeenCalled();
	});

	it('does not fetch the wallet when the gateway is disabled', () => {
		renderComponent();

		expect(fetchWalletMock).not.toHaveBeenCalled();
	});
});

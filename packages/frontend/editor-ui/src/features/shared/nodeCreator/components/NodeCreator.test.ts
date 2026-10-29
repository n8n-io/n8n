import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createPinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { onClickOutside } from '@vueuse/core';
import { OVERLAY_LAYER_SELECTOR } from '@n8n/design-system';
import { createComponentRenderer } from '@/__tests__/render';
import { EmbeddedCanvasElementKey } from '@/app/constants/injectionKeys';
import NodeCreator from './NodeCreator.vue';

const mockFetchConfig = vi.fn();

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({
		isEnabled: { value: false },
		fetchConfig: mockFetchConfig,
		fetchWallet: vi.fn(),
		balance: { value: undefined },
		budget: { value: undefined },
		fetchError: { value: undefined },
		isCredentialTypeSupported: vi.fn(() => false),
		saveAfterToggle: vi.fn(),
	})),
}));

vi.mock('@/features/shared/nodeCreator/composables/useViewStacks', () => ({
	useViewStacks: vi.fn(() => ({
		resetViewStacks: vi.fn(),
		viewStacks: [],
	})),
}));

vi.mock('@/features/shared/nodeCreator/composables/useKeyboardNavigation', () => ({
	useKeyboardNavigation: vi.fn(() => ({
		registerKeyHook: vi.fn(),
	})),
}));

vi.mock('@/features/shared/nodeCreator/composables/useActionsGeneration', () => ({
	useActionsGenerator: vi.fn(() => ({
		generateMergedNodesAndActions: vi.fn(() => ({ actions: [], mergedNodes: [] })),
	})),
}));

vi.mock('@/features/shared/nodeCreator/nodeCreator.store', () => ({
	useNodeCreatorStore: vi.fn(() => ({
		setActions: vi.fn(),
		setMergeNodes: vi.fn(),
	})),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({})),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({ headerHeight: 65 })),
}));

vi.mock('@/features/shared/banners/banners.store', () => ({
	useBannersStore: vi.fn(() => ({ bannersHeight: 0 })),
}));

vi.mock('@/features/ai/assistant/chatPanel.store', () => ({
	useChatPanelStore: vi.fn(() => ({ isOpen: false, width: 0 })),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ isCanvasOnly: false })),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: vi.fn(() => ({})),
}));

vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@vueuse/core')>()),
	onClickOutside: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRouter: vi.fn(() => ({})),
	useRoute: vi.fn(() => ({ query: {}, params: {} })),
	RouterLink: { template: '<a><slot /></a>' },
}));

const renderComponent = createComponentRenderer(NodeCreator, {
	global: { plugins: [createPinia()], stubs: { NodesListPanel: true } },
});

describe('NodeCreator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls fetchConfig from useAiGateway composable on mount', async () => {
		renderComponent();

		expect(mockFetchConfig).toHaveBeenCalledOnce();
	});

	it('does not close on clicks inside Element Plus modals or reka overlays', () => {
		renderComponent();

		expect(vi.mocked(onClickOutside)).toHaveBeenCalledWith(
			expect.anything(),
			expect.any(Function),
			{ ignore: expect.arrayContaining(['.el-overlay-dialog', OVERLAY_LAYER_SELECTOR]) },
		);
	});

	it('places the panel below the main header', () => {
		const { getByTestId } = renderComponent({ props: { active: true } });

		expect(getByTestId('node-creator')).toHaveStyle({ top: '65px' });
	});

	it('places the panel at the top of the embedded canvas', async () => {
		const canvas = document.createElement('div');
		canvas.getBoundingClientRect = () => new DOMRect(0, 120, 800, 600);

		const { getByTestId } = renderComponent({
			props: { active: true },
			global: { provide: { [EmbeddedCanvasElementKey]: ref(canvas) } },
		});

		await waitFor(() => expect(getByTestId('node-creator')).toHaveStyle({ top: '120px' }));
	});
});

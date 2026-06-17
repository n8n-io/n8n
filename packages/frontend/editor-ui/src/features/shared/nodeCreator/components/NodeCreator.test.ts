import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
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
	useUIStore: vi.fn(() => ({ headerHeight: 0 })),
}));

vi.mock('@/features/shared/banners/banners.store', () => ({
	useBannersStore: vi.fn(() => ({ bannersHeight: 0 })),
}));

vi.mock('@/features/ai/assistant/chatPanel.store', () => ({
	useChatPanelStore: vi.fn(() => ({ isOpen: false, width: 0 })),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ isCanvasOnly: false })),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: vi.fn(() => ({})),
}));

vi.mock('@vueuse/core', () => ({
	onClickOutside: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRouter: vi.fn(() => ({})),
	useRoute: vi.fn(() => ({ query: {}, params: {} })),
	RouterLink: { template: '<a><slot /></a>' },
}));

const renderComponent = createComponentRenderer(NodeCreator, {
	global: { plugins: [createPinia()] },
});

describe('NodeCreator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls fetchConfig from useAiGateway composable on mount', async () => {
		renderComponent();

		expect(mockFetchConfig).toHaveBeenCalledOnce();
	});
});

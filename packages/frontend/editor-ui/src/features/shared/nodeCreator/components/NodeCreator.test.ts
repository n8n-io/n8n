import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createPinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { onClickOutside } from '@vueuse/core';
import { OVERLAY_LAYER_SELECTOR } from '@n8n/design-system';
import { createComponentRenderer } from '@/__tests__/render';
import { EmbeddedCanvasElementKey } from '@/app/constants/injectionKeys';
import NodeCreator from './NodeCreator.vue';
import { QUORUM_APPROVAL_NODE_TYPE } from 'n8n-workflow';

const mockFetchConfig = vi.fn();
const mockNodeCreatorState = vi.hoisted(() => ({
	openingContext: null as null | 'replacement',
	isReplacingFromSetupPanel: false,
}));
const mockFocusPanel = vi.hoisted(() => ({ focusPanelActive: false, focusPanelWidth: 0 }));
const mockGenerateMergedNodesAndActions = vi.hoisted(() =>
	vi.fn(() => ({ actions: [], mergedNodes: [] })),
);
const mockVisibleNodeTypes = vi.hoisted(() => ({ value: [] as Array<{ name: string }> }));
const mockWorkflowSettings = vi.hoisted(() => ({
	engineType: undefined as 'v1' | 'v2' | undefined,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn(() => ({ value: { settings: mockWorkflowSettings } })),
}));

vi.mock('@/app/stores/focusPanel.store', () => ({
	useFocusPanelStore: vi.fn(() => mockFocusPanel),
}));

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
		generateMergedNodesAndActions: mockGenerateMergedNodesAndActions,
	})),
}));

vi.mock('@/features/shared/nodeCreator/nodeCreator.store', () => ({
	useNodeCreatorStore: vi.fn(() => ({
		setActions: vi.fn(),
		setMergeNodes: vi.fn(),
		get openingContext() {
			return mockNodeCreatorState.openingContext;
		},
		get isReplacingFromSetupPanel() {
			return mockNodeCreatorState.isReplacingFromSetupPanel;
		},
	})),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		get visibleNodeTypes() {
			return mockVisibleNodeTypes.value;
		},
	})),
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
		mockNodeCreatorState.openingContext = null;
		mockNodeCreatorState.isReplacingFromSetupPanel = false;
		mockFocusPanel.focusPanelActive = false;
		mockFocusPanel.focusPanelWidth = 0;
		mockVisibleNodeTypes.value = [];
		mockWorkflowSettings.engineType = undefined;
	});

	it('hides engine v2 only nodes when the workflow engine is not v2', () => {
		mockVisibleNodeTypes.value = [
			{ name: 'n8n-nodes-base.set' },
			{ name: QUORUM_APPROVAL_NODE_TYPE },
		];
		mockWorkflowSettings.engineType = 'v1';

		renderComponent();

		expect(mockGenerateMergedNodesAndActions).toHaveBeenCalledWith(
			[{ name: 'n8n-nodes-base.set' }],
			undefined,
		);
	});

	it('shows engine v2 only nodes when the workflow engine is v2', () => {
		mockVisibleNodeTypes.value = [
			{ name: 'n8n-nodes-base.set' },
			{ name: QUORUM_APPROVAL_NODE_TYPE },
		];
		mockWorkflowSettings.engineType = 'v2';

		renderComponent();

		expect(mockGenerateMergedNodesAndActions).toHaveBeenCalledWith(
			[{ name: 'n8n-nodes-base.set' }, { name: QUORUM_APPROVAL_NODE_TYPE }],
			undefined,
		);
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

	function clickOn(target: Element) {
		const [[, handler]] = vi.mocked(onClickOutside).mock.calls;
		const event = new PointerEvent('click');
		Object.defineProperty(event, 'target', { value: target });
		handler(event);
	}

	it('stays open on a click inside an overlay layer', () => {
		const { emitted } = renderComponent();
		const layer = document.body.appendChild(document.createElement('div'));
		layer.setAttribute('data-dismissable-layer', '');

		clickOn(layer.appendChild(document.createElement('button')));

		expect(emitted('closeNodeCreator')).toBeUndefined();
		layer.remove();
	});

	it('closes on a click outside it and outside any overlay layer', () => {
		const { emitted } = renderComponent();
		const outside = document.body.appendChild(document.createElement('div'));

		clickOn(outside);

		expect(emitted('closeNodeCreator')).toHaveLength(1);
		outside.remove();
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

	it('opens a replacement from the setup panel beside the open focus panel', () => {
		mockNodeCreatorState.openingContext = 'replacement';
		mockNodeCreatorState.isReplacingFromSetupPanel = true;
		mockFocusPanel.focusPanelActive = true;
		mockFocusPanel.focusPanelWidth = 420;

		const { getByTestId } = renderComponent({ props: { active: true } });

		expect(getByTestId('node-creator').style.getPropertyValue('--node-creator--right')).toBe(
			'420px',
		);
	});

	it('keeps the right edge for a replacement from the canvas', () => {
		mockNodeCreatorState.openingContext = 'replacement';
		mockFocusPanel.focusPanelActive = true;
		mockFocusPanel.focusPanelWidth = 420;

		const { getByTestId } = renderComponent({ props: { active: true } });

		expect(getByTestId('node-creator').style.getPropertyValue('--node-creator--right')).toBe('0px');
	});

	it('keeps the right edge when it adds a node while the focus panel is open', () => {
		mockFocusPanel.focusPanelActive = true;
		mockFocusPanel.focusPanelWidth = 420;

		const { getByTestId } = renderComponent({ props: { active: true } });

		expect(getByTestId('node-creator').style.getPropertyValue('--node-creator--right')).toBe('0px');
	});
});

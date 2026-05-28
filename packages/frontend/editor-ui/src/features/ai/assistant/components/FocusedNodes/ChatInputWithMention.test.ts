import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { defineComponent, h } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import ChatInputWithMention from './ChatInputWithMention.vue';
import { useFocusedNodesStore } from '../../focusedNodes.store';
import type { FocusedNode } from '../../focusedNodes.types';

// Mock NodeIcon
vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		name: 'NodeIcon',
		template: '<div data-test-id="node-icon" />',
		props: ['nodeType', 'size'],
	},
}));

// Mock NodeMentionDropdown
vi.mock('./NodeMentionDropdown.vue', () => ({
	default: defineComponent({
		name: 'NodeMentionDropdown',
		props: ['nodes', 'selectedNodeIds', 'highlightedIndex', 'position', 'searchQuery', 'viaButton'],
		emits: ['select', 'highlight', 'keydown', 'close', 'update:searchQuery'],
		setup() {
			return () => h('div', { 'data-test-id': 'node-mention-dropdown' });
		},
	}),
}));

// Mock N8nPromptInput
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		N8nPromptInput: defineComponent({
			name: 'N8nPromptInput',
			props: [
				'modelValue',
				'placeholder',
				'disabled',
				'disabledTooltip',
				'streaming',
				'creditsQuota',
				'creditsRemaining',
				'showAskOwnerTooltip',
				'maxLength',
				'refocusAfterSend',
				'autofocus',
			],
			emits: ['update:modelValue', 'input', 'keydown', 'submit', 'stop', 'upgrade-click'],
			setup(_props, { slots, emit, expose }) {
				expose({
					focusInput: vi.fn(),
				});
				return () =>
					h('div', { 'data-test-id': 'prompt-input' }, [
						slots['inline-chips']?.(),
						slots['extra-actions']?.(),
						slots['bottom-actions-chips']?.(),
						h('textarea', {
							'data-test-id': 'chat-textarea',
							onInput: (e: Event) => emit('input', e),
							onKeydown: (e: Event) => emit('keydown', e),
						}),
						h('button', {
							'data-test-id': 'submit-button',
							onClick: () => emit('submit'),
						}),
					]);
			},
		}),
	};
});

// Mock canvasEventBus
const canvasEventBusEmit = vi.fn();
vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: {
		emit: (...args: unknown[]) => canvasEventBusEmit(...args),
	},
}));

// Mock posthog
let featureEnabled = true;
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: () => featureEnabled,
	}),
}));

// Mock telemetry
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

// Mock useDebounceFn
vi.mock('@vueuse/core', async (importOriginal) => {
	const actual: Record<string, unknown> = await importOriginal();
	return {
		...actual,
		useDebounceFn: (fn: (...args: unknown[]) => void) => fn,
	};
});

// Mock i18n
vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, unknown> }) =>
			opts?.interpolate ? `${key}:${JSON.stringify(opts.interpolate)}` : key,
	}),
}));

// Mock vue-router
vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => ({ path: '/', params: {}, name: 'NodeView' })),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(ChatInputWithMention);

const createFocusedNode = (id: string, name: string, state: FocusedNode['state']): FocusedNode => ({
	nodeId: id,
	nodeName: name,
	nodeType: 'n8n-nodes-base.httpRequest',
	state,
});

describe('ChatInputWithMention', () => {
	let focusedNodesStore: ReturnType<typeof useFocusedNodesStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		featureEnabled = true;
		canvasEventBusEmit.mockReset();

		const pinia = createTestingPinia({
			createSpy: vi.fn,
			stubActions: false,
		});
		setActivePinia(pinia);

		focusedNodesStore = useFocusedNodesStore();
	});

	describe('feature gating', () => {
		it('should not show mention button when feature disabled', () => {
			featureEnabled = false;
			// Recreate store for the new flag
			focusedNodesStore = useFocusedNodesStore();

			const { queryByTestId } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			expect(queryByTestId('mention-node-button')).not.toBeInTheDocument();
		});

		it('should show mention button when feature enabled', () => {
			const { queryByTestId } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			expect(queryByTestId('mention-node-button')).toBeInTheDocument();
		});
	});

	describe('confirmed chips (inline)', () => {
		it('should render individual confirmed chips for 1-3 nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'confirmed'),
				'node-2': createFocusedNode('node-2', 'Code', 'confirmed'),
			};

			const { getByText } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			expect(getByText('HTTP Request')).toBeInTheDocument();
			expect(getByText('Code')).toBeInTheDocument();
		});

		it('should render bundled chip for 4+ confirmed nodes', () => {
			const map: Record<string, FocusedNode> = {};
			for (let i = 0; i < 4; i++) {
				map[`node-${i}`] = createFocusedNode(`node-${i}`, `Node ${i}`, 'confirmed');
			}
			focusedNodesStore.focusedNodesMap = map;

			const { container } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			const bundledChip = container.querySelector('[class*="bundledConfirmedChip"]');
			expect(bundledChip).toBeInTheDocument();
		});
	});

	describe('unconfirmed chips (bottom)', () => {
		it('should render individual unconfirmed chips for 1-3 nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'unconfirmed'),
			};

			const { getByText } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			expect(getByText('HTTP Request')).toBeInTheDocument();
		});

		it('should render bundled unconfirmed chip for 4+ nodes', () => {
			const map: Record<string, FocusedNode> = {};
			for (let i = 0; i < 4; i++) {
				map[`node-${i}`] = createFocusedNode(`node-${i}`, `Node ${i}`, 'unconfirmed');
			}
			focusedNodesStore.focusedNodesMap = map;

			const { container } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			const bundledChip = container.querySelector('[class*="bundledUnconfirmedChip"]');
			expect(bundledChip).toBeInTheDocument();
		});
	});

	describe('chip interactions', () => {
		it('should emit canvas select when confirmed chip is clicked', async () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'confirmed'),
			};

			const { getByText } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			const label = getByText('HTTP Request');
			label.closest('span')?.click();

			expect(canvasEventBusEmit).toHaveBeenCalledWith('nodes:select', {
				ids: ['node-1'],
				panIntoView: true,
			});
		});

		it('should toggle unconfirmed chip on click', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'unconfirmed'),
			};

			const toggleSpy = vi.spyOn(focusedNodesStore, 'toggleNode');

			const { getByText } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			const label = getByText('HTTP Request');
			label.closest('span')?.click();

			expect(toggleSpy).toHaveBeenCalledWith('node-1', expect.any(Boolean));
		});

		it('should remove confirmed node on remove button click', async () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'confirmed'),
			};

			const removeNodeSpy = vi.spyOn(focusedNodesStore, 'removeNode');
			const setStateSpy = vi.spyOn(focusedNodesStore, 'setState');

			const { container } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			// Click remove button on chip
			const removeButton = container.querySelector('button');
			removeButton?.click();

			// Should either call setState (if on canvas) or removeNode (if off canvas)
			expect(removeNodeSpy.mock.calls.length + setStateSpy.mock.calls.length).toBeGreaterThan(0);
		});
	});

	describe('dropdown integration', () => {
		it('should not render dropdown when feature disabled', () => {
			featureEnabled = false;
			focusedNodesStore = useFocusedNodesStore();

			const { queryByTestId } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			expect(queryByTestId('node-mention-dropdown')).not.toBeInTheDocument();
		});
	});

	describe('submit', () => {
		it('should render the component', () => {
			const { container } = renderComponent({
				props: { modelValue: '', placeholder: 'Ask...' },
			});

			// Component should render without errors
			expect(container.querySelector('[class*="wrapper"]')).toBeInTheDocument();
		});
	});

	describe('v-model sync', () => {
		it('should render with modelValue', () => {
			const { container } = renderComponent({
				props: { modelValue: 'test message', placeholder: 'Ask...' },
			});

			expect(container.querySelector('[class*="wrapper"]')).toBeInTheDocument();
		});
	});
});

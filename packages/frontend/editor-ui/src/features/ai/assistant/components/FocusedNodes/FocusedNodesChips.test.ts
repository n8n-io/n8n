import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import FocusedNodesChips from './FocusedNodesChips.vue';
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

// Mock canvasEventBus
const canvasEventBusEmit = vi.fn();
vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: {
		emit: (...args: unknown[]) => canvasEventBusEmit(...args),
	},
}));

// Mock i18n
vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, unknown> }) =>
			opts?.interpolate ? `${key}:${JSON.stringify(opts.interpolate)}` : key,
	}),
}));

// Mock posthog
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isFeatureEnabled: () => true,
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

// Mock vue-router
vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => ({ path: '/', params: {}, name: 'NodeView' })),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(FocusedNodesChips);

const createFocusedNode = (id: string, name: string, state: FocusedNode['state']): FocusedNode => ({
	nodeId: id,
	nodeName: name,
	nodeType: 'n8n-nodes-base.httpRequest',
	state,
});

describe('FocusedNodesChips', () => {
	let focusedNodesStore: ReturnType<typeof useFocusedNodesStore>;

	beforeEach(() => {
		vi.clearAllMocks();

		const pinia = createTestingPinia({
			createSpy: vi.fn,
			stubActions: false,
		});
		setActivePinia(pinia);

		focusedNodesStore = useFocusedNodesStore();
		canvasEventBusEmit.mockReset();
	});

	describe('visibility', () => {
		it('should not render when no visible nodes', () => {
			const { container } = renderComponent({
				pinia: createTestingPinia({ stubActions: false }),
			});

			// Container should be empty (v-if hides it)
			expect(container.querySelector('[class*="container"]')).not.toBeInTheDocument();
		});

		it('should render when feature enabled and has visible nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'confirmed'),
			};

			const { container } = renderComponent();

			expect(container.querySelector('[class*="container"]')).toBeInTheDocument();
		});
	});

	describe('collapsed mode (7+ confirmed)', () => {
		it('should show count chip when >= 7 confirmed', () => {
			const map: Record<string, FocusedNode> = {};
			for (let i = 0; i < 7; i++) {
				map[`node-${i}`] = createFocusedNode(`node-${i}`, `Node ${i}`, 'confirmed');
			}
			focusedNodesStore.focusedNodesMap = map;

			const { container } = renderComponent();

			const countChip = container.querySelector('[class*="countChip"]');
			expect(countChip).toBeInTheDocument();
			expect(countChip?.textContent).toContain('7');
		});

		it('should emit expand on count chip click', async () => {
			const map: Record<string, FocusedNode> = {};
			for (let i = 0; i < 7; i++) {
				map[`node-${i}`] = createFocusedNode(`node-${i}`, `Node ${i}`, 'confirmed');
			}
			focusedNodesStore.focusedNodesMap = map;

			const { container, emitted } = renderComponent();

			const countChip = container.querySelector('[class*="countChip"]');
			countChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

			expect(emitted().expand).toBeTruthy();
		});
	});

	describe('confirmed chips', () => {
		it('should show individual chips for 1-3 confirmed nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'confirmed'),
				'node-2': createFocusedNode('node-2', 'Code', 'confirmed'),
			};

			const { getByText } = renderComponent();

			expect(getByText('HTTP Request')).toBeInTheDocument();
			expect(getByText('Code')).toBeInTheDocument();
		});

		it('should show bundled chip for 4+ confirmed nodes', () => {
			const map: Record<string, FocusedNode> = {};
			for (let i = 0; i < 4; i++) {
				map[`node-${i}`] = createFocusedNode(`node-${i}`, `Node ${i}`, 'confirmed');
			}
			focusedNodesStore.focusedNodesMap = map;

			const { container } = renderComponent();

			const bundledChip = container.querySelector('[class*="bundledChip"]');
			expect(bundledChip).toBeInTheDocument();
		});
	});

	describe('unconfirmed chips', () => {
		it('should show individual unconfirmed chips for 1-3 nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'unconfirmed'),
			};

			const { getByText } = renderComponent();

			expect(getByText('HTTP Request')).toBeInTheDocument();
		});

		it('should show bundled unconfirmed chip for 4+ nodes', () => {
			const map: Record<string, FocusedNode> = {};
			for (let i = 0; i < 4; i++) {
				map[`node-${i}`] = createFocusedNode(`node-${i}`, `Node ${i}`, 'unconfirmed');
			}
			focusedNodesStore.focusedNodesMap = map;

			const { container } = renderComponent();

			const bundledChip = container.querySelector('[class*="bundledUnconfirmedChip"]');
			expect(bundledChip).toBeInTheDocument();
		});
	});

	describe('interactions', () => {
		it('should emit canvas select when confirmed chip is clicked', async () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': createFocusedNode('node-1', 'HTTP Request', 'confirmed'),
			};

			const { getByText } = renderComponent();

			// Click on the chip label
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

			const { getByText } = renderComponent();

			const label = getByText('HTTP Request');
			label.closest('span')?.click();

			expect(toggleSpy).toHaveBeenCalledWith('node-1', expect.any(Boolean));
		});
	});
});

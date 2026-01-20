import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import type { EventBus } from '@n8n/utils/event-bus';
import type { CanvasEventBusEvents } from '@/features/workflows/canvas/canvas.types';

// Mock useVueFlow - capture onNodesInitialized callback
let nodesInitializedCallback: (() => void) | null = null;

vi.mock('@vue-flow/core', () => ({
	useVueFlow: vi.fn(() => ({
		setViewport: vi.fn(),
		onViewportChange: vi.fn(),
		onNodeClick: vi.fn(),
		fitView: vi.fn(),
		findNode: vi.fn(),
		addSelectedNodes: vi.fn(),
		onPaneClick: vi.fn(),
		onNodesInitialized: (cb: () => void) => {
			nodesInitializedCallback = cb;
		},
		updateNode: vi.fn(),
	})),
}));

// Mock useViewportSync
vi.mock('@/features/workflows/workflowDiff/useViewportSync', () => ({
	useInjectViewportSync: () => ({
		triggerViewportChange: vi.fn(),
		onViewportChange: vi.fn(),
		selectedDetailId: ref(undefined),
		triggerNodeClick: vi.fn(),
	}),
}));

// Capture eventBus from Canvas component props
let capturedEventBus: EventBus<CanvasEventBusEvents> | null = null;
const emitSpy = vi.fn();

// Mock Canvas component to capture eventBus
vi.mock('@/features/workflows/canvas/components/Canvas.vue', () => ({
	default: defineComponent({
		name: 'Canvas',
		props: ['id', 'nodes', 'connections', 'readOnly', 'eventBus'],
		setup(props) {
			if (props.eventBus) {
				capturedEventBus = props.eventBus as EventBus<CanvasEventBusEvents>;
				// Spy on the emit method
				const originalEmit = capturedEventBus.emit.bind(capturedEventBus);
				capturedEventBus.emit = ((...args: Parameters<typeof originalEmit>) => {
					emitSpy(...args);
					return originalEmit(...args);
				}) as typeof originalEmit;
			}
			return () => h('div', { 'data-test-id': 'canvas-mock' });
		},
	}),
}));

vi.mock(
	'@/features/workflows/canvas/components/elements/background/CanvasBackground.vue',
	() => ({
		default: defineComponent({
			name: 'CanvasBackground',
			setup() {
				return () => h('div');
			},
		}),
	}),
);

// Import after mocks
import SyncedWorkflowCanvas from './SyncedWorkflowCanvas.vue';

describe('SyncedWorkflowCanvas', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		nodesInitializedCallback = null;
		capturedEventBus = null;
		emitSpy.mockClear();
		createTestingPinia();
	});

	it('should render successfully', () => {
		const { container } = render(SyncedWorkflowCanvas, {
			props: {
				id: 'test-canvas',
				nodes: [],
				connections: [],
			},
		});
		expect(container).toBeTruthy();
	});

	describe('applyLayout prop', () => {
		it('should trigger tidyUp event after nodes are initialized when applyLayout is true', () => {
			render(SyncedWorkflowCanvas, {
				props: {
					id: 'test-canvas',
					nodes: [],
					connections: [],
					applyLayout: true,
				},
			});

			// Verify eventBus was created and passed to Canvas
			expect(capturedEventBus).toBeTruthy();

			// Simulate nodes being initialized
			if (nodesInitializedCallback) {
				nodesInitializedCallback();
			}

			// Verify tidyUp event was emitted
			expect(emitSpy).toHaveBeenCalledWith('tidyUp', { source: 'import-workflow-data' });
		});

		it('should NOT trigger tidyUp event when applyLayout is false', () => {
			render(SyncedWorkflowCanvas, {
				props: {
					id: 'test-canvas',
					nodes: [],
					connections: [],
					applyLayout: false,
				},
			});

			// Simulate nodes being initialized
			if (nodesInitializedCallback) {
				nodesInitializedCallback();
			}

			// Verify tidyUp event was NOT emitted
			expect(emitSpy).not.toHaveBeenCalled();
		});

		it('should NOT trigger tidyUp event when applyLayout is undefined', () => {
			render(SyncedWorkflowCanvas, {
				props: {
					id: 'test-canvas',
					nodes: [],
					connections: [],
				},
			});

			// Simulate nodes being initialized
			if (nodesInitializedCallback) {
				nodesInitializedCallback();
			}

			// Verify tidyUp event was NOT emitted
			expect(emitSpy).not.toHaveBeenCalled();
		});
	});
});

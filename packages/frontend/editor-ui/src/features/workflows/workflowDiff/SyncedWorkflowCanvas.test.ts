import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import type { EventBus } from '@n8n/utils/event-bus';
import type { CanvasEventBusEvents } from '@/features/workflows/canvas/canvas.types';

// Mock useVueFlow - capture onNodesInitialized callback and updateNode spy
let nodesInitializedCallback: (() => void) | null = null;
const updateNodeSpy = vi.fn();

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
		updateNode: updateNodeSpy,
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

// Capture eventBus from Canvas component props and tidy-up handler
let capturedEventBus: EventBus<CanvasEventBusEvents> | null = null;
let capturedTidyUpHandler: ((event: unknown) => void) | null = null;
const emitSpy = vi.fn();

// Mock Canvas component to capture eventBus and emit handler
vi.mock('@/features/workflows/canvas/components/Canvas.vue', () => ({
	default: defineComponent({
		name: 'MockedCanvas',
		props: ['id', 'nodes', 'connections', 'readOnly', 'eventBus'],
		emits: ['tidy-up'],
		setup(props, { emit }) {
			if (props.eventBus) {
				capturedEventBus = props.eventBus as EventBus<CanvasEventBusEvents>;
				// Spy on the emit method
				const originalEmit = capturedEventBus.emit.bind(capturedEventBus);
				capturedEventBus.emit = ((...args: Parameters<typeof originalEmit>) => {
					emitSpy(...args);
					return originalEmit(...args);
				}) as typeof originalEmit;
			}
			// Capture the tidy-up handler by exposing a way to trigger it
			capturedTidyUpHandler = (event: unknown) => emit('tidy-up', event);
			return () => h('div', { 'data-test-id': 'canvas-mock' });
		},
	}),
}));

vi.mock('@/features/workflows/canvas/components/elements/background/CanvasBackground.vue', () => ({
	default: defineComponent({
		name: 'CanvasBackground',
		setup() {
			return () => h('div');
		},
	}),
}));

// Import after mocks
import SyncedWorkflowCanvas from './SyncedWorkflowCanvas.vue';

describe('SyncedWorkflowCanvas', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		nodesInitializedCallback = null;
		capturedEventBus = null;
		capturedTidyUpHandler = null;
		emitSpy.mockClear();
		updateNodeSpy.mockClear();
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

		it('should apply calculated positions via updateNode when Canvas emits tidy-up event', () => {
			render(SyncedWorkflowCanvas, {
				props: {
					id: 'test-canvas',
					nodes: [],
					connections: [],
					applyLayout: true,
				},
			});

			// Simulate Canvas emitting tidy-up with calculated positions
			const layoutResult = {
				result: {
					boundingBox: { x: 0, y: 0, width: 500, height: 300 },
					nodes: [
						{ id: 'node-1', x: 100, y: 50 },
						{ id: 'node-2', x: 300, y: 150 },
					],
				},
				source: 'import-workflow-data',
				target: 'all',
			};

			if (capturedTidyUpHandler) {
				capturedTidyUpHandler(layoutResult);
			}

			// Verify updateNode was called for each node with positions offset
			// so the leftmost topmost node (node-1) is at origin {0, 0}
			// node-1 was at {100, 50}, so offset is {-100, -50}
			expect(updateNodeSpy).toHaveBeenCalledTimes(2);
			expect(updateNodeSpy).toHaveBeenCalledWith('node-1', { position: { x: 0, y: 0 } });
			expect(updateNodeSpy).toHaveBeenCalledWith('node-2', { position: { x: 200, y: 100 } });
		});
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { render, screen } from '@testing-library/vue';
import type { INodeUi } from '@/Interface';
import { createEmptyCanvasRenderData } from '@/features/workflows/canvas/canvas.utils';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import {
	createCanvasNodeProps,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { CanvasRenderDataKey } from '@/app/constants/injectionKeys';

interface CapturedCanvasProps {
	id: string;
	nodes: unknown[];
	connections: unknown[];
	applyLayout?: boolean;
}

// Track what props are passed to child components
let capturedSyncedCanvasProps: { top?: CapturedCanvasProps; bottom?: CapturedCanvasProps } = {};
// When set, the canvas mock renders the node slot with these props, like Vue Flow does.
let mockNodeSlotProps: Record<string, unknown> | undefined;

// Mock SyncedWorkflowCanvas
vi.mock('@/features/workflows/workflowDiff/SyncedWorkflowCanvas.vue', () => ({
	default: defineComponent({
		name: 'SyncedWorkflowCanvas',
		props: ['id', 'nodes', 'connections', 'applyLayout'],
		setup(props, { slots }) {
			if (props.id === 'top') {
				capturedSyncedCanvasProps.top = { ...props };
			} else if (props.id === 'bottom') {
				capturedSyncedCanvasProps.bottom = { ...props };
			}
			return () =>
				h('div', { 'data-test-id': `synced-canvas-${props.id}` }, [
					props.id,
					mockNodeSlotProps ? slots.node?.({ nodeProps: mockNodeSlotProps }) : null,
				]);
		},
	}),
}));

// Mock WorkflowDiffAside
vi.mock('@/features/workflows/workflowDiff/WorkflowDiffAside.vue', () => ({
	default: defineComponent({
		name: 'WorkflowDiffAside',
		props: ['node'],
		emits: ['close'],
		setup(props) {
			return () =>
				h('div', { 'data-test-id': 'workflow-diff-aside' }, `Aside: ${props.node?.name}`);
		},
	}),
}));

// Mock NodeDiff
vi.mock('@/features/workflows/workflowDiff/NodeDiff.vue', () => ({
	default: defineComponent({
		name: 'NodeDiff',
		props: ['oldString', 'newString', 'outputFormat'],
		setup() {
			return () => h('div', { 'data-test-id': 'node-diff' });
		},
	}),
}));

// Mock useProvideViewportSync and useInjectViewportSync
vi.mock('@/features/workflows/workflowDiff/useViewportSync', () => ({
	useProvideViewportSync: () => ({
		selectedDetailId: ref(undefined),
		onNodeClick: vi.fn(),
		syncIsEnabled: ref(true),
	}),
	useInjectViewportSync: () => ({
		triggerViewportChange: vi.fn(),
		onViewportChange: vi.fn(),
		selectedDetailId: ref(undefined),
		triggerNodeClick: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useI18n: () => ({
			baseText: (key: string) => key,
		}),
	};
});

// Import after mocks
import WorkflowDiffContent from './WorkflowDiffContent.vue';

describe('WorkflowDiffContent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedSyncedCanvasProps = {};
		mockNodeSlotProps = undefined;
		createTestingPinia();
	});

	const defaultProps = {
		sourceNodes: [],
		sourceConnections: [],
		targetNodes: [],
		targetConnections: [],
		sourceLabel: 'Before',
		targetLabel: 'After',
		sourceExists: true,
		targetExists: true,
		nodeDiffs: { oldString: '', newString: '' },
		isSourceWorkflowNew: false,
		nodesDiff: new Map(),
		connectionsDiff: new Map(),
		sourceRenderData: createEmptyCanvasRenderData(),
		targetRenderData: createEmptyCanvasRenderData(),
	};

	describe('panels', () => {
		it('should render two canvas panels when both workflows exist', () => {
			render(WorkflowDiffContent, { props: defaultProps });

			expect(screen.getByTestId('synced-canvas-top')).toBeInTheDocument();
			expect(screen.getByTestId('synced-canvas-bottom')).toBeInTheDocument();
		});

		it('should display source label', () => {
			render(WorkflowDiffContent, {
				props: { ...defaultProps, sourceLabel: 'Remote' },
			});

			expect(screen.getByText('Remote')).toBeInTheDocument();
		});

		it('should display target label', () => {
			render(WorkflowDiffContent, {
				props: { ...defaultProps, targetLabel: 'Local' },
			});

			expect(screen.getByText('Local')).toBeInTheDocument();
		});

		it('should pass nodes and connections to source canvas', () => {
			const sourceNodes = [{ id: 'node-1', position: { x: 0, y: 0 } }];
			const sourceConnections = [{ id: 'conn-1', source: 'a', target: 'b' }];

			render(WorkflowDiffContent, {
				props: { ...defaultProps, sourceNodes, sourceConnections },
			});

			expect(capturedSyncedCanvasProps.top).toMatchObject({
				nodes: sourceNodes,
				connections: sourceConnections,
			});
		});

		it('should pass nodes and connections to target canvas', () => {
			const targetNodes = [{ id: 'node-2', position: { x: 0, y: 0 } }];
			const targetConnections = [{ id: 'conn-2', source: 'a', target: 'b' }];

			render(WorkflowDiffContent, {
				props: { ...defaultProps, targetNodes, targetConnections },
			});

			expect(capturedSyncedCanvasProps.bottom).toMatchObject({
				nodes: targetNodes,
				connections: targetConnections,
			});
		});
	});

	describe('empty workflow states', () => {
		it('should show "New Workflow" when source does not exist and target does', () => {
			render(WorkflowDiffContent, {
				props: { ...defaultProps, sourceExists: false, isSourceWorkflowNew: true },
			});

			expect(screen.getByText('workflowDiff.newWorkflow')).toBeInTheDocument();
		});

		it('should show "Deleted Workflow" when source does not exist and is not new', () => {
			render(WorkflowDiffContent, {
				props: { ...defaultProps, sourceExists: false, isSourceWorkflowNew: false },
			});

			expect(screen.getByText('workflowDiff.deletedWorkflow')).toBeInTheDocument();
		});

		it('should show "Deleted Workflow" when target does not exist', () => {
			render(WorkflowDiffContent, {
				props: { ...defaultProps, targetExists: false },
			});

			expect(screen.getByText('workflowDiff.deletedWorkflow')).toBeInTheDocument();
		});
	});

	describe('apply layout', () => {
		it('should pass applyLayout=true to both canvases when prop is true', () => {
			render(WorkflowDiffContent, {
				props: { ...defaultProps, applyLayout: true },
			});

			expect(capturedSyncedCanvasProps.top).toMatchObject({ applyLayout: true });
			expect(capturedSyncedCanvasProps.bottom).toMatchObject({ applyLayout: true });
		});

		it('should pass applyLayout as falsy to canvases when prop is not provided', () => {
			render(WorkflowDiffContent, {
				props: defaultProps,
			});

			expect(capturedSyncedCanvasProps.top?.applyLayout).toBeFalsy();
			expect(capturedSyncedCanvasProps.bottom?.applyLayout).toBeFalsy();
		});
	});

	describe('nodes', () => {
		it('should render a selected Webpage node as read-only', () => {
			mockNodeSlotProps = createCanvasNodeProps({
				id: 'webpage',
				selected: true,
				data: {
					name: 'Landing page',
					type: 'n8n-nodes-base.webpage',
					render: {
						type: CanvasNodeRenderType.Webpage,
						options: { html: '<h1>Hello</h1>', width: 480, height: 320 },
					},
				},
			});

			render(WorkflowDiffContent, {
				props: { ...defaultProps, targetExists: false },
				global: {
					provide: {
						...createCanvasProvide(),
						[CanvasRenderDataKey as symbol]: ref(createEmptyCanvasRenderData()),
					},
					stubs: {
						CanvasNodeStatusIcons: true,
						ResizeControl: {
							template: '<div data-test-id="webpage-resize-control" />',
						},
					},
				},
			});

			expect(screen.getByTestId('canvas-node-webpage')).toBeInTheDocument();
			expect(screen.queryByTestId('webpage-resize-control')).not.toBeInTheDocument();
			const body = screen.getByTestId('canvas-node-webpage-body');
			expect(body).not.toHaveClass('interactive');
			expect(body).not.toHaveClass('nodrag');
			expect(body).not.toHaveClass('nowheel');
		});
	});

	describe('aside panel', () => {
		it('should not render aside when no node is selected', () => {
			render(WorkflowDiffContent, {
				props: defaultProps,
			});

			expect(screen.queryByTestId('workflow-diff-aside')).not.toBeInTheDocument();
		});

		it('should render aside when a node is selected', () => {
			const selectedNode: INodeUi = {
				id: 'node-1',
				name: 'Test Node',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			render(WorkflowDiffContent, {
				props: { ...defaultProps, selectedNode },
			});

			expect(screen.getByTestId('workflow-diff-aside')).toBeInTheDocument();
			expect(screen.getByText('Aside: Test Node')).toBeInTheDocument();
		});
	});
});

// @vitest-environment jsdom
import { fireEvent, waitFor } from '@testing-library/vue';
import { computed } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import Canvas from './Canvas.vue';
import { createPinia, setActivePinia } from 'pinia';
import {
	CANVAS_NODE_GROUP_TYPE,
	type CanvasConnection,
	type CanvasEventBusEvents,
	type CanvasGroupNode,
	type CanvasNode,
} from '../canvas.types';
import {
	createCanvasConnection,
	createCanvasGroupElement,
	createCanvasNodeElement,
} from '@/features/workflows/canvas/__tests__/utils';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

import type { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useVueFlow } from '@vue-flow/core';
import { CANVAS_NODES_GROUPING_EXPERIMENT, SIMULATE_NODE_TYPE } from '@/app/constants';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { createEventBus } from '@n8n/utils/event-bus';
import { usePostHog } from '@/app/stores/posthog.store';
import { GROUP_PADDING_Y_BOTTOM, GROUP_PADDING_Y_TOP } from '../stores/canvasNodeGroups.constants';
import {
	NodeGroupViewKey,
	useCanvasNodeGroupView,
	type CanvasNodeGroupView,
} from '../composables/useCanvasNodeGroupView';
import { useTelemetry } from '@/app/composables/useTelemetry';

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

const trackSpy = vi.hoisted(() => vi.fn());
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: trackSpy })),
}));

let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/stores/workflowDocument.store')>();
	return {
		...actual,
		injectWorkflowDocumentStore: () => computed(() => workflowDocumentStore),
	};
});

const matchMedia = global.window.matchMedia;
// @ts-expect-error Initialize window object
global.window = jsdom.window as unknown as Window & typeof globalThis;
global.window.matchMedia = matchMedia;

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof useDeviceSupport>();
	return { ...actual, useDeviceSupport: vi.fn(() => ({ isCtrlKeyPressed: vi.fn() })) };
});

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>();
	return {
		...actual,
		injectCanvasRenderData: vi.fn(() => ({ value: actual.createEmptyCanvasRenderData() })),
	};
});

const canvasId = 'canvas';

function createCanvasGroupNode({
	nodesRect = { x: 0, y: 0, width: 300, height: 100 },
	selectable = false,
}: {
	nodesRect?: NonNullable<CanvasGroupNode['data']>['nodesRect'];
	selectable?: boolean;
} = {}): CanvasGroupNode {
	return {
		id: 'group:g1',
		type: CANVAS_NODE_GROUP_TYPE,
		position: { x: 0, y: 0 },
		width: 300,
		height: 40,
		selectable,
		data: {
			group: { id: 'g1', name: 'Group 1', nodeIds: ['node-1'] },
			nodesRect,
			isCollapsed: false,
		},
	};
}

let renderComponent: ReturnType<typeof createComponentRenderer>;
beforeEach(() => {
	const pinia = createPinia();
	setActivePinia(pinia);
	workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-test'));

	renderComponent = createComponentRenderer(Canvas, {
		pinia,
		props: {
			id: canvasId,
			nodes: [],
			connections: [],
		},
	});
});

afterEach(() => {
	vi.clearAllMocks();
	vi.useRealTimers();
});

describe('Canvas', () => {
	it('should initialize with default props', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('canvas')).toBeVisible();
		expect(getByTestId('canvas-background')).toBeVisible();
		expect(getByTestId('canvas-controls')).toBeVisible();
		expect(getByTestId('canvas-minimap')).toBeInTheDocument();
	});

	it('should render nodes and edges', async () => {
		const nodes: CanvasNode[] = [
			createCanvasNodeElement({
				id: '1',
				label: 'Node 1',
			}),
			createCanvasNodeElement({
				id: '2',
				label: 'Node 2',
				position: { x: 200, y: 200 },
			}),
		];

		const connections: CanvasConnection[] = [createCanvasConnection(nodes[0], nodes[1])];

		const { container } = renderComponent({
			props: {
				nodes,
				connections,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		expect(container.querySelector(`[data-id="${nodes[0].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${nodes[1].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${connections[0].id}"]`)).toBeInTheDocument();
	});

	it('should render group frame from live VueFlow node data', async () => {
		const posthogStore = usePostHog();
		vi.spyOn(posthogStore, 'isFeatureEnabled').mockImplementation(
			(name) => name === CANVAS_NODES_GROUPING_EXPERIMENT.name,
		);

		const groupNode = createCanvasGroupNode();

		const { getByTestId } = renderComponent({
			props: {
				nodes: [groupNode],
			},
		});

		await waitFor(() => expect(getByTestId('canvas-node-group-frame')).toBeInTheDocument());

		const { updateNode } = useVueFlow(canvasId);
		updateNode(groupNode.id, {
			data: {
				...groupNode.data,
				nodesRect: { x: 0, y: 0, width: 300, height: 240 },
			},
		});

		await waitFor(() => {
			expect(getByTestId('canvas-node-group-frame')).toHaveStyle({
				height: `${240 + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM}px`,
			});
		});
	});

	it('should exclude expanded group title bars from select all', async () => {
		const posthogStore = usePostHog();
		vi.spyOn(posthogStore, 'isFeatureEnabled').mockImplementation(
			(name) => name === CANVAS_NODES_GROUPING_EXPERIMENT.name,
		);

		const node = createCanvasNodeElement({ id: 'node-1' });
		const groupNode = createCanvasGroupNode({ selectable: false });
		const eventBus = createEventBus<CanvasEventBusEvents>();

		const { container } = renderComponent({
			props: {
				nodes: [node, groupNode],
				eventBus,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		const { getSelectedNodes } = useVueFlow(canvasId);
		eventBus.emit('nodes:selectAll');

		await waitFor(() => expect(getSelectedNodes.value.map(({ id }) => id)).toEqual([node.id]));
	});

	it('should include collapsed group title bars in select all', async () => {
		const posthogStore = usePostHog();
		vi.spyOn(posthogStore, 'isFeatureEnabled').mockImplementation(
			(name) => name === CANVAS_NODES_GROUPING_EXPERIMENT.name,
		);

		const node = createCanvasNodeElement({ id: 'node-1' });
		const groupNode = createCanvasGroupNode({ selectable: true });
		const eventBus = createEventBus<CanvasEventBusEvents>();

		const { container } = renderComponent({
			props: {
				nodes: [node, groupNode],
				eventBus,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		const { getSelectedNodes } = useVueFlow(canvasId);
		eventBus.emit('nodes:selectAll');

		await waitFor(() =>
			expect(getSelectedNodes.value.map(({ id }) => id).sort()).toEqual([groupNode.id, node.id]),
		);
	});

	it('should clear selected members when their group is collapsed', async () => {
		vi.spyOn(usePostHog(), 'isFeatureEnabled').mockImplementation(
			(name) => name === CANVAS_NODES_GROUPING_EXPERIMENT.name,
		);
		vi.spyOn(workflowDocumentStore, 'getGroupById').mockReturnValue({
			id: 'g1',
			name: 'Group 1',
			nodeIds: ['node-1'],
		});

		let collapsed = false;
		const nodeGroupView = {
			isGroupCollapsed: () => collapsed,
			toggleCollapsed: () => {
				collapsed = !collapsed;
			},
			getVisualOffsetForNode: () => ({ x: 0, y: 0 }),
			getVisualOffsetForComponent: () => ({ x: 0, y: 0 }),
			syncLayoutComponents: () => {},
			settleManualNodePositions: (events: unknown) => events,
			commitMovedPushSourceEffects: () => [],
		} as unknown as CanvasNodeGroupView;

		const node = createCanvasNodeElement({ id: 'node-1' });
		const groupNode = createCanvasGroupNode({ selectable: true });
		const eventBus = createEventBus<CanvasEventBusEvents>();

		const { container, getByTestId } = renderComponent({
			props: { nodes: [node, groupNode], eventBus },
			global: { provide: { [NodeGroupViewKey as symbol]: nodeGroupView } },
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		const { getSelectedNodes } = useVueFlow(canvasId);
		eventBus.emit('nodes:selectAll');
		await waitFor(() => expect(getSelectedNodes.value.map(({ id }) => id)).toContain('node-1'));

		await fireEvent.click(getByTestId('canvas-node-group-toggle'));

		await waitFor(() => expect(getSelectedNodes.value.map(({ id }) => id)).not.toContain('node-1'));
	});

	it('should expand a selected collapsed group to its members when copying', async () => {
		vi.spyOn(usePostHog(), 'isFeatureEnabled').mockImplementation(
			(name) => name === CANVAS_NODES_GROUPING_EXPERIMENT.name,
		);

		const groupNode = createCanvasGroupElement({ id: 'g1', nodeIds: ['node-1', 'node-2'] });

		const { container, emitted } = renderComponent({
			props: { nodes: [groupNode] },
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		const { addSelectedNodes, nodes: graphNodes } = useVueFlow({ id: canvasId });
		addSelectedNodes(graphNodes.value);

		await fireEvent.keyDown(document, { key: 'c', ctrlKey: true, metaKey: true });

		// The group title bar isn't a real node, so copy must carry its members.
		expect(emitted()['copy:nodes']).toEqual([[['node-1', 'node-2']]]);
	});

	it('should emit `update:nodes:position` event', async () => {
		const nodes = [createCanvasNodeElement()];
		const { container, emitted } = renderComponent({
			props: {
				nodes,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		const node = container.querySelector(`[data-id="${nodes[0].id}"]`) as Element;
		await fireEvent.mouseDown(node, { view: window });
		await fireEvent.mouseMove(node, {
			view: window,
			clientX: 20,
			clientY: 20,
		});
		await fireEvent.mouseMove(node, {
			view: window,
			clientX: 40,
			clientY: 40,
		});
		await fireEvent.mouseUp(node, { view: window });

		expect(emitted()['update:nodes:position']).toEqual([
			[
				[
					{
						id: '1',
						position: { x: 112, y: 112 },
					},
				],
			],
		]);
	});

	it('should emit `update:node:name` event', async () => {
		const nodes = [createCanvasNodeElement()];
		const { container, emitted } = renderComponent({
			props: {
				nodes,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		const node = container.querySelector(`[data-id="${nodes[0].id}"]`) as Element;

		const { addSelectedNodes, nodes: graphNodes } = useVueFlow({ id: canvasId });
		addSelectedNodes(graphNodes.value);

		await waitFor(() => expect(container.querySelector('.selected')).toBeInTheDocument());

		await fireEvent.keyDown(node, { key: ' ', view: window });
		await fireEvent.keyUp(node, { key: ' ', view: window });

		expect(emitted()['update:node:name']).toEqual([['1']]);
	});

	it('should update viewport if nodes:select event is received with panIntoView=true', async () => {
		const node = createCanvasNodeElement({ position: { x: -1000, y: -500 } });

		renderComponent({
			props: {
				id: 'c0',
				nodes: [node],
				eventBus: canvasEventBus,
			},
		});

		const { getViewport } = useVueFlow('c0');

		expect(getViewport()).toEqual({ x: 0, y: 0, zoom: 1 });
		canvasEventBus.emit('nodes:select', { ids: [node.id], panIntoView: true });
		await waitFor(() => expect(getViewport()).toEqual({ x: 1100, y: 600, zoom: 1 }));
	});

	it('should not emit `update:node:name` event if long key press', async () => {
		vi.useFakeTimers();

		const nodes = [createCanvasNodeElement()];
		const { container, emitted } = renderComponent({
			props: {
				nodes,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		const node = container.querySelector(`[data-id="${nodes[0].id}"]`) as Element;

		const { addSelectedNodes, nodes: graphNodes } = useVueFlow({ id: canvasId });
		addSelectedNodes(graphNodes.value);

		await waitFor(() => expect(container.querySelector('.selected')).toBeInTheDocument());

		await fireEvent.keyDown(node, { key: ' ', view: window });
		await vi.advanceTimersByTimeAsync(1000);
		await fireEvent.keyUp(node, { key: ' ', view: window });

		expect(emitted()['update:node:name']).toBeUndefined();
	});

	describe('minimap', () => {
		const minimapVisibilityDelay = 1000;
		const minimapTransitionDuration = 300;

		it('should show minimap for 1sec after panning', async () => {
			vi.useFakeTimers();

			const nodes = [createCanvasNodeElement()];
			const { getByTestId, container } = renderComponent({
				props: {
					nodes,
				},
			});

			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

			const canvas = getByTestId('canvas');
			const pane = canvas.querySelector('.vue-flow__pane');
			if (!pane) throw new Error('VueFlow pane not found');

			await fireEvent.keyDown(pane, { view: window, key: ' ' });
			await fireEvent.mouseDown(pane, { view: window });
			await fireEvent.mouseMove(pane, {
				view: window,
				clientX: 100,
				clientY: 100,
			});
			await fireEvent.mouseUp(pane, { view: window });
			await fireEvent.keyUp(pane, { view: window, key: ' ' });

			vi.advanceTimersByTime(minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).toBeVisible());
			vi.advanceTimersByTime(minimapVisibilityDelay + minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).not.toBeVisible());
		});

		it('should keep minimap visible when hovered', async () => {
			vi.useFakeTimers();

			const nodes = [createCanvasNodeElement()];
			const { getByTestId, container } = renderComponent({
				props: {
					nodes,
				},
			});

			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

			const canvas = getByTestId('canvas');
			const pane = canvas.querySelector('.vue-flow__pane');
			if (!pane) throw new Error('VueFlow pane not found');

			await fireEvent.keyDown(pane, { view: window, key: ' ' });
			await fireEvent.mouseDown(pane, { view: window });
			await fireEvent.mouseMove(pane, {
				view: window,
				clientX: 100,
				clientY: 100,
			});
			await fireEvent.mouseUp(pane, { view: window });
			await fireEvent.keyUp(pane, { view: window, key: ' ' });

			vi.advanceTimersByTime(minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).toBeVisible());

			await fireEvent.mouseEnter(getByTestId('canvas-minimap'));
			vi.advanceTimersByTime(minimapVisibilityDelay + minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).toBeVisible());

			await fireEvent.mouseLeave(getByTestId('canvas-minimap'));
			vi.advanceTimersByTime(minimapVisibilityDelay + minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).not.toBeVisible());
		});
	});

	describe('background', () => {
		it('should render default background', () => {
			const { container } = renderComponent();
			const patternCanvas = container.querySelector('#pattern-canvas');
			expect(patternCanvas).toBeInTheDocument();
			expect(patternCanvas?.innerHTML).toContain('<circle');
			expect(patternCanvas?.innerHTML).not.toContain('<path');
		});

		it('should render striped background', () => {
			const { container } = renderComponent({ props: { readOnly: true } });
			const patternCanvas = container.querySelector('#pattern-canvas');
			expect(patternCanvas).toBeInTheDocument();
			expect(patternCanvas?.innerHTML).toContain('<path');
			expect(patternCanvas?.innerHTML).not.toContain('<circle');
		});

		it('should render default background in read-only mode when striped background is disabled', () => {
			const { container } = renderComponent({
				props: { readOnly: true, stripedBackground: false },
			});
			const patternCanvas = container.querySelector('#pattern-canvas');
			expect(patternCanvas).toBeInTheDocument();
			expect(patternCanvas?.innerHTML).toContain('<circle');
			expect(patternCanvas?.innerHTML).not.toContain('<path');
		});
	});

	describe('simulate', () => {
		it('should render simulate node', async () => {
			const nodes = [
				createCanvasNodeElement({
					id: '1',
					label: 'Node',
					position: { x: 200, y: 200 },
					data: {
						type: SIMULATE_NODE_TYPE,
						typeVersion: 1,
					},
				}),
			];

			const { container } = renderComponent({
				props: {
					nodes,
				},
			});

			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

			expect(container.querySelector('.icon')).toBeInTheDocument();
		});
	});

	describe('hideControls prop', () => {
		it('should not render CanvasControlButtons when hideControls is true', () => {
			const { queryByTestId } = renderComponent({
				props: {
					hideControls: true,
				},
			});

			expect(queryByTestId('canvas-controls')).not.toBeInTheDocument();
		});
	});

	describe('delete / backspace on group title bar', () => {
		beforeEach(() => {
			vi.spyOn(usePostHog(), 'isFeatureEnabled').mockImplementation(
				(name) => name === CANVAS_NODES_GROUPING_EXPERIMENT.name,
			);
		});

		it("deletes a collapsed group's member nodes when backspace is pressed with a group title bar selected", async () => {
			const group = workflowDocumentStore.createGroup([], 'My Group');
			const groupNode = createCanvasGroupElement({
				id: group.id,
				name: group.name,
				nodeIds: ['a', 'b'],
			});

			const { container, emitted } = renderComponent({
				props: { nodes: [groupNode] },
			});

			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

			const { addSelectedNodes, nodes: graphNodes } = useVueFlow({ id: canvasId });
			addSelectedNodes(graphNodes.value);

			await fireEvent.keyDown(document, { key: 'Backspace' });
			await fireEvent.keyUp(document, { key: 'Backspace' });

			expect(emitted()['delete:nodes']?.[0]).toEqual([['a', 'b']]);
		});
	});

	describe('node group telemetry', () => {
		beforeEach(() => {
			localStorage.clear();
			vi.spyOn(usePostHog(), 'isFeatureEnabled').mockImplementation(
				(name) => name === CANVAS_NODES_GROUPING_EXPERIMENT.name,
			);
		});

		function buildNodeGroupView() {
			return useCanvasNodeGroupView({
				workflowId: () => 'wf-test',
				getCurrentGroupIds: () => workflowDocumentStore.allGroups.map((group) => group.id),
				onNodeGroupsChange: workflowDocumentStore.onNodeGroupsChange,
				isGroupingEnabled: () => true,
				forceAllGroupsExpanded: () => false,
			});
		}

		it('tracks an ungroup with the group-toolbar source when the ungroup button is clicked', async () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const groupNode = createCanvasGroupElement({
				id: group.id,
				name: group.name,
				nodeIds: ['a', 'b'],
			});

			const { getByTestId } = renderComponent({ props: { nodes: [groupNode] } });

			await waitFor(() => expect(getByTestId('canvas-node-group-ungroup')).toBeInTheDocument());
			await fireEvent.click(getByTestId('canvas-node-group-ungroup'));

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User ungrouped nodes',
				expect.objectContaining({
					group_id: group.id,
					group_title: 'My Group',
					node_ids: ['a', 'b'],
					node_count: 2,
					source: 'group-toolbar',
				}),
			);
		});

		it('tracks an expand when a collapsed group is toggled open', async () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const nodeGroupView = buildNodeGroupView();
			const groupNode = createCanvasGroupElement({ id: group.id, name: group.name });

			const { getByTestId } = renderComponent({
				props: { nodes: [groupNode] },
				global: { provide: { [NodeGroupViewKey as symbol]: nodeGroupView } },
			});

			await waitFor(() => expect(getByTestId('canvas-node-group-toggle')).toBeInTheDocument());
			await fireEvent.click(getByTestId('canvas-node-group-toggle'));

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User expanded group',
				expect.objectContaining({ group_id: group.id, source: 'group-toolbar' }),
			);
		});

		it('tracks a collapse when an expanded group is toggled shut', async () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const nodeGroupView = buildNodeGroupView();
			nodeGroupView.toggleCollapsed(group.id); // start expanded
			const groupNode = createCanvasGroupElement({ id: group.id, name: group.name });

			const { getByTestId } = renderComponent({
				props: { nodes: [groupNode] },
				global: { provide: { [NodeGroupViewKey as symbol]: nodeGroupView } },
			});

			await waitFor(() => expect(getByTestId('canvas-node-group-toggle')).toBeInTheDocument());
			await fireEvent.click(getByTestId('canvas-node-group-toggle'));

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User collapsed group',
				expect.objectContaining({ group_id: group.id, source: 'group-toolbar' }),
			);
		});
	});
});

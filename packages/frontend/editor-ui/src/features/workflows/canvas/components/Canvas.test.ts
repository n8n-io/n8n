// @vitest-environment jsdom
import { createEvent, fireEvent, waitFor, within } from '@testing-library/vue';
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
import { SIMULATE_NODE_TYPE } from '@/app/constants';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { createEventBus } from '@n8n/utils/event-bus';
import { GROUP_PADDING_Y_BOTTOM, GROUP_PADDING_Y_TOP } from '../stores/canvasNodeGroups.constants';
import { computeGroupFrameRects } from '../composables/useCanvasMapping.groups';
import {
	NodeGroupViewKey,
	useCanvasNodeGroupView,
	type CanvasNodeGroupView,
} from '../composables/useCanvasNodeGroupView';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useContextMenu } from '@/features/shared/contextMenu/composables/useContextMenu';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestNode } from '@/__tests__/mocks';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useAgentNodeCanvasGeometryStore } from '@/features/agents/agentNodeCanvasGeometry.store';

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
const { messagePrompt } = vi.hoisted(() => ({ messagePrompt: vi.fn() }));
const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }));
const { isSelectionExtractableMock } = vi.hoisted(() => ({
	isSelectionExtractableMock: vi.fn(() => ({ valid: false })),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ prompt: messagePrompt }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showToast }),
}));

// Extraction validity needs node types and connections that the jsdom setup
// doesn't provide — mock only this check, keeping grouping validation real.
vi.mock('@/app/composables/useSelectionValidation', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/composables/useSelectionValidation')>();
	return {
		...actual,
		useSelectionValidation: () => ({
			...actual.useSelectionValidation(),
			isSelectionExtractable: isSelectionExtractableMock,
		}),
	};
});

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
	id = 'g1',
	nodesRect = { x: 0, y: 0, width: 300, height: 100 },
	selectable = true,
	nodeIds = ['node-1'],
	position = { x: 0, y: 0 },
	isCollapsed = false,
}: {
	id?: string;
	nodesRect?: NonNullable<CanvasGroupNode['data']>['nodesRect'];
	selectable?: boolean;
	nodeIds?: string[];
	position?: { x: number; y: number };
	isCollapsed?: boolean;
} = {}): CanvasGroupNode {
	return {
		id: `group:${id}`,
		type: CANVAS_NODE_GROUP_TYPE,
		position,
		width: 300,
		height: 40,
		selectable,
		data: {
			group: { id, name: `Group ${id}`, nodeIds },
			nodesRect,
			isCollapsed,
		},
	};
}

function getSelectionRing(container: Element) {
	return container.querySelector('[data-test-id="canvas-node-group-selection-ring"]');
}

function createNodeGroupViewMock(initialCollapsed: boolean) {
	const collapsedByGroupId = new Map<string, boolean>();
	return {
		isGroupCollapsed: (id: string) => collapsedByGroupId.get(id) ?? initialCollapsed,
		toggleCollapsed: (id: string) => {
			collapsedByGroupId.set(id, !(collapsedByGroupId.get(id) ?? initialCollapsed));
		},
		getVisualOffsetForNode: () => ({ x: 0, y: 0 }),
		getVisualOffsetForComponent: () => ({ x: 0, y: 0 }),
		syncLayoutComponents: () => {},
		settleManualNodePositions: (events: unknown) => events,
		commitMovedPushSourceEffects: () => [],
	} as unknown as CanvasNodeGroupView;
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

	it('should include group title bars in select all', async () => {
		const node = createCanvasNodeElement({ id: 'node-1' });
		const groupNode = createCanvasGroupNode();
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

	it('should clear selected members but keep the title bar selected when their group is collapsed', async () => {
		workflowDocumentStore.setNodeGroups([{ id: 'g1', name: 'Group 1', nodeIds: ['node-1'] }]);

		const nodeGroupView = createNodeGroupViewMock(false);

		const node = createCanvasNodeElement({ id: 'node-1' });
		const groupNode = createCanvasGroupNode();
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
		expect(getSelectedNodes.value.map(({ id }) => id)).toContain('group:g1');
	});

	it('should select the group node when a collapsed group member is selected', async () => {
		workflowDocumentStore.setNodeGroups([{ id: 'g1', name: 'Group 1', nodeIds: ['node-1'] }]);

		const nodeGroupView = createNodeGroupViewMock(true);

		const node = createCanvasNodeElement({ id: 'node-1' });
		const groupNode = createCanvasGroupNode();
		const eventBus = createEventBus<CanvasEventBusEvents>();

		const { container } = renderComponent({
			props: { nodes: [node, groupNode], eventBus },
			global: { provide: { [NodeGroupViewKey as symbol]: nodeGroupView } },
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		const { getSelectedNodes } = useVueFlow(canvasId);
		eventBus.emit('nodes:select', { ids: ['node-1'] });

		await waitFor(() => expect(getSelectedNodes.value.map(({ id }) => id)).toEqual(['group:g1']));
	});

	describe('group header click model', () => {
		const setupGroup = async ({ collapsed = false } = {}) => {
			workflowDocumentStore.setNodeGroups([{ id: 'g1', name: 'Group 1', nodeIds: ['node-1'] }]);
			const nodeGroupView = createNodeGroupViewMock(collapsed);
			const rendered = renderComponent({
				props: {
					nodes: [
						createCanvasNodeElement({ id: 'node-1' }),
						createCanvasGroupNode({ isCollapsed: collapsed }),
					],
				},
				global: { provide: { [NodeGroupViewKey as symbol]: nodeGroupView } },
			});

			await waitFor(() =>
				expect(rendered.container.querySelectorAll('.vue-flow__node')).toHaveLength(2),
			);

			return { ...rendered, nodeGroupView, vueFlow: useVueFlow(canvasId) };
		};

		it('selects the title bar and toggles collapse on a plain header click', async () => {
			const { getByTestId, nodeGroupView, vueFlow } = await setupGroup();

			await fireEvent.click(getByTestId('canvas-node-group-header'));

			await waitFor(() => expect(nodeGroupView.isGroupCollapsed('g1')).toBe(true));
			// Staying selected pairs the click with Space-to-rename, like nodes.
			expect(vueFlow.getSelectedNodes.value.map(({ id }) => id)).toContain('group:g1');
		});

		it('expands and selects the whole group when a collapsed header is clicked', async () => {
			const { getByTestId, nodeGroupView, vueFlow } = await setupGroup({ collapsed: true });

			await fireEvent.click(getByTestId('canvas-node-group-header'));

			await waitFor(() => expect(nodeGroupView.isGroupCollapsed('g1')).toBe(false));
			// Expanding extends the title bar's selection to its members.
			await waitFor(() =>
				expect(vueFlow.getSelectedNodes.value.map(({ id }) => id)).toEqual(
					expect.arrayContaining(['group:g1', 'node-1']),
				),
			);
		});

		// event.timeStamp is a readonly getter, so fireEvent can't set it
		// through the event init — shadow it on the instance instead.
		const clickHeaderAt = async (header: HTMLElement, timeStamp: number, detail = 1) => {
			await fireEvent.pointerDown(header);
			const click = createEvent.click(header, { detail });
			Object.defineProperty(click, 'timeStamp', { value: timeStamp });
			await fireEvent(header, click);
		};

		it('toggles only once when a double-click delivers two header clicks', async () => {
			const { getByTestId, nodeGroupView, vueFlow } = await setupGroup();

			const header = getByTestId('canvas-node-group-header');
			// A browser double-click fires two full click gestures in rapid
			// succession with an increasing detail count, then a dblclick.
			await clickHeaderAt(header, 1000, 1);
			await clickHeaderAt(header, 1100, 2);
			await fireEvent.dblClick(header);

			// A second toggle would expand the group right back.
			await waitFor(() => expect(nodeGroupView.isGroupCollapsed('g1')).toBe(true));
			expect(useTelemetry().track).not.toHaveBeenCalledWith(
				'User expanded group',
				expect.anything(),
			);
			expect(vueFlow.getSelectedNodes.value.map(({ id }) => id)).toContain('group:g1');
		});

		it('treats a fast re-click past the double-click window as a second toggle', async () => {
			const { getByTestId, nodeGroupView } = await setupGroup();

			const header = getByTestId('canvas-node-group-header');
			// Two deliberate clicks: past the suppression window, so each is a
			// separate click sequence (detail resets to 1) and both toggle.
			await clickHeaderAt(header, 1000);
			await waitFor(() => expect(nodeGroupView.isGroupCollapsed('g1')).toBe(true));
			await clickHeaderAt(header, 1400);

			await waitFor(() => expect(nodeGroupView.isGroupCollapsed('g1')).toBe(false));
			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User expanded group',
				expect.objectContaining({ source: 'group-header' }),
			);
		});

		it('selects the title bar without toggling on a modifier click', async () => {
			const { getByTestId, nodeGroupView, vueFlow } = await setupGroup();

			await fireEvent.click(getByTestId('canvas-node-group-header'), { metaKey: true });

			await waitFor(() =>
				expect(vueFlow.getSelectedNodes.value.map(({ id }) => id)).toContain('group:g1'),
			);
			expect(nodeGroupView.isGroupCollapsed('g1')).toBe(false);
		});

		it('neither toggles nor selects when the rename field is clicked', async () => {
			const { getByTestId, nodeGroupView, vueFlow } = await setupGroup();

			const title = within(getByTestId('canvas-node-group-title'));
			await fireEvent.click(title.getByTestId('inline-edit-preview'));

			expect(nodeGroupView.isGroupCollapsed('g1')).toBe(false);
			expect(vueFlow.getSelectedNodes.value).toHaveLength(0);
		});

		it('toggles a collapsed group when its title text is clicked', async () => {
			// Collapsed groups have no inline rename: the title is part of the
			// plain header surface, so clicking it toggles like the rest.
			const { getByTestId, nodeGroupView } = await setupGroup({ collapsed: true });

			await fireEvent.click(getByTestId('canvas-node-group-collapsed-title'));

			await waitFor(() => expect(nodeGroupView.isGroupCollapsed('g1')).toBe(false));
		});

		it('keeps a multi-selected group selected when a plain header click toggles it', async () => {
			workflowDocumentStore.setNodeGroups([
				{ id: 'g1', name: 'Group 1', nodeIds: ['node-1'] },
				{ id: 'g2', name: 'Group 2', nodeIds: ['node-2'] },
			]);
			const nodeGroupView = createNodeGroupViewMock(false);
			const { container } = renderComponent({
				props: {
					nodes: [
						createCanvasNodeElement({ id: 'node-1' }),
						createCanvasNodeElement({ id: 'node-2', position: { x: 400, y: 0 } }),
						createCanvasGroupNode({ id: 'g1' }),
						createCanvasGroupNode({ id: 'g2', nodeIds: ['node-2'], position: { x: 400, y: 0 } }),
					],
				},
				global: { provide: { [NodeGroupViewKey as symbol]: nodeGroupView } },
			});

			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(4));

			// Both title bars selected, as with cmd+click.
			const vueFlow = useVueFlow(canvasId);
			vueFlow.addSelectedNodes([vueFlow.findNode('group:g1')!, vueFlow.findNode('group:g2')!]);
			await waitFor(() =>
				expect(vueFlow.getSelectedNodes.value.map(({ id }) => id)).toEqual(
					expect.arrayContaining(['group:g1', 'group:g2']),
				),
			);

			const header = container.querySelector<HTMLElement>(
				'[data-id="group:g1"] [data-test-id="canvas-node-group-header"]',
			)!;
			// Pointerdown precedes the click, as in a real browser gesture.
			await fireEvent.pointerDown(header);
			await fireEvent.click(header);

			await waitFor(() => expect(nodeGroupView.isGroupCollapsed('g1')).toBe(true));
			expect(vueFlow.getSelectedNodes.value.map(({ id }) => id)).toEqual(
				expect.arrayContaining(['group:g1', 'group:g2']),
			);
		});
	});

	describe('group rename via Space', () => {
		beforeEach(() => {
			messagePrompt.mockReset();
		});

		const setupSelectedGroup = async ({ collapsed }: { collapsed: boolean }) => {
			workflowDocumentStore.setScopes(['workflow:update']);
			vi.spyOn(useUIStore(), 'isReadOnlyView', 'get').mockReturnValue(false);
			workflowDocumentStore.setNodes([
				createTestNode({ id: 'a', name: 'Node A' }),
				createTestNode({ id: 'b', name: 'Node B' }),
			]);
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const groupNode = createCanvasGroupElement({
				id: group.id,
				name: group.name,
				nodeIds: ['a', 'b'],
				isCollapsed: collapsed,
			});
			const rendered = renderComponent({
				props: { nodes: [groupNode] },
				global: {
					provide: { [NodeGroupViewKey as symbol]: createNodeGroupViewMock(collapsed) },
				},
			});
			await waitFor(() => expect(rendered.getByTestId('canvas-node-group')).toBeInTheDocument());

			const vueFlow = useVueFlow(canvasId);
			const graphNode = vueFlow.findNode(groupNode.id)!;
			// jsdom never measures the node, but the title bar waits for VueFlow
			// dimensions before autofocusing the inline editor.
			Object.assign(graphNode.dimensions, { width: 300, height: 40 });
			vueFlow.addSelectedNodes([graphNode]);
			await waitFor(() => expect(vueFlow.findNode(groupNode.id)?.selected).toBe(true));

			return { group, groupNode, ...rendered };
		};

		const pressSpace = async () => {
			await fireEvent.keyDown(document, { key: ' ', view: window });
			await fireEvent.keyUp(document, { key: ' ', view: window });
		};

		it('renames a collapsed group through the prompt on Space', async () => {
			messagePrompt.mockResolvedValue({ action: 'confirm', value: 'Better name' });
			const { group } = await setupSelectedGroup({ collapsed: true });

			await pressSpace();

			await waitFor(() =>
				expect(workflowDocumentStore.getGroupById(group.id)?.name).toBe('Better name'),
			);
			expect(messagePrompt).toHaveBeenCalledTimes(1);
		});

		it('keeps the name when the prompt is dismissed', async () => {
			messagePrompt.mockResolvedValue({ action: 'cancel', value: 'Ignored' });
			const { group } = await setupSelectedGroup({ collapsed: true });

			await pressSpace();

			await waitFor(() => expect(messagePrompt).toHaveBeenCalledTimes(1));
			expect(workflowDocumentStore.getGroupById(group.id)?.name).toBe('My Group');
		});

		it('focuses the inline title editor instead of the prompt for an expanded group', async () => {
			const { getByTestId } = await setupSelectedGroup({ collapsed: false });

			await pressSpace();

			const title = within(getByTestId('canvas-node-group-title'));
			await waitFor(() => expect(title.getByTestId('inline-edit-input')).toBeInTheDocument());
			expect(messagePrompt).not.toHaveBeenCalled();
		});

		it('renames the group, not a member node, when the whole group is selected', async () => {
			// Clicking a collapsed header expands the group and selects the title
			// bar plus its members — Space must then target the group.
			workflowDocumentStore.setScopes(['workflow:update']);
			workflowDocumentStore.setNodes([
				createTestNode({ id: 'a', name: 'Node A' }),
				createTestNode({ id: 'b', name: 'Node B' }),
			]);
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const groupNode = createCanvasGroupElement({
				id: group.id,
				name: group.name,
				nodeIds: ['a', 'b'],
				isCollapsed: false,
			});
			const rendered = renderComponent({
				props: {
					nodes: [
						groupNode,
						createCanvasNodeElement({ id: 'a', position: { x: 40, y: 40 } }),
						createCanvasNodeElement({ id: 'b', position: { x: 200, y: 40 } }),
					],
				},
				global: {
					provide: { [NodeGroupViewKey as symbol]: createNodeGroupViewMock(false) },
				},
			});
			await waitFor(() => expect(rendered.getByTestId('canvas-node-group')).toBeInTheDocument());

			const vueFlow = useVueFlow(canvasId);
			const graphNode = vueFlow.findNode(groupNode.id)!;
			Object.assign(graphNode.dimensions, { width: 300, height: 40 });
			vueFlow.addSelectedNodes([graphNode, vueFlow.findNode('a')!, vueFlow.findNode('b')!]);
			await waitFor(() => expect(vueFlow.getSelectedNodes.value).toHaveLength(3));

			await pressSpace();

			const title = within(rendered.getByTestId('canvas-node-group-title'));
			await waitFor(() => expect(title.getByTestId('inline-edit-input')).toBeInTheDocument());
			expect(rendered.emitted()['update:node:name']).toBeUndefined();
			expect(messagePrompt).not.toHaveBeenCalled();
		});

		it('flags duplicate group names inline in the prompt', async () => {
			messagePrompt.mockResolvedValue({ action: 'cancel', value: '' });
			const { group } = await setupSelectedGroup({ collapsed: true });
			// Another group whose name the rename could collide with.
			workflowDocumentStore.createGroup(['x'], 'Taken');

			await pressSpace();

			await waitFor(() => expect(messagePrompt).toHaveBeenCalledTimes(1));
			const options = messagePrompt.mock.calls[0][2] as {
				inputValidator: (value: string) => string | true;
			};
			expect(options.inputValidator('Taken')).toBe('A group with this name already exists');
			expect(options.inputValidator('  Taken  ')).toBe('A group with this name already exists');
			// Keeping the current name and picking a fresh one stay valid.
			expect(options.inputValidator(group.name)).toBe(true);
			expect(options.inputValidator('Fresh name')).toBe(true);
			expect(options.inputValidator('   ')).toBe('Invalid Name');
		});

		it('opens the prompt from the context menu rename on a collapsed group', async () => {
			messagePrompt.mockResolvedValue({ action: 'confirm', value: 'Menu name' });
			const { group, getByTestId } = await setupSelectedGroup({ collapsed: true });

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));
			await waitFor(() =>
				expect(getByTestId('context-menu-item-rename_group')).toBeInTheDocument(),
			);
			await fireEvent.click(getByTestId('context-menu-item-rename_group'));

			await waitFor(() =>
				expect(workflowDocumentStore.getGroupById(group.id)?.name).toBe('Menu name'),
			);
		});
	});

	describe('inline group rename', () => {
		const setupExpandedGroup = async () => {
			workflowDocumentStore.setScopes(['workflow:update']);
			vi.spyOn(useUIStore(), 'isReadOnlyView', 'get').mockReturnValue(false);
			workflowDocumentStore.setNodes([
				createTestNode({ id: 'a', name: 'Node A' }),
				createTestNode({ id: 'b', name: 'Node B' }),
			]);
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const groupNode = createCanvasGroupElement({
				id: group.id,
				name: group.name,
				nodeIds: ['a', 'b'],
				isCollapsed: false,
			});
			const rendered = renderComponent({
				props: { nodes: [groupNode] },
				global: {
					provide: { [NodeGroupViewKey as symbol]: createNodeGroupViewMock(false) },
				},
			});
			await waitFor(() => expect(rendered.getByTestId('canvas-node-group')).toBeInTheDocument());

			// jsdom never measures the node, but the title bar waits for VueFlow
			// dimensions before autofocusing the inline editor. Replace (not
			// mutate) the object so the reactive dimensions prop updates.
			const vueFlow = useVueFlow(canvasId);
			const graphNode = vueFlow.findNode(groupNode.id)!;
			graphNode.dimensions = { width: 300, height: 40 };

			return { group, ...rendered };
		};

		const commitInlineRename = async (
			rendered: Awaited<ReturnType<typeof setupExpandedGroup>>,
			name: string,
		) => {
			const title = within(rendered.getByTestId('canvas-node-group-title'));
			await fireEvent.click(title.getByTestId('inline-edit-preview'));
			const input = title.getByTestId('inline-edit-input') as HTMLInputElement;
			await fireEvent.update(input, name);
			await fireEvent.keyDown(input, { key: 'Enter' });
			return input;
		};

		it("rejects an inline rename to another group's name", async () => {
			const rendered = await setupExpandedGroup();
			// Another group whose name the rename could collide with.
			workflowDocumentStore.createGroup(['x'], 'Taken');

			const input = await commitInlineRename(rendered, 'Taken');

			expect(showToast).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'error',
					title: 'Group not renamed',
					message: 'A group with this name already exists',
				}),
			);
			// Neither renamed nor silently uniquified.
			expect(workflowDocumentStore.getGroupById(rendered.group.id)?.name).toBe('My Group');
			// The editor re-opens (data-focused mirrors reka's edit mode, which a
			// plain commit exits — see the fresh-name test) holding the rejected
			// value so the user can correct it.
			const title = within(rendered.getByTestId('canvas-node-group-title'));
			await waitFor(() =>
				expect(title.getByTestId('inline-editable-area')).toHaveAttribute('data-focused'),
			);
			expect(input).toHaveValue('Taken');
			expect(input).toHaveFocus();
		});

		it('applies an inline rename to a fresh name without a toast', async () => {
			const rendered = await setupExpandedGroup();

			await commitInlineRename(rendered, 'Fresh name');

			await waitFor(() =>
				expect(workflowDocumentStore.getGroupById(rendered.group.id)?.name).toBe('Fresh name'),
			);
			expect(showToast).not.toHaveBeenCalled();
			// A successful commit leaves edit mode.
			const title = within(rendered.getByTestId('canvas-node-group-title'));
			expect(title.getByTestId('inline-editable-area')).not.toHaveAttribute('data-focused');
		});
	});

	describe('group toolbar extract and selection toolbar suppression', () => {
		beforeEach(() => {
			isSelectionExtractableMock.mockImplementation(() => ({ valid: true }));
		});

		afterEach(() => {
			isSelectionExtractableMock.mockImplementation(() => ({ valid: false }));
		});

		const setupExpandedGroupWithLooseNodes = async () => {
			workflowDocumentStore.setScopes(['workflow:update']);
			vi.spyOn(useUIStore(), 'isReadOnlyView', 'get').mockReturnValue(false);
			workflowDocumentStore.setNodes([
				createTestNode({ id: 'a', name: 'Node A' }),
				createTestNode({ id: 'b', name: 'Node B' }),
				createTestNode({ id: 'c', name: 'Node C' }),
				createTestNode({ id: 'd', name: 'Node D' }),
			]);
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const groupNode = createCanvasGroupElement({
				id: group.id,
				name: group.name,
				nodeIds: ['a', 'b'],
				isCollapsed: false,
			});
			const rendered = renderComponent({
				props: {
					nodes: [
						groupNode,
						createCanvasNodeElement({ id: 'a', position: { x: 40, y: 40 } }),
						createCanvasNodeElement({ id: 'b', position: { x: 200, y: 40 } }),
						createCanvasNodeElement({ id: 'c', position: { x: 400, y: 300 } }),
						createCanvasNodeElement({ id: 'd', position: { x: 600, y: 300 } }),
					],
				},
				global: {
					provide: { [NodeGroupViewKey as symbol]: createNodeGroupViewMock(false) },
				},
			});
			await waitFor(() => expect(rendered.getByTestId('canvas-node-group')).toBeInTheDocument());
			return { group, groupNode, ...rendered };
		};

		it('hides the selection toolbar when the selection is exactly one group', async () => {
			const { groupNode, queryByTestId } = await setupExpandedGroupWithLooseNodes();
			const vueFlow = useVueFlow(canvasId);

			// Control: an extractable multi-node selection outside the group
			// shows the selection toolbar.
			vueFlow.addSelectedNodes([vueFlow.findNode('c')!, vueFlow.findNode('d')!]);
			await waitFor(() => expect(queryByTestId('canvas-selection-toolbar')).toBeInTheDocument());

			// The group as a unit (title bar plus only its members) acts through
			// the group's own toolbar instead.
			vueFlow.removeSelectedNodes(vueFlow.getSelectedNodes.value);
			vueFlow.addSelectedNodes([
				vueFlow.findNode(groupNode.id)!,
				vueFlow.findNode('a')!,
				vueFlow.findNode('b')!,
			]);
			await waitFor(() => expect(queryByTestId('canvas-selection-toolbar')).toBeNull());
		});

		it('emits extract-workflow with the member ids from the group toolbar convert button', async () => {
			const rendered = await setupExpandedGroupWithLooseNodes();

			await waitFor(() =>
				expect(rendered.getByTestId('canvas-node-group-extract')).toBeInTheDocument(),
			);
			await fireEvent.click(rendered.getByTestId('canvas-node-group-extract'));

			expect(rendered.emitted()['extract-workflow']).toEqual([[['a', 'b']]]);
		});

		it('hides the convert button when the group is not extractable', async () => {
			isSelectionExtractableMock.mockImplementation(() => ({ valid: false }));
			const rendered = await setupExpandedGroupWithLooseNodes();

			expect(rendered.queryByTestId('canvas-node-group-extract')).toBeNull();
		});
	});

	describe('expanded group selection', () => {
		const setupExpandedGroup = async (initialCollapsed = false) => {
			workflowDocumentStore.setNodeGroups([
				{ id: 'g1', name: 'Group 1', nodeIds: ['node-1', 'node-2'] },
			]);

			const nodeGroupView = createNodeGroupViewMock(initialCollapsed);
			const nodes = [
				createCanvasNodeElement({ id: 'node-1', label: 'Node 1' }),
				createCanvasNodeElement({ id: 'node-2', label: 'Node 2', position: { x: 200, y: 0 } }),
				createCanvasGroupNode({ nodeIds: ['node-1', 'node-2'] }),
			];

			const rendered = renderComponent({
				props: { nodes },
				global: { provide: { [NodeGroupViewKey as symbol]: nodeGroupView } },
			});

			await waitFor(() =>
				expect(rendered.container.querySelectorAll('.vue-flow__node')).toHaveLength(3),
			);

			return { ...rendered, vueFlow: useVueFlow(canvasId) };
		};

		const selectedIds = (vueFlow: ReturnType<typeof useVueFlow>) =>
			vueFlow.getSelectedNodes.value.map(({ id }) => id).sort();

		it('selects all members when the title bar is selected', async () => {
			const { vueFlow } = await setupExpandedGroup();
			const groupNode = vueFlow.findNode('group:g1');

			vueFlow.addSelectedNodes([groupNode!]);

			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['group:g1', 'node-1', 'node-2']));
		});

		it('selects the title bar when all members are selected', async () => {
			const { vueFlow } = await setupExpandedGroup();

			vueFlow.addSelectedNodes([vueFlow.findNode('node-1')!, vueFlow.findNode('node-2')!]);

			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['group:g1', 'node-1', 'node-2']));
		});

		it('deselects the title bar when a member leaves a full selection', async () => {
			const { vueFlow } = await setupExpandedGroup();

			vueFlow.addSelectedNodes([vueFlow.findNode('group:g1')!]);
			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['group:g1', 'node-1', 'node-2']));

			vueFlow.removeSelectedNodes([vueFlow.findNode('node-1')!]);

			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['node-2']));
		});

		it('deselects the members when the title bar leaves a full selection', async () => {
			const { vueFlow } = await setupExpandedGroup();

			vueFlow.addSelectedNodes([vueFlow.findNode('group:g1')!]);
			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['group:g1', 'node-1', 'node-2']));

			vueFlow.removeSelectedNodes([vueFlow.findNode('group:g1')!]);

			await waitFor(() => expect(selectedIds(vueFlow)).toEqual([]));
		});

		it('keeps partial member selections without selecting the title bar', async () => {
			const { vueFlow } = await setupExpandedGroup();

			vueFlow.addSelectedNodes([vueFlow.findNode('node-1')!]);

			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['node-1']));
		});

		it('extends the selection to members when a selected group is expanded', async () => {
			const { vueFlow, getByTestId } = await setupExpandedGroup(true);

			vueFlow.addSelectedNodes([vueFlow.findNode('group:g1')!]);
			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['group:g1']));

			await fireEvent.click(getByTestId('canvas-node-group-toggle'));

			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['group:g1', 'node-1', 'node-2']));
		});

		it('hides member selection rings while the whole group is selected', async () => {
			const { vueFlow, container } = await setupExpandedGroup();

			vueFlow.addSelectedNodes([vueFlow.findNode('group:g1')!]);
			await waitFor(() => expect(selectedIds(vueFlow)).toEqual(['group:g1', 'node-1', 'node-2']));

			// Members carry no individual selection ring; the group surfaces it.
			await waitFor(() => {
				expect(
					container.querySelector('[data-id="node-1"] [data-test-id="canvas-node"]'),
				).not.toHaveClass('selected');
				expect(getSelectionRing(container)).toBeInTheDocument();
			});

			// A partial selection shows individual rings again.
			vueFlow.removeSelectedNodes([vueFlow.findNode('node-1')!]);
			await waitFor(() => {
				expect(
					container.querySelector('[data-id="node-2"] [data-test-id="canvas-node"]'),
				).toHaveClass('selected');
				expect(getSelectionRing(container)).not.toBeInTheDocument();
			});
		});
	});

	describe('selection box', () => {
		const setupGroupAndLooseNode = async (initialCollapsed: boolean) => {
			workflowDocumentStore.setNodeGroups([
				{ id: 'g1', name: 'Group 1', nodeIds: ['node-1', 'node-2'] },
			]);

			const nodes = [
				createCanvasNodeElement({ id: 'node-1', label: 'Node 1' }),
				createCanvasNodeElement({ id: 'node-2', label: 'Node 2', position: { x: 200, y: 0 } }),
				createCanvasNodeElement({ id: 'node-3', label: 'Node 3', position: { x: 800, y: 0 } }),
				createCanvasGroupNode({ nodeIds: ['node-1', 'node-2'] }),
			];

			const rendered = renderComponent({
				props: { nodes },
				global: {
					provide: { [NodeGroupViewKey as symbol]: createNodeGroupViewMock(initialCollapsed) },
				},
			});

			await waitFor(() =>
				expect(rendered.container.querySelectorAll('.vue-flow__node')).toHaveLength(4),
			);

			return { ...rendered, vueFlow: useVueFlow(canvasId) };
		};

		it('keeps the selection box when a collapsed group is selected alongside a node', async () => {
			const { vueFlow } = await setupGroupAndLooseNode(true);

			vueFlow.nodesSelectionActive.value = true;
			vueFlow.addSelectedNodes([vueFlow.findNode('group:g1')!, vueFlow.findNode('node-3')!]);

			await waitFor(() =>
				expect(vueFlow.getSelectedNodes.value.map(({ id }) => id).sort()).toEqual([
					'group:g1',
					'node-3',
				]),
			);
			expect(vueFlow.nodesSelectionActive.value).toBe(true);
		});

		it('drops the selection box when the selection folds into a single group', async () => {
			const { vueFlow } = await setupGroupAndLooseNode(false);

			vueFlow.nodesSelectionActive.value = true;
			vueFlow.addSelectedNodes([vueFlow.findNode('group:g1')!]);

			await waitFor(() => expect(vueFlow.nodesSelectionActive.value).toBe(false));
		});

		it('sizes the selection box to include expanded group frames', async () => {
			const { vueFlow, getByTestId } = await setupGroupAndLooseNode(false);

			vueFlow.addSelectedNodes([vueFlow.findNode('group:g1')!, vueFlow.findNode('node-3')!]);
			await waitFor(() =>
				expect(vueFlow.getSelectedNodes.value.map(({ id }) => id)).toHaveLength(4),
			);

			// The group's data.nodesRect is 300x100 at (0, 0); its expanded frame
			// spans the header plus vertical paddings below the title bar node.
			const { expanded } = computeGroupFrameRects({ x: 0, y: 0, width: 300, height: 100 });

			await waitFor(() => {
				const style = getByTestId('canvas').style;
				expect(style.getPropertyValue('--canvas-selection-box--height')).toBe(
					`${expanded.height}px`,
				);
				// Bounds stretch from the group frame's left edge to the loose node.
				expect(style.getPropertyValue('--canvas-selection-box--left')).toBe('0px');
				expect(style.getPropertyValue('--canvas-selection-box--width')).toBe('800px');
			});
		});
	});

	it('should expand a selected collapsed group to its members when copying', async () => {
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

	it('snaps an agent drag by its measured center', async () => {
		const agent = createTestNode({
			id: 'agent',
			name: 'Agent',
			position: [100, 100],
			type: MESSAGE_AN_AGENT_NODE_TYPE,
			typeVersion: 2,
		});
		workflowDocumentStore.addNode(agent);
		const canvasNode = createCanvasNodeElement({
			id: agent.id,
			position: { x: 100, y: 100 },
			data: { type: agent.type, typeVersion: agent.typeVersion },
		});
		const { container, emitted } = renderComponent({ props: { nodes: [canvasNode] } });

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));
		const graphNode = useVueFlow({ id: canvasId }).findNode(agent.id)!;
		graphNode.dimensions = { width: 320, height: 206 };

		const node = container.querySelector(`[data-id="${agent.id}"]`) as Element;
		await fireEvent.mouseDown(node, { view: window });
		await fireEvent.mouseMove(node, { view: window, clientX: 20, clientY: 20 });
		await fireEvent.mouseMove(node, { view: window, clientX: 40, clientY: 40 });
		await fireEvent.mouseUp(node, { view: window });

		expect(emitted()['update:nodes:position']).toEqual([
			[
				[
					{
						id: agent.id,
						position: { x: 112, y: 105 },
					},
				],
			],
		]);
	});

	it('snaps a selected agent by its measured center when dragging a regular node', async () => {
		const agent = createTestNode({
			id: 'agent',
			name: 'Agent',
			position: [100, 100],
			type: MESSAGE_AN_AGENT_NODE_TYPE,
			typeVersion: 2,
		});
		workflowDocumentStore.addNode(agent);
		const agentCanvasNode = createCanvasNodeElement({
			id: agent.id,
			position: { x: 100, y: 100 },
			data: { type: agent.type, typeVersion: agent.typeVersion },
		});
		const regularCanvasNode = createCanvasNodeElement({
			id: 'regular',
			position: { x: 100, y: 100 },
		});
		const { container, emitted } = renderComponent({
			props: { nodes: [agentCanvasNode, regularCanvasNode] },
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));
		const vueFlow = useVueFlow({ id: canvasId });
		const agentGraphNode = vueFlow.findNode(agent.id)!;
		agentGraphNode.dimensions = { width: 320, height: 206 };
		vueFlow.addSelectedNodes([agentGraphNode, vueFlow.findNode(regularCanvasNode.id)!]);

		const regularNode = container.querySelector(`[data-id="${regularCanvasNode.id}"]`) as Element;
		await fireEvent.mouseDown(regularNode, { view: window });
		await fireEvent.mouseMove(regularNode, { view: window, clientX: 20, clientY: 20 });
		await fireEvent.mouseMove(regularNode, { view: window, clientX: 40, clientY: 40 });
		await fireEvent.mouseUp(regularNode, { view: window });

		expect(emitted()['update:nodes:position']).toEqual([
			[
				[
					{ id: agent.id, position: { x: 112, y: 105 } },
					{ id: regularCanvasNode.id, position: { x: 112, y: 105 } },
				],
			],
		]);
	});

	it('centers a newly added agent when its rendered height is first measured', async () => {
		const agent = createTestNode({
			id: 'agent',
			name: 'Agent',
			position: [112, 112],
			type: MESSAGE_AN_AGENT_NODE_TYPE,
			typeVersion: 2,
		});
		workflowDocumentStore.addNode(agent);
		useAgentNodeCanvasGeometryStore().setPendingCenterY(canvasId, agent.id, 176);

		const { container } = renderComponent({
			props: {
				nodes: [
					createCanvasNodeElement({
						id: agent.id,
						position: { x: 112, y: 112 },
						data: {
							type: agent.type,
							typeVersion: agent.typeVersion,
						},
					}),
				],
			},
		});

		await waitFor(() =>
			expect(container.querySelector(`[data-id="${agent.id}"]`)).toBeInTheDocument(),
		);

		const vueFlow = useVueFlow({ id: canvasId });
		await vueFlow.emits.nodesChange([
			{ id: agent.id, type: 'dimensions', dimensions: { width: 320, height: 224 } },
		]);

		expect(workflowDocumentStore.getNodeById(agent.id)?.position).toEqual([112, 64]);
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

	describe('group selection reconciliation', () => {
		it('folds the selection into the group when one is created around fully selected nodes', async () => {
			workflowDocumentStore.setScopes(['workflow:update']);
			workflowDocumentStore.setNodes([
				createTestNode({ id: 'a', name: 'Node A' }),
				createTestNode({ id: 'b', name: 'Node B' }),
			]);
			const memberA = createCanvasNodeElement({ id: 'a', label: 'Node A' });
			const memberB = createCanvasNodeElement({
				id: 'b',
				label: 'Node B',
				position: { x: 300, y: 100 },
			});
			const rendered = renderComponent({
				props: { nodes: [memberA, memberB] },
				global: {
					provide: { [NodeGroupViewKey as symbol]: createNodeGroupViewMock(false) },
				},
			});
			await waitFor(() =>
				expect(rendered.container.querySelectorAll('.vue-flow__node')).toHaveLength(2),
			);

			const { addSelectedNodes, findNode, getSelectedNodes, nodesSelectionActive } =
				useVueFlow(canvasId);
			addSelectedNodes([findNode('a')!, findNode('b')!]);
			nodesSelectionActive.value = true;
			await waitFor(() => expect(getSelectedNodes.value).toHaveLength(2));

			// The title bar node mounts a pass after the group is created, as in
			// the real mapping flow — without any selection change.
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			await rendered.rerender({
				nodes: [
					createCanvasGroupElement({ id: group.id, name: group.name, nodeIds: ['a', 'b'] }),
					memberA,
					memberB,
				],
			});

			await waitFor(() =>
				expect([...getSelectedNodes.value.map(({ id }) => id)].sort()).toEqual([
					'a',
					'b',
					`group:${group.id}`,
				]),
			);
			// The selection now folds into a single element — the box goes away
			expect(nodesSelectionActive.value).toBe(false);
		});
	});

	describe('group context menu', () => {
		// The context menu state is a module-scoped singleton — reset it so an
		// open menu can't leak into other tests.
		afterEach(() => {
			useContextMenu().close();
		});

		async function renderWithGroup(
			props: { readOnly?: boolean; suppressInteraction?: boolean } = {},
			{
				initialCollapsed = true,
				withMemberElements = false,
			}: { initialCollapsed?: boolean; withMemberElements?: boolean } = {},
		) {
			// The menu items are disabled unless the workflow is editable: these
			// tests run without a router, so isReadOnlyView would resolve to true.
			workflowDocumentStore.setScopes(['workflow:update']);
			vi.spyOn(useUIStore(), 'isReadOnlyView', 'get').mockReturnValue(false);
			// Member nodes must resolve for the group menu to show the bulk actions.
			// The loose node resolves too, so it counts as an ungrouped document
			// node for the groups-only expand/collapse rule.
			workflowDocumentStore.setNodes([
				createTestNode({ id: 'a', name: 'Node A' }),
				createTestNode({ id: 'b', name: 'Node B' }),
				createTestNode({ id: 'node-3', name: 'Node 3' }),
			]);
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const groupNode = createCanvasGroupElement({
				id: group.id,
				name: group.name,
				nodeIds: ['a', 'b'],
			});
			const looseNode = createCanvasNodeElement({
				id: 'node-3',
				label: 'Node 3',
				position: { x: 600, y: 0 },
			});
			// Expanded groups render their members as canvas elements — include
			// them when a test exercises member selection.
			const memberElements = withMemberElements
				? [
						createCanvasNodeElement({ id: 'a', label: 'Node A', position: { x: 40, y: 40 } }),
						createCanvasNodeElement({ id: 'b', label: 'Node B', position: { x: 200, y: 40 } }),
					]
				: [];

			const rendered = renderComponent({
				props: { nodes: [groupNode, looseNode, ...memberElements], ...props },
				global: {
					provide: { [NodeGroupViewKey as symbol]: createNodeGroupViewMock(initialCollapsed) },
				},
			});
			await waitFor(() => expect(rendered.getByTestId('canvas-node-group')).toBeInTheDocument());

			return { group, groupNode, looseNode, ...rendered };
		}

		it('shows the group actions and the bulk actions when right-clicking a group title bar', async () => {
			const { getByTestId } = await renderWithGroup();

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));

			await waitFor(() =>
				expect(getByTestId('context-menu-item-rename_group')).toBeInTheDocument(),
			);
			expect(getByTestId('context-menu-item-rename_group')).not.toHaveAttribute('aria-disabled');
			// Space renames the selected group; the menu advertises the shortcut.
			expect(getByTestId('context-menu-item-rename_group')).toHaveTextContent('Space');
			expect(getByTestId('context-menu-item-ungroup_nodes')).toBeInTheDocument();
			expect(getByTestId('context-menu-item-ungroup_nodes')).not.toHaveAttribute('aria-disabled');
			expect(getByTestId('context-menu-item-copy')).toHaveTextContent('Copy group');
			expect(getByTestId('context-menu-item-delete')).toHaveTextContent('Delete group');
		});

		it('selects the group when right-clicking its title bar', async () => {
			const { group, getByTestId } = await renderWithGroup();

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));

			const { getSelectedNodes } = useVueFlow(canvasId);
			await waitFor(() =>
				expect(getSelectedNodes.value.map(({ id }) => id)).toEqual([`group:${group.id}`]),
			);
		});

		it('keeps the selection when right-clicking the selected expanded group', async () => {
			const { group, getByTestId } = await renderWithGroup(
				{},
				{ initialCollapsed: false, withMemberElements: true },
			);

			// A fully selected expanded group: title bar plus every member
			const { addSelectedNodes, findNode, getSelectedNodes } = useVueFlow(canvasId);
			addSelectedNodes([findNode(`group:${group.id}`)!, findNode('a')!, findNode('b')!]);
			await waitFor(() => expect(getSelectedNodes.value).toHaveLength(3));

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));

			await waitFor(() => expect(useContextMenu().isOpen.value).toBe(true));
			expect(useContextMenu().target.value?.source).toBe('group');
			// Reselecting the group must not round-trip through a state the
			// selection reconciler reads as a title-bar deselect.
			expect(getSelectedNodes.value.map(({ id }) => id).sort()).toEqual([
				'a',
				'b',
				`group:${group.id}`,
			]);
		});

		it('opens the selection menu instead when the group is part of a wider selection', async () => {
			const { groupNode, looseNode, getByTestId } = await renderWithGroup();

			const { addSelectedNodes, findNode } = useVueFlow(canvasId);
			addSelectedNodes([findNode(groupNode.id)!, findNode(looseNode.id)!]);
			await waitFor(() => expect(findNode(groupNode.id)?.selected).toBe(true));

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));

			await waitFor(() => expect(useContextMenu().isOpen.value).toBe(true));
			expect(useContextMenu().target.value?.source).toBe('canvas');
			// The whole selection is targeted: the loose node plus the group members
			expect([...useContextMenu().targetNodeIds.value].sort()).toEqual(['a', 'b', 'node-3']);
		});

		it('copies the group members through the copy action', async () => {
			const { getByTestId, emitted } = await renderWithGroup();

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));
			await waitFor(() => expect(getByTestId('context-menu-item-copy')).toBeInTheDocument());

			await fireEvent.click(getByTestId('context-menu-item-copy'));

			expect(emitted()['copy:nodes']).toEqual([[['a', 'b']]]);
		});

		it('opens the group context menu on a read-only canvas, like node menus, with mutating items disabled', async () => {
			// The workflow itself stays editable (see renderWithGroup) — the
			// canvas prop alone must disable the mutating items, so embedded
			// read-only canvases can't mutate through the menu.
			const { getByTestId } = await renderWithGroup({ readOnly: true });

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));

			await waitFor(() => expect(getByTestId('context-menu-item-copy')).toBeInTheDocument());
			expect(getByTestId('context-menu-item-copy')).not.toHaveAttribute('aria-disabled');
			for (const mutating of ['rename_group', 'ungroup_nodes', 'toggle_activation', 'delete']) {
				expect(getByTestId(`context-menu-item-${mutating}`)).toHaveAttribute(
					'aria-disabled',
					'true',
				);
			}
		});

		it('does not open the group context menu when interaction is suppressed', async () => {
			const { getByTestId, queryByTestId } = await renderWithGroup({ suppressInteraction: true });

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));

			expect(useContextMenu().isOpen.value).toBe(false);
			expect(queryByTestId('context-menu')).not.toBeInTheDocument();
		});

		it('expands all groups from the pane context menu', async () => {
			const { group, container, getByTestId } = await renderWithGroup(
				{},
				{ initialCollapsed: true },
			);

			await fireEvent.contextMenu(container.querySelector('.vue-flow__pane')!);
			await waitFor(() =>
				expect(getByTestId('context-menu-item-expand_all_groups')).toBeInTheDocument(),
			);

			await fireEvent.click(getByTestId('context-menu-item-expand_all_groups'));

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User expanded group',
				expect.objectContaining({ group_id: group.id, source: 'context-menu' }),
			);
		});

		it('collapses all groups from the pane context menu', async () => {
			const { group, container, getByTestId } = await renderWithGroup(
				{},
				{ initialCollapsed: false },
			);

			await fireEvent.contextMenu(container.querySelector('.vue-flow__pane')!);
			await waitFor(() =>
				expect(getByTestId('context-menu-item-collapse_all_groups')).toBeInTheDocument(),
			);

			await fireEvent.click(getByTestId('context-menu-item-collapse_all_groups'));

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User collapsed group',
				expect.objectContaining({ group_id: group.id, source: 'context-menu' }),
			);
		});

		it('expands the targeted group through "Expand selected" in the group menu', async () => {
			const { group, getByTestId } = await renderWithGroup({}, { initialCollapsed: true });

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));
			await waitFor(() =>
				expect(getByTestId('context-menu-item-expand_selected_groups')).toBeInTheDocument(),
			);

			await fireEvent.click(getByTestId('context-menu-item-expand_selected_groups'));

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User expanded group',
				expect.objectContaining({ group_id: group.id, source: 'context-menu' }),
			);
		});

		it('omits expand/collapse from the selection menu when the selection mixes in loose nodes', async () => {
			const { groupNode, looseNode, getByTestId, queryByTestId } = await renderWithGroup(
				{},
				{ initialCollapsed: false },
			);

			// Group + loose node selected → right-click on the group opens the
			// selection menu; the groups-only rule hides the collapse actions.
			const { addSelectedNodes, findNode } = useVueFlow(canvasId);
			addSelectedNodes([findNode(groupNode.id)!, findNode(looseNode.id)!]);
			await waitFor(() => expect(findNode(groupNode.id)?.selected).toBe(true));

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));
			await waitFor(() => expect(getByTestId('context-menu-item-copy')).toBeInTheDocument());

			expect(queryByTestId('context-menu-item-collapse_selected_groups')).not.toBeInTheDocument();
			expect(queryByTestId('context-menu-item-expand_selected_groups')).not.toBeInTheDocument();
		});

		it('expands all groups with the Alt+G shortcut', async () => {
			const { group } = await renderWithGroup({}, { initialCollapsed: true });

			await fireEvent.keyDown(document, { key: 'g', altKey: true });

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User expanded group',
				expect.objectContaining({ group_id: group.id, source: 'keyboard-shortcut' }),
			);
		});

		it('collapses all groups with the Shift+Alt+G shortcut, also on a read-only canvas', async () => {
			const { group } = await renderWithGroup({ readOnly: true }, { initialCollapsed: false });

			await fireEvent.keyDown(document, { key: 'G', altKey: true, shiftKey: true });

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User collapsed group',
				expect.objectContaining({ group_id: group.id, source: 'keyboard-shortcut' }),
			);
		});

		it('scopes Alt+G to the selected groups when a selection exists', async () => {
			workflowDocumentStore.setScopes(['workflow:update']);
			workflowDocumentStore.setNodes([
				createTestNode({ id: 'a', name: 'Node A' }),
				createTestNode({ id: 'b', name: 'Node B' }),
			]);
			const group1 = workflowDocumentStore.createGroup(['a'], 'Group 1');
			const group2 = workflowDocumentStore.createGroup(['b'], 'Group 2');
			const nodes = [
				createCanvasGroupElement({ id: group1.id, name: group1.name, nodeIds: ['a'] }),
				createCanvasGroupElement({
					id: group2.id,
					name: group2.name,
					nodeIds: ['b'],
					position: { x: 600, y: 0 },
				}),
			];

			const { container } = renderComponent({
				props: { nodes },
				global: { provide: { [NodeGroupViewKey as symbol]: createNodeGroupViewMock(true) } },
			});
			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

			const { addSelectedNodes, findNode } = useVueFlow(canvasId);
			addSelectedNodes([findNode(`group:${group1.id}`)!]);
			await waitFor(() => expect(findNode(`group:${group1.id}`)?.selected).toBe(true));

			await fireEvent.keyDown(document, { key: 'g', altKey: true });

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User expanded group',
				expect.objectContaining({ group_id: group1.id, source: 'keyboard-shortcut' }),
			);
			expect(useTelemetry().track).not.toHaveBeenCalledWith(
				'User expanded group',
				expect.objectContaining({ group_id: group2.id }),
			);
		});

		it('does nothing on Alt+G when the selection contains no groups', async () => {
			const { looseNode } = await renderWithGroup({}, { initialCollapsed: true });

			const { addSelectedNodes, findNode } = useVueFlow(canvasId);
			addSelectedNodes([findNode(looseNode.id)!]);
			await waitFor(() => expect(findNode(looseNode.id)?.selected).toBe(true));

			await fireEvent.keyDown(document, { key: 'g', altKey: true });

			expect(useTelemetry().track).not.toHaveBeenCalledWith(
				'User expanded group',
				expect.anything(),
			);
		});

		it('does nothing on Alt+G when the selection mixes groups and loose nodes', async () => {
			// Menu parity: mixed selections offer no expand/collapse, so the
			// shortcut must not act on the selection's groups either.
			const { groupNode, looseNode } = await renderWithGroup({}, { initialCollapsed: true });

			const { addSelectedNodes, findNode } = useVueFlow(canvasId);
			addSelectedNodes([findNode(groupNode.id)!, findNode(looseNode.id)!]);
			await waitFor(() => expect(findNode(groupNode.id)?.selected).toBe(true));

			await fireEvent.keyDown(document, { key: 'g', altKey: true });

			expect(useTelemetry().track).not.toHaveBeenCalledWith(
				'User expanded group',
				expect.anything(),
			);
		});

		it('deletes the group when the ungroup action is selected', async () => {
			const { group, getByTestId } = await renderWithGroup();

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));
			await waitFor(() =>
				expect(getByTestId('context-menu-item-ungroup_nodes')).toBeInTheDocument(),
			);

			await fireEvent.click(getByTestId('context-menu-item-ungroup_nodes'));

			await waitFor(() => expect(workflowDocumentStore.getGroupById(group.id)).toBeUndefined());
			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User ungrouped nodes',
				expect.objectContaining({
					group_id: group.id,
					node_ids: ['a', 'b'],
					source: 'context-menu',
				}),
			);
		});

		it('targets the right-clicked group even if membership changed while the menu was open', async () => {
			const { group, getByTestId } = await renderWithGroup();

			await fireEvent.contextMenu(getByTestId('canvas-node-group'));
			await waitFor(() =>
				expect(getByTestId('context-menu-item-ungroup_nodes')).toBeInTheDocument(),
			);

			// Simulate a concurrent change (e.g. a collaborator): the right-clicked
			// group is dissolved and its first member joins a different group.
			workflowDocumentStore.deleteGroup(group.id);
			const otherGroup = workflowDocumentStore.createGroup(['a'], 'Other Group');

			await fireEvent.click(getByTestId('context-menu-item-ungroup_nodes'));

			// The action must no-op — resolving via the snapshotted member id
			// would wrongly ungroup the unrelated group that now contains it.
			expect(workflowDocumentStore.getGroupById(otherGroup.id)).toBeDefined();
			expect(useTelemetry().track).not.toHaveBeenCalledWith(
				'User ungrouped nodes',
				expect.anything(),
			);
		});
	});

	describe('node group telemetry', () => {
		beforeEach(() => {
			localStorage.clear();
		});

		function buildNodeGroupView() {
			return useCanvasNodeGroupView({
				workflowId: () => 'wf-test',
				getCurrentGroupIds: () => workflowDocumentStore.allGroups.map((group) => group.id),
				onNodeGroupsChange: workflowDocumentStore.onNodeGroupsChange,
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

		it('tracks a collapse with the group-header source when the header is clicked', async () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'My Group');
			const nodeGroupView = buildNodeGroupView();
			nodeGroupView.toggleCollapsed(group.id); // start expanded
			const groupNode = createCanvasGroupElement({ id: group.id, name: group.name });

			const { getByTestId } = renderComponent({
				props: { nodes: [groupNode] },
				global: { provide: { [NodeGroupViewKey as symbol]: nodeGroupView } },
			});

			await waitFor(() => expect(getByTestId('canvas-node-group-header')).toBeInTheDocument());
			await fireEvent.click(getByTestId('canvas-node-group-header'));

			expect(useTelemetry().track).toHaveBeenCalledWith(
				'User collapsed group',
				expect.objectContaining({ group_id: group.id, source: 'group-header' }),
			);
		});
	});
});

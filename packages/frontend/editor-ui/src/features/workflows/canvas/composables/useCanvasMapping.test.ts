/**
 * Slim test suite for `useCanvasMapping`.
 *
 * The composable is now a thin glue layer that reads from `CanvasRenderData`
 * to assemble `mappedNodes` / `mappedConnections`. The heavy by-id projections
 * live in their new owners and are tested there: tooltip / hasIssues / render
 * type / sticky z-index in `useWorkflowDocumentRenderData.test.ts`, and the
 * per-node execution status / waiting message / output-map aggregation in
 * `executionData.store.test.ts`. These tests verify the shape of the canvas
 * output and that renderData values flow into the right fields.
 */
import type { ITaskData, IConnections, IWorkflowGroup } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import {
	createEmptyCanvasRenderData,
	type CanvasRenderData,
} from '@/features/workflows/canvas/canvas.utils';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';
import type { CanvasNodeGroupView } from './useCanvasNodeGroupView';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import { CanvasNodeRenderType, type CanvasNodeData } from '../canvas.types';
import { MarkerType } from '@vue-flow/core';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate: { count: number | string } }) => {
			if (!options) return key;
			if (key === 'ndv.output.items') {
				const count = Number(options.interpolate.count);
				return `${count} item${count > 1 ? 's' : ''}`;
			}
			if (key === 'ndv.output.itemsTotal') return `${options.interpolate.count} items total`;
			return key;
		},
	}),
}));

function setStatus(
	rd: CanvasRenderData,
	nodeId: string,
	status: NonNullable<CanvasNodeData['execution']['status']>,
) {
	rd.executionStatusByNodeId.set(
		nodeId,
		computed(() => status),
	);
}

function setRunData(rd: CanvasRenderData, nodeId: string, tasks: ITaskData[] | null) {
	rd.executionRunDataByNodeId.set(
		nodeId,
		computed(() => tasks),
	);
}

beforeEach(() => {
	setActivePinia(createPinia());
});

describe('useCanvasMapping — mapped nodes', () => {
	it('maps each node to a CanvasNode with id, label, type, position, and draggable', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha', type: 'set' }) as INodeUi;
		node.position = [10, 20];
		node.draggable = true;

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(createEmptyCanvasRenderData()),
		});

		expect(nodes.value).toHaveLength(1);
		const mapped = nodes.value[0];
		expect(mapped.id).toBe('a');
		expect(mapped.label).toBe('Alpha');
		expect(mapped.type).toBe('canvas-node');
		expect(mapped.position).toEqual({ x: 10, y: 20 });
		expect(mapped.draggable).toBe(true);
	});

	it('pulls subtitle from renderData.subtitleByNodeId', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const rd = createEmptyCanvasRenderData();
		rd.subtitleByNodeId.set(
			'a',
			computed(() => 'Custom subtitle'),
		);

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		expect(nodes.value[0].data?.subtitle).toBe('Custom subtitle');
	});

	it('defaults subtitle to empty string when renderData has no entry', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(createEmptyCanvasRenderData()),
		});

		expect(nodes.value[0].data?.subtitle).toBe('');
	});

	it('exposes validation errors and hasIssues from renderData', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const rd = createEmptyCanvasRenderData();
		rd.validationErrorsByNodeId.set(
			'a',
			computed(() => ['Missing parameter']),
		);
		rd.hasIssuesByNodeId.set(
			'a',
			computed(() => true),
		);

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		expect(nodes.value[0].data?.issues.validation).toEqual(['Missing parameter']);
		expect(nodes.value[0].data?.issues.visible).toBe(true);
	});

	it('exposes execution state (status, waiting, waitingForNext, running) from renderData', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const rd = createEmptyCanvasRenderData();
		setStatus(rd, 'a', 'running');
		rd.executionWaitingByNodeId.set(
			'a',
			computed(() => 'Waiting for webhook'),
		);
		rd.executionRunningByNodeId.set(
			'a',
			computed(() => true),
		);
		rd.executionWaitingForNextByNodeId.set(
			'a',
			computed(() => true),
		);

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		expect(nodes.value[0].data?.execution.status).toBe('running');
		expect(nodes.value[0].data?.execution.waiting).toBe('Waiting for webhook');
		expect(nodes.value[0].data?.execution.running).toBe(true);
		expect(nodes.value[0].data?.execution.waitingForNext).toBe(true);
	});

	it('exposes runData with iterations (excluding canceled) and outputMap', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const rd = createEmptyCanvasRenderData();
		setRunData(rd, 'a', [
			{ executionStatus: 'success' } as ITaskData,
			{ executionStatus: 'canceled' } as ITaskData,
			{ executionStatus: 'success' } as ITaskData,
		]);
		rd.executionRunDataOutputMapByNodeId.set('a', { main: { '0': { total: 7, iterations: 2 } } });

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		expect(nodes.value[0].data?.runData.iterations).toBe(2);
		expect(nodes.value[0].data?.runData.visible).toBe(true);
		expect(nodes.value[0].data?.runData.outputMap).toEqual({
			main: { '0': { total: 7, iterations: 2 } },
		});
	});

	it('falls back to a render entry derived from node.type when renderData has none', () => {
		// Placeholder nodes injected via the canvas's `fallbackNodes` prop
		// (AddNodes, ChoicePrompt — see NodeView.vue) are not in the workflow
		// document, so renderData's `renderTypeByNodeId` has no entry. Their
		// `node.type` literally equals the render-type identifier, so
		// `{ type: node.type, options: {} }` is the correct render entry.
		const addNodes = createTestNode({
			id: 'add-nodes',
			name: 'AddNodes',
			type: CanvasNodeRenderType.AddNodes,
		}) as INodeUi;
		const choicePrompt = createTestNode({
			id: 'choice-prompt',
			name: 'ChoicePrompt',
			type: CanvasNodeRenderType.ChoicePrompt,
		}) as INodeUi;

		const { nodes } = useCanvasMapping({
			nodes: ref([addNodes, choicePrompt]),
			connections: ref({}),
			renderData: shallowRef(createEmptyCanvasRenderData()),
		});

		expect(nodes.value[0].data?.render).toEqual({
			type: CanvasNodeRenderType.AddNodes,
			options: {},
		});
		expect(nodes.value[1].data?.render).toEqual({
			type: CanvasNodeRenderType.ChoicePrompt,
			options: {},
		});
	});

	it('passes through render type from renderData.renderTypeByNodeId', () => {
		const node = createTestNode({ id: 's', name: 'Sticky' }) as INodeUi;
		const rd = createEmptyCanvasRenderData();
		rd.renderTypeByNodeId.set(
			's',
			computed(
				() =>
					({
						type: CanvasNodeRenderType.StickyNote,
						options: { width: 200, height: 100, color: 1, content: 'Hi' },
					}) as CanvasNodeData['render'],
			),
		);

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		expect(nodes.value[0].data?.render.type).toBe(CanvasNodeRenderType.StickyNote);
	});

	it('spreads additionalPropertiesByNodeId onto the mapped CanvasNode', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const rd = createEmptyCanvasRenderData({
			additionalPropertiesByNodeId: computed(() => ({ a: { style: { zIndex: -42 } } })),
		});

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		expect(nodes.value[0].style).toEqual({ zIndex: -42 });
	});

	it('attaches input/output connections derived from the connections prop', () => {
		const alpha = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const beta = createTestNode({ id: 'b', name: 'Beta' }) as INodeUi;
		const connections: IConnections = {
			Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] },
		};

		const { nodes } = useCanvasMapping({
			nodes: ref([alpha, beta]),
			connections: ref(connections),
			renderData: shallowRef(createEmptyCanvasRenderData()),
		});

		const alphaMapped = nodes.value.find((n) => n.id === 'a');
		const betaMapped = nodes.value.find((n) => n.id === 'b');
		expect(alphaMapped?.data?.connections.outputs.main?.[0]?.[0]?.node).toBe('Beta');
		expect(betaMapped?.data?.connections.inputs.main?.[0]?.[0]?.node).toBe('Alpha');
	});
});

describe('useCanvasMapping — getNodeExecutionSnapshot', () => {
	it('reads hasExecutionError from executionIssuesByNodeName (single-node parity)', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const rd = createEmptyCanvasRenderData();
		rd.executionIssuesByNodeName.set(
			'Alpha',
			computed(() => ['Boom']),
		);

		const { getNodeExecutionSnapshot } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		const snapshot = getNodeExecutionSnapshot('a');
		expect(snapshot.hasExecutionError).toBe(true);
		expect(snapshot.hasValidationError).toBe(false);
	});

	it('reads hasValidationError without flagging an execution error', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const rd = createEmptyCanvasRenderData();
		rd.validationErrorsByNodeId.set(
			'a',
			computed(() => ['Missing parameter']),
		);

		const { getNodeExecutionSnapshot } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		const snapshot = getNodeExecutionSnapshot('a');
		expect(snapshot.hasValidationError).toBe(true);
		expect(snapshot.hasExecutionError).toBe(false);
	});

	it.each(['error', 'crashed'] as const)(
		'flags hasExecutionError on %s status even without execution-issue text',
		(status) => {
			const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
			const rd = createEmptyCanvasRenderData();
			setStatus(rd, 'a', status);

			const { getNodeExecutionSnapshot } = useCanvasMapping({
				nodes: ref([node]),
				connections: ref({}),
				renderData: shallowRef(rd),
			});

			expect(getNodeExecutionSnapshot('a').hasExecutionError).toBe(true);
		},
	);

	it('flags hasExecutionError from a last-task error when no issue text exists', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const rd = createEmptyCanvasRenderData();
		setRunData(rd, 'a', [{ error: { message: 'Boom' } } as unknown as ITaskData]);

		const { getNodeExecutionSnapshot } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(rd),
		});

		expect(getNodeExecutionSnapshot('a').hasExecutionError).toBe(true);
	});
});

describe('useCanvasMapping — mapped connections', () => {
	function makeWorkflow(connections: IConnections, nodes: INodeUi[] = []) {
		const alpha = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;
		const beta = createTestNode({ id: 'b', name: 'Beta' }) as INodeUi;
		const allNodes = nodes.length > 0 ? nodes : [alpha, beta];
		return { allNodes, connections };
	}

	it('produces a canvas-edge connection with closed-arrow marker', () => {
		const { allNodes, connections } = makeWorkflow({
			Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] },
		});

		const { connections: mapped } = useCanvasMapping({
			nodes: ref(allNodes),
			connections: ref(connections),
			renderData: shallowRef(createEmptyCanvasRenderData()),
		});

		expect(mapped.value).toHaveLength(1);
		expect(mapped.value[0].type).toBe('canvas-edge');
		expect(mapped.value[0].markerEnd).toBe(MarkerType.ArrowClosed);
	});

	it('marks the connection as "error" when the source node has issues', () => {
		const { allNodes, connections } = makeWorkflow({
			Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] },
		});
		const rd = createEmptyCanvasRenderData();
		rd.hasIssuesByNodeId.set(
			'a',
			computed(() => true),
		);

		const { connections: mapped } = useCanvasMapping({
			nodes: ref(allNodes),
			connections: ref(connections),
			renderData: shallowRef(rd),
		});

		expect(mapped.value[0].data?.status).toBe('error');
	});

	it('marks the connection as "running" when the source is running and has no run data', () => {
		const { allNodes, connections } = makeWorkflow({
			Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] },
		});
		const rd = createEmptyCanvasRenderData();
		rd.executionRunningByNodeId.set(
			'a',
			computed(() => true),
		);

		const { connections: mapped } = useCanvasMapping({
			nodes: ref(allNodes),
			connections: ref(connections),
			renderData: shallowRef(rd),
		});

		expect(mapped.value[0].data?.status).toBe('running');
	});

	it('marks the connection as "pinned" when source has pin data and run data', () => {
		const { allNodes, connections } = makeWorkflow({
			Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] },
		});
		const rd = createEmptyCanvasRenderData();
		rd.pinnedDataByNodeId.set(
			'a',
			computed(() => [{ json: { value: 1 } }]),
		);
		setRunData(rd, 'a', [{ executionStatus: 'success' } as ITaskData]);

		const { connections: mapped } = useCanvasMapping({
			nodes: ref(allNodes),
			connections: ref(connections),
			renderData: shallowRef(rd),
		});

		expect(mapped.value[0].data?.status).toBe('pinned');
	});

	it('marks the connection as "success" when source produced run data and target has run data too', () => {
		const { allNodes, connections } = makeWorkflow({
			Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] },
		});
		const rd = createEmptyCanvasRenderData();
		setRunData(rd, 'a', [{ executionStatus: 'success' } as ITaskData]);
		setRunData(rd, 'b', [{ executionStatus: 'success' } as ITaskData]);
		rd.executionRunDataOutputMapByNodeId.set('a', { main: { '0': { total: 3, iterations: 1 } } });

		const { connections: mapped } = useCanvasMapping({
			nodes: ref(allNodes),
			connections: ref(connections),
			renderData: shallowRef(rd),
		});

		expect(mapped.value[0].data?.status).toBe('success');
	});

	it('shows item-count label when source has pin data', () => {
		const { allNodes, connections } = makeWorkflow({
			Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] },
		});
		const rd = createEmptyCanvasRenderData();
		rd.pinnedDataByNodeId.set(
			'a',
			computed(() => [{ json: { x: 1 } }, { json: { x: 2 } }]),
		);

		const { connections: mapped } = useCanvasMapping({
			nodes: ref(allNodes),
			connections: ref(connections),
			renderData: shallowRef(rd),
		});

		expect(mapped.value[0].label).toBe('2 items');
	});

	it('uses outputMap.byTarget for non-main connections when present', () => {
		const tool = createTestNode({ id: 'tool', name: 'Tool' }) as INodeUi;
		const target = createTestNode({ id: 'target', name: 'Target' }) as INodeUi;
		const connections: IConnections = {
			Tool: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Target', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};
		const rd = createEmptyCanvasRenderData();
		setRunData(rd, 'tool', [{ executionStatus: 'success' } as ITaskData]);
		setRunData(rd, 'target', [{ executionStatus: 'success' } as ITaskData]);
		rd.executionRunDataOutputMapByNodeId.set('tool', {
			[NodeConnectionTypes.AiTool]: {
				'0': {
					total: 4,
					iterations: 1,
					byTarget: { target: { total: 4, iterations: 1 } },
				},
			},
		});

		const { connections: mapped } = useCanvasMapping({
			nodes: ref([tool, target]),
			connections: ref(connections),
			renderData: shallowRef(rd),
		});

		expect(mapped.value[0].label).toBe('4 items');
	});

	it('shows blank label when there is no pin data and no run data', () => {
		const { allNodes, connections } = makeWorkflow({
			Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] },
		});

		const { connections: mapped } = useCanvasMapping({
			nodes: ref(allNodes),
			connections: ref(connections),
			renderData: shallowRef(createEmptyCanvasRenderData()),
		});

		expect(mapped.value[0].label).toBe('');
	});

	describe('connection status with canceled tasks', () => {
		// Note: the output-map aggregation counts data items of canceled tasks
		// (see executionData.store.test.ts), so runDataTotal can be > 0 while
		// the last task is canceled — the status logic peeks past it.
		function mainConnections(): IConnections {
			return { Alpha: { main: [[{ node: 'Beta', type: 'main', index: 0 }]] } };
		}

		it('does not mark the connection successful when the only source task is canceled', () => {
			const { allNodes, connections } = makeWorkflow(mainConnections());
			const rd = createEmptyCanvasRenderData();
			setRunData(rd, 'a', [{ executionStatus: 'canceled' } as ITaskData]);
			rd.executionRunDataOutputMapByNodeId.set('a', { main: { '0': { total: 1, iterations: 0 } } });

			const { connections: mapped } = useCanvasMapping({
				nodes: ref(allNodes),
				connections: ref(connections),
				renderData: shallowRef(rd),
			});

			expect(mapped.value[0].data?.status).toBeUndefined();
		});

		it('marks the connection successful when the last task is canceled but the previous one succeeded', () => {
			const { allNodes, connections } = makeWorkflow(mainConnections());
			const rd = createEmptyCanvasRenderData();
			setRunData(rd, 'a', [
				{ executionStatus: 'success' } as ITaskData,
				{ executionStatus: 'canceled' } as ITaskData,
			]);
			rd.executionRunDataOutputMapByNodeId.set('a', { main: { '0': { total: 2, iterations: 1 } } });

			const { connections: mapped } = useCanvasMapping({
				nodes: ref(allNodes),
				connections: ref(connections),
				renderData: shallowRef(rd),
			});

			expect(mapped.value[0].data?.status).toBe('success');
		});

		it('leaves the status unset when all source tasks are canceled', () => {
			const { allNodes, connections } = makeWorkflow(mainConnections());
			const rd = createEmptyCanvasRenderData();
			setRunData(rd, 'a', [
				{ executionStatus: 'canceled' } as ITaskData,
				{ executionStatus: 'canceled' } as ITaskData,
			]);
			rd.executionRunDataOutputMapByNodeId.set('a', { main: { '0': { total: 2, iterations: 0 } } });

			const { connections: mapped } = useCanvasMapping({
				nodes: ref(allNodes),
				connections: ref(connections),
				renderData: shallowRef(rd),
			});

			expect(mapped.value[0].data?.status).toBeUndefined();
		});

		it('prioritizes running status over canceled-task handling', () => {
			const { allNodes, connections } = makeWorkflow(mainConnections());
			const rd = createEmptyCanvasRenderData();
			rd.executionRunningByNodeId.set(
				'a',
				computed(() => true),
			);
			setRunData(rd, 'a', [{ executionStatus: 'canceled' } as ITaskData]);

			const { connections: mapped } = useCanvasMapping({
				nodes: ref(allNodes),
				connections: ref(connections),
				renderData: shallowRef(rd),
			});

			expect(mapped.value[0].data?.status).toBe('running');
		});
	});

	describe('collapsed group merged edge status', () => {
		// Two grouped nodes feeding the same external input merge into a single
		// edge when the group is collapsed; the edge must surface the
		// highest-priority status among the underlying connections.
		const group: IWorkflowGroup = { id: 'g1', name: 'G', nodeIds: ['m1', 'm2'] };
		const collapsedView = { isGroupCollapsed: () => true } as unknown as CanvasNodeGroupView;

		function fanInWorkflow() {
			const m1 = createTestNode({ id: 'm1', name: 'M1' }) as INodeUi;
			const m2 = createTestNode({ id: 'm2', name: 'M2' }) as INodeUi;
			const external = createTestNode({ id: 'x', name: 'X' }) as INodeUi;
			const connections: IConnections = {
				M1: { main: [[{ node: 'X', type: NodeConnectionTypes.Main, index: 0 }]] },
				M2: { main: [[{ node: 'X', type: NodeConnectionTypes.Main, index: 0 }]] },
			};
			return { nodes: [m1, m2, external], connections };
		}

		it('surfaces the status of a non-first merged connection (only the second member ran)', () => {
			const { nodes, connections } = fanInWorkflow();
			const rd = createEmptyCanvasRenderData();
			setRunData(rd, 'm2', [{ executionStatus: 'success' } as ITaskData]);
			rd.executionRunDataOutputMapByNodeId.set('m2', {
				main: { '0': { total: 1, iterations: 1 } },
			});

			const { connections: mapped } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				renderData: shallowRef(rd),
				allGroups: ref([group]),
				nodeGroupView: collapsedView,
			});

			expect(mapped.value).toHaveLength(1);
			expect(mapped.value[0].source).toBe('group:g1');
			expect(mapped.value[0].target).toBe('x');
			expect(mapped.value[0].data?.status).toBe('success');
		});

		it('picks the highest-priority status across merged connections, not the first one', () => {
			const { nodes, connections } = fanInWorkflow();
			const rd = createEmptyCanvasRenderData();
			// Both members ran, the second one is pinned — pinned outranks success,
			// so it must win even though the first connection comes first.
			setRunData(rd, 'm1', [{ executionStatus: 'success' } as ITaskData]);
			setRunData(rd, 'm2', [{ executionStatus: 'success' } as ITaskData]);
			rd.executionRunDataOutputMapByNodeId.set('m1', {
				main: { '0': { total: 1, iterations: 1 } },
			});
			rd.executionRunDataOutputMapByNodeId.set('m2', {
				main: { '0': { total: 1, iterations: 1 } },
			});
			rd.pinnedDataByNodeId.set(
				'm2',
				computed(() => [{ json: {} }]),
			);

			const { connections: mapped } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				renderData: shallowRef(rd),
				allGroups: ref([group]),
				nodeGroupView: collapsedView,
			});

			expect(mapped.value).toHaveLength(1);
			expect(mapped.value[0].data?.status).toBe('pinned');
		});

		it('resolves the item-count label through the canonical source (not the group id)', () => {
			const { nodes, connections } = fanInWorkflow();
			const rd = createEmptyCanvasRenderData();
			setRunData(rd, 'm1', [{ executionStatus: 'success' } as ITaskData]);
			rd.executionRunDataOutputMapByNodeId.set('m1', {
				main: { '0': { total: 5, iterations: 1 } },
			});

			const { connections: mapped } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				renderData: shallowRef(rd),
				allGroups: ref([group]),
				nodeGroupView: collapsedView,
			});

			expect(mapped.value).toHaveLength(1);
			expect(mapped.value[0].source).toBe('group:g1');
			expect(mapped.value[0].label).toBe('5 items');
		});

		it('resolves the pinned item-count label through the canonical source', () => {
			const { nodes, connections } = fanInWorkflow();
			const rd = createEmptyCanvasRenderData();
			rd.pinnedDataByNodeId.set(
				'm1',
				computed(() => [{ json: {} }, { json: {} }]),
			);

			const { connections: mapped } = useCanvasMapping({
				nodes: ref(nodes),
				connections: ref(connections),
				renderData: shallowRef(rd),
				allGroups: ref([group]),
				nodeGroupView: collapsedView,
			});

			expect(mapped.value[0].label).toBe('2 items');
		});
	});
});

/**
 * Slim test suite for `useCanvasMapping`.
 *
 * The composable is now a thin glue layer that reads from `CanvasRenderData`
 * to assemble `mappedNodes` / `mappedConnections`. The heavy by-id projections
 * (subtitle / issues / execution status / render type / sticky z-index / etc.)
 * live in `useWorkflowDocumentRenderData` and are tested there. These tests
 * verify the shape of the canvas output and that renderData values flow into
 * the right fields.
 */
import type { ITaskData, IConnections } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import {
	createEmptyCanvasRenderData,
	type CanvasRenderData,
} from '@/features/workflows/canvas/canvas.utils';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';
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

	it('falls back to default render type when renderData has no entry', () => {
		const node = createTestNode({ id: 'a', name: 'Alpha' }) as INodeUi;

		const { nodes } = useCanvasMapping({
			nodes: ref([node]),
			connections: ref({}),
			renderData: shallowRef(createEmptyCanvasRenderData()),
		});

		expect(nodes.value[0].data?.render.type).toBe(CanvasNodeRenderType.Default);
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
});

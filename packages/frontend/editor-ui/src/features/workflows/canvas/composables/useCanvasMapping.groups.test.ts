import { describe, expect, it } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { CanvasConnection, NodeExecutionSnapshot } from '../canvas.types';
import {
	aggregateGroupExecution,
	buildCollapsedGroupByNodeId,
	computeGroupFrameRects,
	computeNodesRectFromStore,
	mapGroupsToVueFlowNodes,
	remapCollapsedGroupConnections,
	titleBarFromNodesRect,
} from './useCanvasMapping.groups';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';
import { STICKY_NODE_TYPE } from '@/app/constants/nodeTypes';
import { createNodeExecutionSnapshot } from '../__tests__/utils';

const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

function makeNode(id: string, x: number, y: number): INodeUi {
	return {
		id,
		name: id,
		type: 'n8n-nodes-base.noop',
		typeVersion: 1,
		position: [x, y] as [number, number],
		parameters: {},
		disabled: false,
	} as INodeUi;
}

function makeStickyNode(id: string, x: number, y: number, w: number, h: number): INodeUi {
	return {
		id,
		name: id,
		type: STICKY_NODE_TYPE,
		typeVersion: 1,
		position: [x, y] as [number, number],
		parameters: { width: w, height: h },
		disabled: false,
	} as INodeUi;
}

function nodeStore(...nodes: INodeUi[]) {
	const map = new Map(nodes.map((n) => [n.id, n]));
	return (id: string) => map.get(id);
}

function snapshotGetter(byId: Record<string, Partial<NodeExecutionSnapshot>> = {}) {
	return (id: string): NodeExecutionSnapshot => createNodeExecutionSnapshot(byId[id]);
}

describe('computeGroupFrameRects', () => {
	// Coordinates intentionally off the grid so an accidental snap() would surface.
	const nodesRect = { x: 317, y: 213, width: 396, height: 120 };

	it('anchors both rects at the same unsnapped top-left, offset by padding and header', () => {
		const { collapsed, expanded } = computeGroupFrameRects(nodesRect);
		const x = nodesRect.x - GROUP_PADDING_X;
		const y = nodesRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT;

		expect(collapsed).toMatchObject({ x, y });
		expect(expanded).toMatchObject({ x, y });
	});

	it('sizes the collapsed rect as a fixed-size chip', () => {
		const { collapsed } = computeGroupFrameRects(nodesRect);
		expect(collapsed.width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
		expect(collapsed.height).toBe(GROUP_HEADER_HEIGHT);
	});

	it('sizes the expanded rect to span the cluster plus padding', () => {
		const { expanded } = computeGroupFrameRects(nodesRect);
		expect(expanded.width).toBe(nodesRect.width + 2 * GROUP_PADDING_X);
		expect(expanded.height).toBe(
			GROUP_HEADER_HEIGHT + nodesRect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
		);
	});

	it('floors the expanded width at the collapsed chip width for a tight cluster', () => {
		const { expanded } = computeGroupFrameRects({ ...nodesRect, width: 10 });
		expect(expanded.width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
	});

	it('exposes an expanded height that, minus the header, equals the padded cluster height', () => {
		const { expanded } = computeGroupFrameRects(nodesRect);
		expect(expanded.height - GROUP_HEADER_HEIGHT).toBe(
			nodesRect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
		);
	});
});

describe('titleBarFromNodesRect', () => {
	// Off-grid so snapping is observable.
	const nodesRect = { x: 317, y: 213, width: 396, height: 120 };

	it('snaps the position to the grid while computeGroupFrameRects stays unsnapped', () => {
		const { expanded } = computeGroupFrameRects(nodesRect);
		const titleBar = titleBarFromNodesRect(nodesRect, false);

		expect(titleBar.position).toEqual({ x: snapToGrid(expanded.x), y: snapToGrid(expanded.y) });
		// The raw rect is not grid-aligned, so snapping must have moved it.
		expect(titleBar.position.x).not.toBe(expanded.x);
	});

	it('uses the chip width when collapsed and the expanded width otherwise', () => {
		expect(titleBarFromNodesRect(nodesRect, true).width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
		expect(titleBarFromNodesRect(nodesRect, false).width).toBe(
			nodesRect.width + 2 * GROUP_PADDING_X,
		);
	});
});

describe('computeNodesRectFromStore', () => {
	// Same defaults used by the design system canvas grid (16 × 6).
	const NODE_W = 96;
	const NODE_H = 96;

	it('returns the bounding rect of all nodes at the default node size', () => {
		const getById = nodeStore(makeNode('a', 0, 0), makeNode('b', 300, 100));
		const rect = computeNodesRectFromStore(['a', 'b'], getById);
		expect(rect.x).toBe(0);
		expect(rect.y).toBe(0);
		expect(rect.width).toBe(300 + NODE_W);
		expect(rect.height).toBe(100 + NODE_H);
	});

	it('uses sticky-note width/height from parameters when present', () => {
		const getById = nodeStore(makeStickyNode('sticky', 0, 0, 500, 300));
		const rect = computeNodesRectFromStore(['sticky'], getById);
		expect(rect.width).toBe(500);
		expect(rect.height).toBe(300);
	});

	it('ignores parameters.width/height on non-sticky nodes', () => {
		// Sticky is the only node type whose dimensions live in parameters.
		// A future node that happens to set parameters.width must not bend the
		// group's bounding rect — it should fall back to DEFAULT_NODE_SIZE.
		const bogus = {
			id: 'bogus',
			name: 'bogus',
			type: 'n8n-nodes-base.noop',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: { width: 9999, height: 9999 },
			disabled: false,
		} as INodeUi;
		const getById = nodeStore(bogus);
		const rect = computeNodesRectFromStore(['bogus'], getById);
		expect(rect.width).toBe(NODE_W);
		expect(rect.height).toBe(NODE_H);
	});

	it('returns a zero-sized rect when no nodes exist', () => {
		const getById = nodeStore();
		const rect = computeNodesRectFromStore(['missing'], getById);
		expect(rect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
	});

	it('uses caller-supplied dimensions over the default (e.g. configurable AI node)', () => {
		const getById = nodeStore(makeNode('agent', 0, 0));
		const rect = computeNodesRectFromStore(['agent'], getById, () => ({
			width: 256,
			height: 96,
		}));
		expect(rect.width).toBe(256);
		expect(rect.height).toBe(96);
	});
});

describe('aggregateGroupExecution', () => {
	function statusOf(nodeIds: string[], byId: Record<string, Partial<NodeExecutionSnapshot>> = {}) {
		return aggregateGroupExecution(nodeIds, snapshotGetter(byId));
	}

	it('returns running when any node is running', () => {
		expect(statusOf(['a', 'b'], { a: { running: true } })).toBe('running');
	});

	it('returns running when any node is waitingForNext', () => {
		expect(statusOf(['a'], { a: { waitingForNext: true } })).toBe('running');
	});

	it('returns error when any node has an execution error', () => {
		expect(statusOf(['a', 'b'], { b: { hasExecutionError: true } })).toBe('error');
	});

	it('returns issues (not error) when a node has only validation errors and never ran', () => {
		expect(statusOf(['a', 'b'], { b: { hasValidationError: true } })).toBe('issues');
	});

	it('execution error beats validation issues', () => {
		expect(
			statusOf(['a', 'b'], {
				a: { hasExecutionError: true },
				b: { hasValidationError: true },
			}),
		).toBe('error');
	});

	it('validation issues beat warning (dirty) and success', () => {
		expect(
			statusOf(['a', 'b'], {
				a: { hasValidationError: true },
				b: { status: 'success', dirty: true },
			}),
		).toBe('issues');
	});

	it('ignores canceled / new for the success-success rollup (treated as idle, mirroring single-node)', () => {
		expect(statusOf(['a', 'b'], { a: { status: 'success' }, b: { status: 'canceled' } })).toBe(
			'success',
		);
		expect(
			statusOf(['a', 'b'], { a: { status: 'canceled' }, b: { status: 'new' } }),
		).toBeUndefined();
	});

	it('returns success when all nodes are success', () => {
		expect(statusOf(['a', 'b'], { a: { status: 'success' }, b: { status: 'success' } })).toBe(
			'success',
		);
	});

	it('returns success when one node is success and others never ran (unknown — e.g. untaken conditional branch)', () => {
		expect(statusOf(['a', 'b'], { a: { status: 'success' }, b: { status: 'unknown' } })).toBe(
			'success',
		);
	});

	it('returns undefined (idle) when all nodes are unknown — workflow has never executed', () => {
		expect(
			statusOf(['a', 'b'], { a: { status: 'unknown' }, b: { status: 'unknown' } }),
		).toBeUndefined();
	});

	it('returns undefined when no node status is set', () => {
		expect(statusOf(['a', 'b'])).toBeUndefined();
	});

	it('returns waiting when any node has a waiting reason (form/webhook/etc.)', () => {
		expect(statusOf(['a', 'b'], { a: { waiting: 'waiting for webhook' } })).toBe('waiting');
	});

	it('returns waiting when any node has executionStatus waiting', () => {
		expect(statusOf(['a'], { a: { status: 'waiting' } })).toBe('waiting');
	});

	it('running beats error', () => {
		expect(statusOf(['a', 'b'], { a: { running: true }, b: { hasExecutionError: true } })).toBe(
			'running',
		);
	});

	it('error beats success', () => {
		expect(statusOf(['a', 'b'], { a: { status: 'success' }, b: { hasExecutionError: true } })).toBe(
			'error',
		);
	});

	it('returns warning when any node is dirty (parameters changed since its last run)', () => {
		expect(
			statusOf(['a', 'b'], { a: { status: 'success' }, b: { status: 'success', dirty: true } }),
		).toBe('warning');
	});

	it('error beats warning, warning beats success — mirrors single-node CSS rule order', () => {
		expect(
			statusOf(['a', 'b'], {
				a: { hasExecutionError: true },
				b: { status: 'success', dirty: true },
			}),
		).toBe('error');
		expect(statusOf(['a', 'b'], { a: { status: 'success' }, b: { dirty: true } })).toBe('warning');
	});

	it('waiting beats running — mirrors single-node CSS rule order', () => {
		expect(statusOf(['a', 'b'], { a: { running: true }, b: { waiting: 'waiting for form' } })).toBe(
			'waiting',
		);
	});
});

describe('mapGroupsToVueFlowNodes', () => {
	const group: IWorkflowGroup = { id: 'g1', name: 'G', nodeIds: ['a', 'b'] };

	function setup(isCollapsed: boolean) {
		const getById = nodeStore(makeNode('a', 100, 200), makeNode('b', 400, 200));
		return mapGroupsToVueFlowNodes({
			allGroups: [group],
			getNodeById: getById,
			isGroupCollapsed: () => isCollapsed,
			readOnly: false,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
	}

	it('emits one canvas-node-group VueFlow node per group', () => {
		const out = setup(true);
		expect(out).toHaveLength(1);
		expect(out[0].id).toBe('group:g1');
		expect(out[0].type).toBe('canvas-node-group');
	});

	it('left edge sits at nodesRect.x - GROUP_PADDING_X (snapped to the grid), in both states', () => {
		const collapsed = setup(true);
		const expanded = setup(false);
		expect(collapsed[0].position.x).toBe(snapToGrid(100 - GROUP_PADDING_X));
		expect(expanded[0].position.x).toBe(snapToGrid(100 - GROUP_PADDING_X));
	});

	it('top edge places title bar above nodesRect, snapped to the canvas grid', () => {
		const collapsed = setup(true);
		expect(collapsed[0].position.y).toBe(
			snapToGrid(200 - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT),
		);
	});

	it('collapsed width is fixed 400px', () => {
		const out = setup(true);
		expect(out[0].width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
	});

	it('expanded width matches nodes rect + 2 * GROUP_PADDING_X when wider than the minimum', () => {
		const out = setup(false);
		// nodes rect width = (400 + 96) - 100 = 396  (DEFAULT_NODE_SIZE = 96)
		const NODE_W = 96;
		expect(out[0].width).toBe(400 + NODE_W - 100 + 2 * GROUP_PADDING_X);
	});

	it('expanded width matches collapsed width for tight node clusters', () => {
		const getById = nodeStore(makeNode('a', 100, 200), makeNode('b', 196, 200));
		const collapsed = mapGroupsToVueFlowNodes({
			allGroups: [group],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			readOnly: false,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
		const expanded = mapGroupsToVueFlowNodes({
			allGroups: [group],
			getNodeById: getById,
			isGroupCollapsed: () => false,
			readOnly: false,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
		expect(collapsed[0].width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
		expect(expanded[0].width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
	});

	it('marks the title bar selectable when collapsed and editable; never connectable', () => {
		const out = setup(true);
		expect(out[0].selectable).toBe(true);
		expect(out[0].connectable).toBe(false);
	});

	it('keeps the title bar selectable when expanded — selecting it selects the whole group', () => {
		const out = setup(false);
		expect(out[0].selectable).toBe(true);
	});

	it('keeps a collapsed title bar selectable but not draggable when readOnly', () => {
		const getById = nodeStore(makeNode('a', 0, 0));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			readOnly: true,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
		expect(out[0].selectable).toBe(true);
		expect(out[0].draggable).toBe(false);
	});

	it('skips emitting a title bar for a group with zero existing nodes', () => {
		const getById = nodeStore(); // no nodes
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'gOrphan', name: 'Empty', nodeIds: ['ghost'] }],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			readOnly: false,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
		expect(out).toHaveLength(0);
	});

	it('marks the node not draggable when readOnly', () => {
		const getById = nodeStore(makeNode('a', 0, 0));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			readOnly: true,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
		expect(out[0].draggable).toBe(false);
	});

	it('position lands on the grid', () => {
		const getById = nodeStore(makeNode('a', 32, 48), makeNode('b', 128, 48));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a', 'b'] }],
			getNodeById: getById,
			isGroupCollapsed: () => false,
			readOnly: false,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
		expect(Math.abs(out[0].position.x % GRID_SIZE)).toBe(0);
		expect(Math.abs(out[0].position.y % GRID_SIZE)).toBe(0);
	});

	it('applies visual offsets without changing nodesRect from store positions', () => {
		const getById = nodeStore(makeNode('a', 100, 200));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			getGroupVisualOffset: () => ({ x: 50, y: 80 }),
			isGroupCollapsed: () => false,
			readOnly: false,
			getNodeExecutionSnapshot: snapshotGetter(),
		});

		expect(out[0].position).toEqual({
			x: snapToGrid(100 - GROUP_PADDING_X) + 50,
			y: snapToGrid(200 - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT) + 80,
		});
		expect(out[0].data?.nodesRect).toEqual({
			x: 100,
			y: 200,
			width: 96,
			height: 96,
		});
	});

	it('marks the group deactivated when every member node is disabled', () => {
		const getById = nodeStore(
			{ ...makeNode('a', 100, 200), disabled: true },
			{ ...makeNode('b', 400, 200), disabled: true },
		);
		const out = mapGroupsToVueFlowNodes({
			allGroups: [group],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			readOnly: false,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
		expect(out[0].data?.allNodesDisabled).toBe(true);
	});

	it('does not mark the group deactivated while any member node is enabled', () => {
		const getById = nodeStore(
			{ ...makeNode('a', 100, 200), disabled: true },
			makeNode('b', 400, 200),
		);
		const out = mapGroupsToVueFlowNodes({
			allGroups: [group],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			readOnly: false,
			getNodeExecutionSnapshot: snapshotGetter(),
		});
		expect(out[0].data?.allNodesDisabled).toBe(false);
	});
});

describe('buildCollapsedGroupByNodeId', () => {
	it('only indexes nodes inside collapsed groups', () => {
		const g1: IWorkflowGroup = { id: 'g1', name: 'G1', nodeIds: ['a', 'b'] };
		const g2: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c'] };
		const map = buildCollapsedGroupByNodeId([g1, g2], (id) => id === 'g1');
		expect(map.get('a')?.id).toBe('g1');
		expect(map.get('b')?.id).toBe('g1');
		expect(map.get('c')).toBeUndefined();
	});
});

describe('remapCollapsedGroupConnections', () => {
	function makeConnection(
		source: string,
		target: string,
		opts: Partial<CanvasConnection> = {},
	): CanvasConnection {
		return {
			id: `${source}->${target}`,
			source,
			target,
			sourceHandle: 'outputs/main/0',
			targetHandle: 'inputs/main/0',
			data: {
				source: { node: source, index: 0, type: 'main' as never },
				target: { node: target, index: 0, type: 'main' as never },
			},
			...opts,
		} as CanvasConnection;
	}

	const g1: IWorkflowGroup = { id: 'g1', name: 'G1', nodeIds: ['m1', 'm2'] };

	it('drops connections entirely inside a collapsed group', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = remapCollapsedGroupConnections([makeConnection('m1', 'm2')], collapsedMap);
		expect(result).toHaveLength(0);
	});

	it('rewrites endpoints when one side is inside a collapsed group', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = remapCollapsedGroupConnections(
			[makeConnection('external', 'm1'), makeConnection('m2', 'external2')],
			collapsedMap,
		);
		expect(result).toHaveLength(2);
		const incoming = result.find((c) => c.source === 'external');
		expect(incoming?.target).toBe('group:g1');
		expect(incoming?.targetHandle).toBe('left');
		const outgoing = result.find((c) => c.target === 'external2');
		expect(outgoing?.source).toBe('group:g1');
		expect(outgoing?.sourceHandle).toBe('right');
	});

	it('leaves external-only connections untouched', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = remapCollapsedGroupConnections([makeConnection('a', 'b')], collapsedMap);
		expect(result[0].source).toBe('a');
		expect(result[0].target).toBe('b');
	});

	it('preserves data.source.type for non-main connections', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const aiConnection = makeConnection('external', 'm1');
		aiConnection.data = {
			source: { node: 'external', index: 0, type: 'ai_tool' as never },
			target: { node: 'm1', index: 0, type: 'ai_tool' as never },
		};
		const result = remapCollapsedGroupConnections([aiConnection], collapsedMap);
		expect(result[0].data?.source.type).toBe('ai_tool');
	});

	it('stashes the canonical endpoints on data so mutations can resolve real workflow nodes', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = remapCollapsedGroupConnections([makeConnection('external', 'm1')], collapsedMap);
		expect(result[0].source).toBe('external');
		expect(result[0].target).toBe('group:g1');
		expect(result[0].data?.canonicals).toEqual([
			{
				source: 'external',
				target: 'm1',
				sourceHandle: 'outputs/main/0',
				targetHandle: 'inputs/main/0',
			},
		]);
	});

	it('does not set canonicals on connections that were not remapped', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = remapCollapsedGroupConnections([makeConnection('a', 'b')], collapsedMap);
		expect(result[0].data?.canonicals).toBeUndefined();
	});

	it('merges edges remapping to the same endpoints into one, keeping every canonical', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = remapCollapsedGroupConnections(
			[makeConnection('m1', 'external'), makeConnection('m2', 'external')],
			collapsedMap,
		);
		expect(result).toHaveLength(1);
		expect(result[0].source).toBe('group:g1');
		expect(result[0].data?.canonicals).toEqual([
			{
				source: 'm1',
				target: 'external',
				sourceHandle: 'outputs/main/0',
				targetHandle: 'inputs/main/0',
			},
			{
				source: 'm2',
				target: 'external',
				sourceHandle: 'outputs/main/0',
				targetHandle: 'inputs/main/0',
			},
		]);
	});

	it('structural invariant: no connection references a collapsed member as endpoint', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = remapCollapsedGroupConnections(
			[
				makeConnection('external', 'm1'),
				makeConnection('m2', 'external2'),
				makeConnection('m1', 'm2'),
			],
			collapsedMap,
		);
		for (const connection of result) {
			expect(collapsedMap.has(connection.source)).toBe(false);
			expect(collapsedMap.has(connection.target)).toBe(false);
		}
	});
});

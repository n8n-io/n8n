import { describe, expect, it } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { CanvasConnection } from '../canvas.types';
import {
	aggregateGroupStatus,
	aggregateRunDataIterations,
	buildCollapsedGroupByNodeId,
	computeMemberRectFromStore,
	mapGroupsToVueFlowNodes,
	reanchorCollapsedConnections,
} from './useCanvasMapping.groups';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';

function makeNode(id: string, x: number, y: number, w = 100, h = 100): INodeUi {
	return {
		id,
		name: id,
		type: 'n8n-nodes-base.noop',
		typeVersion: 1,
		position: [x, y] as [number, number],
		parameters: w !== 100 || h !== 100 ? { width: w, height: h } : {},
		disabled: false,
	} as INodeUi;
}

function nodeStore(...nodes: INodeUi[]) {
	const map = new Map(nodes.map((n) => [n.id, n]));
	return (id: string) => map.get(id);
}

const EMPTY_AGG = {
	nodeExecutionRunningById: {},
	nodeExecutionWaitingForNextById: {},
	nodeHasIssuesById: {},
	nodeExecutionStatusById: {},
	nodeExecutionRunDataIterationsById: {},
};

describe('computeMemberRectFromStore', () => {
	// Same defaults used by the design system canvas grid (16 × 6).
	const NODE_W = 96;
	const NODE_H = 96;

	it('returns the bounding rect of all members at the default node size', () => {
		const getById = nodeStore(makeNode('a', 0, 0), makeNode('b', 300, 100));
		const rect = computeMemberRectFromStore(['a', 'b'], getById);
		expect(rect.x).toBe(0);
		expect(rect.y).toBe(0);
		expect(rect.width).toBe(300 + NODE_W);
		expect(rect.height).toBe(100 + NODE_H);
	});

	it('uses sticky-note width/height from parameters when present', () => {
		const getById = nodeStore(makeNode('sticky', 0, 0, 500, 300));
		const rect = computeMemberRectFromStore(['sticky'], getById);
		expect(rect.width).toBe(500);
		expect(rect.height).toBe(300);
	});

	it('returns default-sized rect when no members exist', () => {
		const getById = nodeStore();
		const rect = computeMemberRectFromStore(['missing'], getById);
		expect(rect.width).toBe(NODE_W);
		expect(rect.height).toBe(NODE_H);
	});

	it('uses caller-supplied dimensions over the default (e.g. configurable AI node)', () => {
		const getById = nodeStore(makeNode('agent', 0, 0));
		const rect = computeMemberRectFromStore(['agent'], getById, () => ({
			width: 256,
			height: 96,
		}));
		expect(rect.width).toBe(256);
		expect(rect.height).toBe(96);
	});
});

describe('aggregateGroupStatus (AC #7)', () => {
	it('returns running when any member is running', () => {
		const status = aggregateGroupStatus(['a', 'b'], {
			...EMPTY_AGG,
			nodeExecutionRunningById: { a: true },
		});
		expect(status).toBe('running');
	});

	it('returns running when any member is waitingForNext', () => {
		const status = aggregateGroupStatus(['a'], {
			...EMPTY_AGG,
			nodeExecutionWaitingForNextById: { a: true },
		});
		expect(status).toBe('running');
	});

	it('returns error when any member has issues', () => {
		const status = aggregateGroupStatus(['a', 'b'], {
			...EMPTY_AGG,
			nodeHasIssuesById: { b: true },
		});
		expect(status).toBe('error');
	});

	it('returns error when any member has executionStatus error or crashed', () => {
		expect(
			aggregateGroupStatus(['a'], {
				...EMPTY_AGG,
				nodeExecutionStatusById: { a: 'error' },
			}),
		).toBe('error');
		expect(
			aggregateGroupStatus(['a'], {
				...EMPTY_AGG,
				nodeExecutionStatusById: { a: 'crashed' },
			}),
		).toBe('error');
	});

	it('returns success when all members are success', () => {
		const status = aggregateGroupStatus(['a', 'b'], {
			...EMPTY_AGG,
			nodeExecutionStatusById: { a: 'success', b: 'success' },
		});
		expect(status).toBe('success');
	});

	it('returns success when one member is success and others never ran (unknown) — AC #7 conditional branching', () => {
		const status = aggregateGroupStatus(['a', 'b'], {
			...EMPTY_AGG,
			nodeExecutionStatusById: { a: 'success', b: 'unknown' },
		});
		expect(status).toBe('success');
	});

	it('returns undefined (idle) when all members are unknown — workflow has never executed', () => {
		const status = aggregateGroupStatus(['a', 'b'], {
			...EMPTY_AGG,
			nodeExecutionStatusById: { a: 'unknown', b: 'unknown' },
		});
		expect(status).toBeUndefined();
	});

	it('returns undefined when no member status is set', () => {
		const status = aggregateGroupStatus(['a', 'b'], EMPTY_AGG);
		expect(status).toBeUndefined();
	});

	it('running beats error', () => {
		const status = aggregateGroupStatus(['a', 'b'], {
			...EMPTY_AGG,
			nodeExecutionRunningById: { a: true },
			nodeHasIssuesById: { b: true },
		});
		expect(status).toBe('running');
	});

	it('error beats success', () => {
		const status = aggregateGroupStatus(['a', 'b'], {
			...EMPTY_AGG,
			nodeExecutionStatusById: { a: 'success', b: 'error' },
		});
		expect(status).toBe('error');
	});
});

describe('aggregateRunDataIterations', () => {
	it('returns the maximum iteration count across members', () => {
		expect(aggregateRunDataIterations(['a', 'b'], { a: 1, b: 5 })).toBe(5);
	});
	it('returns 0 when nothing is set', () => {
		expect(aggregateRunDataIterations(['a'], {})).toBe(0);
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
			autofocusGroupId: null,
			readOnly: false,
			aggregates: EMPTY_AGG,
			nodeExecutionRunDataIterationsById: {},
		});
	}

	it('emits one canvas-node-group VueFlow node per group', () => {
		const out = setup(true);
		expect(out).toHaveLength(1);
		expect(out[0].id).toBe('group:g1');
		expect(out[0].type).toBe('canvas-node-group');
	});

	it('left edge is anchored at memberRect.x - GROUP_PADDING_X in both states (AC #2)', () => {
		const collapsed = setup(true);
		const expanded = setup(false);
		expect(collapsed[0].position.x).toBe(100 - GROUP_PADDING_X);
		expect(expanded[0].position.x).toBe(100 - GROUP_PADDING_X);
	});

	it('top edge places title bar above memberRect (header above frame)', () => {
		const collapsed = setup(true);
		expect(collapsed[0].position.y).toBe(200 - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT);
	});

	it('collapsed width is fixed 400px', () => {
		const out = setup(true);
		expect(out[0].width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
	});

	it('expanded width matches member rect + 2 * GROUP_PADDING_X', () => {
		const out = setup(false);
		// member rect width = (400 + 96) - 100 = 396  (DEFAULT_NODE_SIZE = 96)
		const NODE_W = 96;
		expect(out[0].width).toBe(400 + NODE_W - 100 + 2 * GROUP_PADDING_X);
	});

	it('marks the node selectable when collapsed and editable; never connectable', () => {
		const out = setup(true);
		expect(out[0].selectable).toBe(true);
		expect(out[0].connectable).toBe(false);
	});

	it('marks the node NOT selectable when expanded — members are the interactive surface then', () => {
		const out = setup(false);
		expect(out[0].selectable).toBe(false);
	});

	it('marks the node not selectable when readOnly', () => {
		const getById = nodeStore(makeNode('a', 0, 0));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			autofocusGroupId: null,
			readOnly: true,
			aggregates: EMPTY_AGG,
			nodeExecutionRunDataIterationsById: {},
		});
		expect(out[0].selectable).toBe(false);
	});

	it('skips emitting a title bar for a group with zero existing members', () => {
		const getById = nodeStore(); // no nodes
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'gOrphan', name: 'Empty', nodeIds: ['ghost'] }],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			autofocusGroupId: null,
			readOnly: false,
			aggregates: EMPTY_AGG,
			nodeExecutionRunDataIterationsById: {},
		});
		expect(out).toHaveLength(0);
	});

	it('marks the node not draggable when readOnly', () => {
		const getById = nodeStore(makeNode('a', 0, 0));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			autofocusGroupId: null,
			readOnly: true,
			aggregates: EMPTY_AGG,
			nodeExecutionRunDataIterationsById: {},
		});
		expect(out[0].draggable).toBe(false);
	});

	it('writes autofocusTitle into data when group id matches autofocusGroupId', () => {
		const getById = nodeStore(makeNode('a', 0, 0));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			isGroupCollapsed: () => true,
			autofocusGroupId: 'g1',
			readOnly: false,
			aggregates: EMPTY_AGG,
			nodeExecutionRunDataIterationsById: {},
		});
		expect(out[0].data?.autofocusTitle).toBe(true);
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

describe('reanchorCollapsedConnections (AC #10)', () => {
	function makeEdge(
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

	it('drops edges entirely inside a collapsed group', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = reanchorCollapsedConnections([makeEdge('m1', 'm2')], collapsedMap);
		expect(result).toHaveLength(0);
	});

	it('rewrites endpoints when one side is inside a collapsed group', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = reanchorCollapsedConnections(
			[makeEdge('external', 'm1'), makeEdge('m2', 'external2')],
			collapsedMap,
		);
		expect(result).toHaveLength(2);
		const incoming = result.find((e) => e.source === 'external');
		expect(incoming?.target).toBe('group:g1');
		expect(incoming?.targetHandle).toBe('left');
		const outgoing = result.find((e) => e.target === 'external2');
		expect(outgoing?.source).toBe('group:g1');
		expect(outgoing?.sourceHandle).toBe('right');
	});

	it('leaves external-only edges untouched', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = reanchorCollapsedConnections([makeEdge('a', 'b')], collapsedMap);
		expect(result[0].source).toBe('a');
		expect(result[0].target).toBe('b');
	});

	it('dedupes two edges from the same external endpoint to two members of the same collapsed group', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = reanchorCollapsedConnections(
			[makeEdge('external', 'm1'), makeEdge('external', 'm2')],
			collapsedMap,
		);
		expect(result).toHaveLength(1);
		// The merged edge is flagged so getConnectionLabel can drop the label.
		expect((result[0].data as { merged?: boolean }).merged).toBe(true);
	});

	it('keeps distinct external endpoints as separate edges', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = reanchorCollapsedConnections(
			[makeEdge('extA', 'm1'), makeEdge('extB', 'm1')],
			collapsedMap,
		);
		expect(result).toHaveLength(2);
	});

	it('promotes status on dedupe (running beats success)', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const a = makeEdge('external', 'm1');
		(a.data as { status?: string }).status = 'success';
		const b = makeEdge('external', 'm2');
		(b.data as { status?: string }).status = 'running';
		const result = reanchorCollapsedConnections([a, b], collapsedMap);
		expect((result[0].data as { status?: string }).status).toBe('running');
	});

	it('promotes status on dedupe (error beats success and pinned)', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const a = makeEdge('external', 'm1');
		(a.data as { status?: string }).status = 'success';
		const b = makeEdge('external', 'm2');
		(b.data as { status?: string }).status = 'error';
		const c = makeEdge('external', 'm1', {
			sourceHandle: 'outputs/main/0',
			targetHandle: 'inputs/main/0',
			id: 'pinnedRoute',
		});
		(c.data as { status?: string }).status = 'pinned';
		const result = reanchorCollapsedConnections([a, b, c], collapsedMap);
		expect((result[0].data as { status?: string }).status).toBe('error');
	});

	it('preserves data.source.type so non-main edges still render dashed (AC #10)', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const aiEdge = makeEdge('external', 'm1');
		aiEdge.data = {
			source: { node: 'external', index: 0, type: 'ai_tool' as never },
			target: { node: 'm1', index: 0, type: 'ai_tool' as never },
		};
		const result = reanchorCollapsedConnections([aiEdge], collapsedMap);
		expect(result[0].data?.source.type).toBe('ai_tool');
	});

	it('structural invariant: no edge references a collapsed member as endpoint', () => {
		const collapsedMap = buildCollapsedGroupByNodeId([g1], () => true);
		const result = reanchorCollapsedConnections(
			[makeEdge('external', 'm1'), makeEdge('m2', 'external2'), makeEdge('m1', 'm2')],
			collapsedMap,
		);
		for (const edge of result) {
			expect(collapsedMap.has(edge.source)).toBe(false);
			expect(collapsedMap.has(edge.target)).toBe(false);
		}
	});
});

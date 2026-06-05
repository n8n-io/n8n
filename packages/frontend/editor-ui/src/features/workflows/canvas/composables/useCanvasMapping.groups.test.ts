import { describe, expect, it } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { computeNodesRectFromStore, mapGroupsToVueFlowNodes } from './useCanvasMapping.groups';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';
import { STICKY_NODE_TYPE } from '@/app/constants/nodeTypes';

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

describe('mapGroupsToVueFlowNodes', () => {
	const group: IWorkflowGroup = { id: 'g1', name: 'G', nodeIds: ['a', 'b'] };

	function setup() {
		const getById = nodeStore(makeNode('a', 100, 200), makeNode('b', 400, 200));
		return mapGroupsToVueFlowNodes({
			allGroups: [group],
			getNodeById: getById,
			readOnly: false,
		});
	}

	it('emits one canvas-node-group VueFlow node per group', () => {
		const out = setup();
		expect(out).toHaveLength(1);
		expect(out[0].id).toBe('group:g1');
		expect(out[0].type).toBe('canvas-node-group');
	});

	it('left edge sits at nodesRect.x - GROUP_PADDING_X, snapped to the canvas grid', () => {
		const out = setup();
		expect(out[0].position.x).toBe(snapToGrid(100 - GROUP_PADDING_X));
	});

	it('top edge places title bar above nodesRect, snapped to the canvas grid', () => {
		const out = setup();
		expect(out[0].position.y).toBe(snapToGrid(200 - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT));
	});

	it('width matches nodes rect + 2 * GROUP_PADDING_X', () => {
		const out = setup();
		// nodes rect width = (400 + 96) - 100 = 396  (DEFAULT_NODE_SIZE = 96)
		const NODE_W = 96;
		expect(out[0].width).toBe(400 + NODE_W - 100 + 2 * GROUP_PADDING_X);
	});

	it("marks the title bar not selectable and not connectable — the group's nodes are the interactive surface", () => {
		const out = setup();
		expect(out[0].selectable).toBe(false);
		expect(out[0].connectable).toBe(false);
	});

	it('skips emitting a title bar for a group with zero existing nodes', () => {
		const getById = nodeStore(); // no nodes
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'gOrphan', name: 'Empty', nodeIds: ['ghost'] }],
			getNodeById: getById,
			readOnly: false,
		});
		expect(out).toHaveLength(0);
	});

	it('marks the node not draggable when readOnly', () => {
		const getById = nodeStore(makeNode('a', 0, 0));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			readOnly: true,
		});
		expect(out[0].draggable).toBe(false);
	});

	it('position lands on the grid', () => {
		const getById = nodeStore(makeNode('a', 32, 48), makeNode('b', 128, 48));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a', 'b'] }],
			getNodeById: getById,
			readOnly: false,
		});
		expect(Math.abs(out[0].position.x % GRID_SIZE)).toBe(0);
		expect(Math.abs(out[0].position.y % GRID_SIZE)).toBe(0);
	});
});

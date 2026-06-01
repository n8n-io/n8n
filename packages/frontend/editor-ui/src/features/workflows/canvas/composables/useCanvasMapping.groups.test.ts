import { describe, expect, it } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { computeMemberRectFromStore, mapGroupsToVueFlowNodes } from './useCanvasMapping.groups';
import {
	GROUP_HEADER_HEIGHT,
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

describe('mapGroupsToVueFlowNodes', () => {
	const group: IWorkflowGroup = { id: 'g1', name: 'G', nodeIds: ['a', 'b'] };

	function setup() {
		const getById = nodeStore(makeNode('a', 100, 200), makeNode('b', 400, 200));
		return mapGroupsToVueFlowNodes({
			allGroups: [group],
			getNodeById: getById,
			autofocusGroupId: null,
			readOnly: false,
		});
	}

	it('emits one canvas-node-group VueFlow node per group', () => {
		const out = setup();
		expect(out).toHaveLength(1);
		expect(out[0].id).toBe('group:g1');
		expect(out[0].type).toBe('canvas-node-group');
	});

	it('left edge is anchored at memberRect.x - GROUP_PADDING_X', () => {
		const out = setup();
		expect(out[0].position.x).toBe(100 - GROUP_PADDING_X);
	});

	it('top edge places title bar above memberRect (header above frame)', () => {
		const out = setup();
		expect(out[0].position.y).toBe(200 - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT);
	});

	it('width matches member rect + 2 * GROUP_PADDING_X', () => {
		const out = setup();
		// member rect width = (400 + 96) - 100 = 396  (DEFAULT_NODE_SIZE = 96)
		const NODE_W = 96;
		expect(out[0].width).toBe(400 + NODE_W - 100 + 2 * GROUP_PADDING_X);
	});

	it('marks the node not selectable and not connectable — members are the interactive surface', () => {
		const out = setup();
		expect(out[0].selectable).toBe(false);
		expect(out[0].connectable).toBe(false);
	});

	it('skips emitting a title bar for a group with zero existing members', () => {
		const getById = nodeStore(); // no nodes
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'gOrphan', name: 'Empty', nodeIds: ['ghost'] }],
			getNodeById: getById,
			autofocusGroupId: null,
			readOnly: false,
		});
		expect(out).toHaveLength(0);
	});

	it('marks the node not draggable when readOnly', () => {
		const getById = nodeStore(makeNode('a', 0, 0));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			autofocusGroupId: null,
			readOnly: true,
		});
		expect(out[0].draggable).toBe(false);
	});

	it('writes autofocusTitle into data when group id matches autofocusGroupId', () => {
		const getById = nodeStore(makeNode('a', 0, 0));
		const out = mapGroupsToVueFlowNodes({
			allGroups: [{ id: 'g1', name: 'G', nodeIds: ['a'] }],
			getNodeById: getById,
			autofocusGroupId: 'g1',
			readOnly: false,
		});
		expect(out[0].data?.autofocusTitle).toBe(true);
	});
});

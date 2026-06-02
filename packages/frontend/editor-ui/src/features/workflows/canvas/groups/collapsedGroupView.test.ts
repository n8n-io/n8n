import { describe, it, expect } from 'vitest';

import { buildCollapsedGroupView, collapsedGroupNodeId } from './collapsedGroupView';
import type { CanvasConnection } from '../canvas.types';

function conn(id: string, source: string, target: string): CanvasConnection {
	return {
		id,
		source,
		target,
		sourceHandle: 'outputs/main/0',
		targetHandle: 'inputs/main/0',
		data: {
			source: { node: source, index: 0, type: 'main' },
			target: { node: target, index: 0, type: 'main' },
		},
	} as CanvasConnection;
}

const positions = new Map([
	['m1', { x: 400, y: 300 }],
	['m2', { x: 600, y: 300 }],
	['outA', { x: 0, y: 300 }],
	['outB', { x: 1000, y: 300 }],
]);

describe('buildCollapsedGroupView', () => {
	const group = { id: 'g1', name: 'Group 1', nodeIds: ['m1', 'm2'] };

	it('hides all members of collapsed groups', () => {
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			canvasConnections: [],
			nodePositionsById: positions,
		});
		expect(view.hiddenNodeIds).toEqual(new Set(['m1', 'm2']));
	});

	it('drops internal edges (both ends in the same group)', () => {
		const internal = conn('c-internal', 'm1', 'm2');
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			canvasConnections: [internal],
			nodePositionsById: positions,
		});
		expect(view.droppedConnectionIds.has('c-internal')).toBe(true);
		expect(view.connectionRewrites.has('c-internal')).toBe(false);
	});

	it('reroutes an incoming external edge to the group node left (input) handle', () => {
		const incoming = conn('c-in', 'outA', 'm1');
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			canvasConnections: [incoming],
			nodePositionsById: positions,
		});
		const rewrite = view.connectionRewrites.get('c-in');
		expect(rewrite?.source).toBe('outA');
		expect(rewrite?.target).toBe(collapsedGroupNodeId('g1'));
		expect(rewrite?.targetHandle).toBe('inputs/main/0');

		const node = view.nodes.find((n) => n.groupId === 'g1');
		expect(node?.incoming).toEqual([{ handleId: 'inputs/main/0', type: 'main' }]);
		expect(node?.outgoing).toEqual([]);
	});

	it('reroutes an outgoing external edge to the group node right (output) handle', () => {
		const outgoing = conn('c-out', 'm2', 'outB');
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			canvasConnections: [outgoing],
			nodePositionsById: positions,
		});
		const rewrite = view.connectionRewrites.get('c-out');
		expect(rewrite?.source).toBe(collapsedGroupNodeId('g1'));
		expect(rewrite?.sourceHandle).toBe('outputs/main/0');
		expect(rewrite?.target).toBe('outB');

		const node = view.nodes.find((n) => n.groupId === 'g1');
		expect(node?.outgoing).toEqual([{ handleId: 'outputs/main/0', type: 'main' }]);
	});

	it('assigns one distinct handle per external connection', () => {
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			canvasConnections: [conn('c1', 'outA', 'm1'), conn('c2', 'outA', 'm2')],
			nodePositionsById: positions,
		});
		const node = view.nodes.find((n) => n.groupId === 'g1');
		expect(node?.incoming.map((h) => h.handleId)).toEqual(['inputs/main/0', 'inputs/main/1']);
	});

	it('reroutes both ends when an edge runs between two collapsed groups', () => {
		const g2 = { id: 'g2', name: 'Group 2', nodeIds: ['outB'] };
		const between = conn('c-between', 'm1', 'outB');
		const view = buildCollapsedGroupView({
			collapsedGroups: [group, g2],
			canvasConnections: [between],
			nodePositionsById: positions,
		});
		const rewrite = view.connectionRewrites.get('c-between');
		expect(rewrite?.source).toBe(collapsedGroupNodeId('g1'));
		expect(rewrite?.target).toBe(collapsedGroupNodeId('g2'));
	});

	it('anchors the synthetic node at the member bbox top-left minus frame padding', () => {
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			canvasConnections: [],
			nodePositionsById: positions,
		});
		const node = view.nodes.find((n) => n.groupId === 'g1');
		// min member x=400, y=300; minus GROUP_PADDING_X(56) / (PADDING_Y_TOP 40 + HEADER 40).
		expect(node?.position).toEqual({ x: 400 - 56, y: 300 - 40 - 40 });
	});

	it('skips groups whose members are not on the canvas', () => {
		const view = buildCollapsedGroupView({
			collapsedGroups: [{ id: 'ghost', name: 'Ghost', nodeIds: ['nope'] }],
			canvasConnections: [],
			nodePositionsById: positions,
		});
		expect(view.nodes).toEqual([]);
		expect(view.hiddenNodeIds.size).toBe(0);
	});
});

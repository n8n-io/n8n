import { describe, it, expect } from 'vitest';

import { buildCollapsedGroupView, collapsedGroupNodeId } from './collapsedGroupView';
import type { CanvasConnection } from '../canvas.types';
import {
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
	GROUP_HEADER_HEIGHT,
} from '../stores/canvasNodeGroups.constants';

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

	it('assigns one connector per boundary member node (distinct members → distinct connectors)', () => {
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			canvasConnections: [conn('c1', 'outA', 'm1'), conn('c2', 'outA', 'm2')],
			nodePositionsById: positions,
		});
		const node = view.nodes.find((n) => n.groupId === 'g1');
		expect(node?.incoming.map((h) => h.handleId)).toEqual(['inputs/main/0', 'inputs/main/1']);
	});

	it('shares one connector for multiple external lines from the same member node', () => {
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			// Both lines leave the same member (m1) to different outside nodes.
			canvasConnections: [conn('x1', 'm1', 'outA'), conn('x2', 'm1', 'outB')],
			nodePositionsById: positions,
		});
		const node = view.nodes.find((n) => n.groupId === 'g1');
		expect(node?.outgoing).toEqual([{ handleId: 'outputs/main/0', type: 'main' }]);
		// Both rerouted edges point at the same shared connector.
		expect(view.connectionRewrites.get('x1')?.sourceHandle).toBe('outputs/main/0');
		expect(view.connectionRewrites.get('x2')?.sourceHandle).toBe('outputs/main/0');
	});

	it('shares one incoming connector for multiple external lines into the same member node', () => {
		const view = buildCollapsedGroupView({
			collapsedGroups: [group],
			canvasConnections: [conn('i1', 'outA', 'm1'), conn('i2', 'outB', 'm1')],
			nodePositionsById: positions,
		});
		const node = view.nodes.find((n) => n.groupId === 'g1');
		expect(node?.incoming).toEqual([{ handleId: 'inputs/main/0', type: 'main' }]);
		expect(view.connectionRewrites.get('i1')?.targetHandle).toBe('inputs/main/0');
		expect(view.connectionRewrites.get('i2')?.targetHandle).toBe('inputs/main/0');
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
		// min member x=400, y=300; minus GROUP_PADDING_X / (PADDING_Y_TOP + HEADER).
		expect(node?.position).toEqual({
			x: 400 - GROUP_PADDING_X,
			y: 300 - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT,
		});
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

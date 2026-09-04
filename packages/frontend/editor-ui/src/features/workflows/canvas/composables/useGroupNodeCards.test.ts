import { computed } from 'vue';
import { describe, expect, it } from 'vitest';
import { GROUP_NODE_TYPE, NodeConnectionTypes, type IConnections } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

import { useGroupNodeCards } from './useGroupNodeCards';

function makeNode(overrides: Partial<INodeUi> & Pick<INodeUi, 'id' | 'name'>): INodeUi {
	return {
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function makeGroup(id: string, name: string, overrides: Partial<INodeUi> = {}): INodeUi {
	return makeNode({
		id,
		name,
		type: GROUP_NODE_TYPE,
		...overrides,
	});
}

function setup(nodes: INodeUi[], connections: IConnections = {}) {
	return useGroupNodeCards(
		computed(() => nodes),
		computed(() => connections),
	);
}

describe('useGroupNodeCards', () => {
	it('maps a group node onto the group shape the renderer takes', () => {
		const { allGroups } = setup([
			makeGroup('g1', 'End', { parameters: { objective: 'extract and load' } }),
			makeNode({ id: 'n1', name: 'Extract', parentId: 'g1' }),
			makeNode({ id: 'n2', name: 'Loose' }),
		]);

		expect(allGroups.value).toEqual([
			{ id: 'g1', name: 'End', nodeIds: ['n1'], description: 'extract and load' },
		]);
	});

	it('omits the description when the objective is empty or not a string', () => {
		const { allGroups } = setup([
			makeGroup('g1', 'A', { parameters: { objective: '' } }),
			makeGroup('g2', 'B', { parameters: {} }),
			makeGroup('g3', 'C', { parameters: { objective: 42 } }),
		]);

		for (const group of allGroups.value) {
			expect(group.description).toBeUndefined();
		}
	});

	it('reports a group with no members as empty', () => {
		const { isEmptyGroup } = setup([
			makeGroup('g1', 'Empty'),
			makeGroup('g2', 'Filled'),
			makeNode({ id: 'n1', name: 'Member', parentId: 'g2' }),
		]);

		expect(isEmptyGroup('g1')).toBe(true);
		expect(isEmptyGroup('g2')).toBe(false);
	});

	it('reads the card position from the group node itself', () => {
		const { getGroupOwnPosition } = setup([makeGroup('g1', 'Plan', { position: [120, 80] })]);

		expect(getGroupOwnPosition('g1')).toEqual({ x: 120, y: 80 });
		expect(getGroupOwnPosition('missing')).toBeUndefined();
	});

	// A boundary edge fans to the nodes it really reaches, so the canvas needs
	// every interior entry node, not just the first member.
	it('reports every interior entry node of a group', () => {
		const nodes = [
			makeGroup('g1', 'Work'),
			makeNode({ id: 'n1', name: 'First', parentId: 'g1' }),
			makeNode({ id: 'n2', name: 'Second', parentId: 'g1' }),
			makeNode({ id: 'n3', name: 'Third', parentId: 'g1' }),
		];
		// First -> Third, so Third is fed from inside and is not an entry.
		const connections: IConnections = {
			First: {
				[NodeConnectionTypes.Main]: [[{ node: 'Third', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		};

		const { getGroupEntryNodeNames } = setup(nodes, connections);

		expect(getGroupEntryNodeNames('g1')).toEqual(['First', 'Second']);
		expect(getGroupEntryNodeNames('missing')).toEqual([]);
	});

	it('ignores nodes whose parentId names no group', () => {
		const { allGroups } = setup([makeNode({ id: 'n1', name: 'Orphan', parentId: 'gone' })]);

		expect(allGroups.value).toEqual([]);
	});
});

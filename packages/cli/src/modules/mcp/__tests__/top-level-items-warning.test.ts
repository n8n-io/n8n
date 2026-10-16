import type { IConnections, INode } from 'n8n-workflow';

import { topLevelItemsWarning } from '../tools/workflow-builder/top-level-items-warning';

const makeNodes = (count: number): INode[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `n${i}`,
		name: `Node ${i}`,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [i * 200, 0],
		parameters: {},
	}));

describe('topLevelItemsWarning', () => {
	test('returns nothing when the canvas is within the ceiling', () => {
		expect(topLevelItemsWarning({ nodes: makeNodes(7), connections: {} })).toBeUndefined();
	});

	test('returns one warning naming the loose nodes when the canvas is over the ceiling', () => {
		const warning = topLevelItemsWarning({ nodes: makeNodes(8), connections: {} });

		expect(warning?.code).toBe('TOP_LEVEL_ITEMS_OVER_CEILING');
		expect(warning?.message).toContain('Node 0');
	});

	test('counts a collapsed group as one box', () => {
		const nodes = makeNodes(8);
		const nodeGroups = [{ id: 'g1', name: 'Stage', nodeIds: nodes.slice(0, 4).map((n) => n.id) }];

		expect(topLevelItemsWarning({ nodes, connections: {}, nodeGroups })).toBeUndefined();
	});

	test('does not count a sub-node as a box', () => {
		const nodes = makeNodes(8);
		const connections: IConnections = {
			'Node 7': { ai_tool: [[{ node: 'Node 0', type: 'ai_tool', index: 0 }]] },
		};

		expect(topLevelItemsWarning({ nodes, connections })).toBeUndefined();
	});
});

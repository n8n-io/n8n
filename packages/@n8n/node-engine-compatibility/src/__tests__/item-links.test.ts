import type { WorkflowGraph } from '@n8n/engine';
import type { INodeExecutionData, ISourceData } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	convergingSlots,
	itemLinks,
	linkInputItems,
	relinkOutputItems,
	type ItemLinks,
} from '../item-links';

const namesById = new Map([
	['a', 'A'],
	['b', 'B'],
]);
const fromA: ISourceData = { previousNode: 'A', previousNodeOutput: 0 };
const fromB: ISourceData = { previousNode: 'B', previousNodeOutput: 0 };

const item = (n: number): INodeExecutionData => ({ json: { n } });
const source = (nodeId: string, itemCount: number, iteration = 0) => ({
	nodeId,
	outputIndex: 0,
	iteration,
	offset: 0,
	itemCount,
});

describe('convergingSlots', () => {
	it('names the input slots of a node that more than one edge feeds', () => {
		const graph: WorkflowGraph = {
			nodes: [],
			edges: [
				{ from: 'a', to: 'n', outputIndex: 0, inputIndex: 0 },
				{ from: 'b', to: 'n', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'n', outputIndex: 1, inputIndex: 1 },
				{ from: 'b', to: 'other', outputIndex: 0, inputIndex: 1 },
			],
		};

		expect(convergingSlots(graph, 'n')).toEqual(new Set([0]));
	});
});

describe('itemLinks', () => {
	it('gives the items of a slot that one edge feeds no link', () => {
		expect(itemLinks([[source('a', 2)]], new Set(), namesById)).toEqual([[]]);
	});

	it('links every item of a slot that several edges feed to the source it came from', () => {
		expect(itemLinks([[source('a', 1), source('b', 2)]], new Set([0]), namesById)).toEqual([
			[
				{ item: 0, sourceOverwrite: { ...fromA, previousNodeRun: 0 } },
				{ item: 0, sourceOverwrite: { ...fromB, previousNodeRun: 0 } },
				{ item: 1, sourceOverwrite: { ...fromB, previousNodeRun: 0 } },
			],
		]);
	});

	it('names the iteration of a source inside a loop', () => {
		expect(itemLinks([[source('a', 1, 2), source('b', 1)]], new Set([0]), namesById)).toEqual([
			[
				{ item: 0, sourceOverwrite: { ...fromA, previousNodeRun: 2 } },
				{ item: 0, sourceOverwrite: { ...fromB, previousNodeRun: 0 } },
			],
		]);
	});
});

describe('linkInputItems', () => {
	const links: ItemLinks = [[{ item: 0 }, { item: 0, sourceOverwrite: fromB }], [{ item: 0 }]];

	it('stamps each input item with its link, naming the slot after the first', () => {
		expect(linkInputItems([[item(1), item(2)], [item(3)]], links)).toEqual([
			[
				{ json: { n: 1 }, pairedItem: { item: 0 } },
				{ json: { n: 2 }, pairedItem: { item: 0, sourceOverwrite: fromB } },
			],
			[{ json: { n: 3 }, pairedItem: { item: 0, input: 1 } }],
		]);
	});

	it('links an item without a source by its position', () => {
		expect(linkInputItems([[item(1)]], [[]])).toEqual([
			[{ json: { n: 1 }, pairedItem: { item: 0 } }],
		]);
	});
});

describe('relinkOutputItems', () => {
	// slot 0: item 0 has no source, item 1 from B; slot 1: item 0 from B
	const links: ItemLinks = [
		[{ item: 0 }, { item: 0, sourceOverwrite: fromB }],
		[{ item: 0, sourceOverwrite: fromB }],
	];

	it('rewrites a numeric link into the second contribution', () => {
		expect(relinkOutputItems([[{ json: {}, pairedItem: 1 }]], links)).toEqual([
			[{ json: {}, pairedItem: { item: 0, sourceOverwrite: fromB } }],
		]);
	});

	it('keeps a link into an item that carries no source', () => {
		const outputs = [
			[
				{ json: {}, pairedItem: 0 },
				{ json: {}, pairedItem: { item: 0 } },
			],
		];

		expect(relinkOutputItems(outputs, links)).toEqual(outputs);
	});

	it('rewrites each entry of an array link', () => {
		const outputs = [[{ json: {}, pairedItem: [{ item: 0 }, { item: 1 }] }]];

		expect(relinkOutputItems(outputs, links)).toEqual([
			[{ json: {}, pairedItem: [{ item: 0 }, { item: 0, sourceOverwrite: fromB }] }],
		]);
	});

	it('uses the slot named by input for a multi-input node', () => {
		const outputs = [[{ json: {}, pairedItem: { item: 0, input: 1 } }]];

		expect(relinkOutputItems(outputs, links)).toEqual([
			[{ json: {}, pairedItem: { item: 0, input: 1, sourceOverwrite: fromB } }],
		]);
	});

	it('leaves a link that already carries a source overwrite alone', () => {
		const outputs = [[{ json: {}, pairedItem: { item: 1, sourceOverwrite: fromA } }]];

		expect(relinkOutputItems(outputs, links)).toEqual(outputs);
	});

	it('leaves items without a link alone', () => {
		const outputs = [[{ json: {} }, { json: {}, pairedItem: { item: 9 } }]];

		expect(relinkOutputItems(outputs, links)).toEqual(outputs);
	});
});

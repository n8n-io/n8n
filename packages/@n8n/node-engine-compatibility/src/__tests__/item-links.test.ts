import type { StepInputSources } from '@n8n/engine';
import type { INodeExecutionData, ISourceData } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { itemLinks, linkInputItems, relinkOutputItems, type ItemLinks } from '../item-links';

const namesById = new Map([
	['a', 'A'],
	['b', 'B'],
]);
const fromA: ISourceData = { previousNode: 'A', previousNodeOutput: 0 };
const fromB: ISourceData = { previousNode: 'B', previousNodeOutput: 0 };

const item = (n: number): INodeExecutionData => ({ json: { n } });

describe('itemLinks', () => {
	it('links a single-source slot by position', () => {
		const sources: StepInputSources = [
			[{ nodeId: 'a', outputIndex: 0, iteration: 0, itemCount: 2 }],
		];

		expect(itemLinks(sources, [fromA], namesById)).toEqual([[{ item: 0 }, { item: 1 }]]);
	});

	it('offsets a second contribution and names its source', () => {
		const sources: StepInputSources = [
			[
				{ nodeId: 'a', outputIndex: 0, iteration: 0, itemCount: 1 },
				{ nodeId: 'b', outputIndex: 0, iteration: 0, itemCount: 2 },
			],
		];

		expect(itemLinks(sources, [fromA], namesById)).toEqual([
			[{ item: 0 }, { item: 0, sourceOverwrite: fromB }, { item: 1, sourceOverwrite: fromB }],
		]);
	});

	it('names the source when the first graph edge is dead', () => {
		// The slot's recorded source is A, but only B delivered items.
		const sources: StepInputSources = [
			[{ nodeId: 'b', outputIndex: 0, iteration: 0, itemCount: 2 }],
		];

		expect(itemLinks(sources, [fromA], namesById)).toEqual([
			[
				{ item: 0, sourceOverwrite: fromB },
				{ item: 1, sourceOverwrite: fromB },
			],
		]);
	});

	it('carries the pass of a contribution inside a loop', () => {
		const sources: StepInputSources = [
			[
				{ nodeId: 'a', outputIndex: 0, iteration: 2, itemCount: 1 },
				{ nodeId: 'b', outputIndex: 1, iteration: 2, itemCount: 1 },
			],
		];

		expect(itemLinks(sources, [fromA], namesById)).toEqual([
			[
				{ item: 0 },
				{
					item: 0,
					sourceOverwrite: { previousNode: 'B', previousNodeOutput: 1, previousNodeRun: 2 },
				},
			],
		]);
	});

	it('leaves a slot without contributions empty', () => {
		const sources: StepInputSources = [
			[],
			[{ nodeId: 'b', outputIndex: 0, iteration: 0, itemCount: 1 }],
		];

		expect(itemLinks(sources, [fromA, fromB], namesById)).toEqual([[], [{ item: 0 }]]);
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
	// slot 0: item 0 from A, item 1 from B; slot 1: item 0 from B
	const links: ItemLinks = [
		[{ item: 0 }, { item: 0, sourceOverwrite: fromB }],
		[{ item: 0, sourceOverwrite: fromB }],
	];

	it('rewrites a numeric link into the second contribution', () => {
		expect(relinkOutputItems([[{ json: {}, pairedItem: 1 }]], links)).toEqual([
			[{ json: {}, pairedItem: { item: 0, sourceOverwrite: fromB } }],
		]);
	});

	it('keeps a link into the first contribution as it is', () => {
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
		const outputs = [[{ json: {}, pairedItem: { item: 5, sourceOverwrite: fromA } }]];

		expect(relinkOutputItems(outputs, links)).toEqual(outputs);
	});

	it('leaves items without a link alone', () => {
		const outputs = [[{ json: {} }, { json: {}, pairedItem: { item: 9 } }]];

		expect(relinkOutputItems(outputs, links)).toEqual(outputs);
	});
});

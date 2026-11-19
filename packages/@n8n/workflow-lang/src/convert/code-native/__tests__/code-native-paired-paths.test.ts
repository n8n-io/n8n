/**
 * Paired reads of another node through a node that changes the count of items, against
 * n8n's real task runner. The graph is `Source` (items) → `Filter` (some of them, with their
 * paired item) → the Code node, so the paired item of the input is not the position.
 *
 * v1's forms, recorded from the task runner:
 * - `$('Source').item` in "each item" mode: the item of Source that pairs with the current
 *   input item. In "all items" mode: the item that pairs with input item 0.
 * - `$('Source').itemMatching(k)`: the item of Source that pairs with input item k, in both
 *   modes, with v1's error `Can’t get data` for an input index that is not there.
 * - `$node["Source"].json`: the item at the index of the current item, so it follows no
 *   paired item at all.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';
import type { CodeMode } from '../translate.ts';

useUtc();

/** Five items of the source node. */
const SOURCE = [{ n: 10 }, { n: 20 }, { n: 30 }, { n: 40 }, { n: 50 }];

interface Shape {
	/** The items of the Filter, which are the input items of the code. */
	kept: unknown[];
	/** The paired item of each kept item: the index of the item of Source. */
	paired: number[];
}

/** A Filter that keeps the items 0, 2 and 4 of five items. */
const KEPT_3: Shape = { kept: [SOURCE[0], SOURCE[2], SOURCE[4]], paired: [0, 2, 4] };
/** A Filter that keeps one item of five. */
const KEPT_1: Shape = { kept: [SOURCE[2]], paired: [2] };
/** A Filter that keeps all five items in another order. */
const SORTED: Shape = {
	kept: [SOURCE[4], SOURCE[1], SOURCE[3], SOURCE[0], SOURCE[2]],
	paired: [4, 1, 3, 0, 2],
};
/** Five input items whose positions pass the last item of a node of two items. */
const PAST: Shape = {
	kept: [SOURCE[0], SOURCE[1], SOURCE[2], SOURCE[3], SOURCE[4]],
	paired: [0, 1, 0, 1, 0],
};

/** The `pairedIndex` that the converter gives the code for node "Source". */
const PAIRS = '__wf_pairs';

const tracked = () => (name: string) =>
	name === 'Source'
		? {
				values: [{ param: PAIRS, value: 'the pairs of the workflow' }],
				at: (k: string) => `${PAIRS}[${k}]`,
			}
		: null;

interface Case {
	name: string;
	code: string;
	mode: CodeMode;
	shape: Shape;
}

const CASES: Case[] = [
	{
		name: 'each .item',
		code: 'return { json: { n: $("Source").item.json.n } };',
		mode: 'each',
		shape: KEPT_3,
	},
	{
		name: 'each .item of a sorted input',
		code: 'return { json: { n: $("Source").item.json.n } };',
		mode: 'each',
		shape: SORTED,
	},
	{
		name: 'each .item of one input item',
		code: 'return { json: { n: $("Source").item.json.n } };',
		mode: 'each',
		shape: KEPT_1,
	},
	{
		name: 'each $node json follows the position',
		code: 'return { json: { n: $node["Source"].json.n } };',
		mode: 'each',
		shape: KEPT_3,
	},
	{
		name: 'each $node json past the last item of the node',
		code: 'return { json: { n: $node["Source"].json.n } };',
		mode: 'each',
		shape: PAST,
	},
	{
		name: 'each .itemMatching(0)',
		code: 'return { json: { n: $("Source").itemMatching(0).json.n } };',
		mode: 'each',
		shape: KEPT_3,
	},
	{
		name: 'each .itemMatching(2)',
		code: 'return { json: { n: $("Source").itemMatching(2).json.n } };',
		mode: 'each',
		shape: KEPT_3,
	},
	{
		name: 'each .itemMatching(3) is past the input',
		code: 'return { json: { n: $("Source").itemMatching(3).json.n } };',
		mode: 'each',
		shape: KEPT_3,
	},
	{
		name: 'all .item is the pair of item 0',
		code: 'return [{ json: { n: $("Source").item.json.n } }];',
		mode: 'all',
		shape: KEPT_3,
	},
	{
		name: 'all .item of a sorted input is the pair of item 0',
		code: 'return [{ json: { n: $("Source").item.json.n } }];',
		mode: 'all',
		shape: SORTED,
	},
	{
		name: 'all $node json is the first item',
		code: 'return [{ json: { n: $node["Source"].json.n } }];',
		mode: 'all',
		shape: KEPT_3,
	},
	{
		name: 'all .itemMatching(0)',
		code: 'return [{ json: { n: $("Source").itemMatching(0).json.n } }];',
		mode: 'all',
		shape: KEPT_3,
	},
	{
		name: 'all .itemMatching(2)',
		code: 'return [{ json: { n: $("Source").itemMatching(2).json.n } }];',
		mode: 'all',
		shape: KEPT_3,
	},
	{
		name: 'all .itemMatching of each item',
		code: 'return items.map((item, k) => ({ json: { n: $("Source").itemMatching(k).json.n } }));',
		mode: 'all',
		shape: SORTED,
	},
];

describe.skipIf(!taskRunnerAvailable())('paired reads through a node that drops items', () => {
	beforeAll(async () => await startRunner(), 120_000);

	it.each(CASES)('$name agrees with the task runner', async (c) => {
		const source = c.shape === PAST ? SOURCE.slice(0, 2) : SOURCE;
		const runner = await runnerCode(c.code, c.mode, c.shape.kept, {
			nodes: { Source: source },
			fixed: { Input: { items: c.shape.kept, paired: c.shape.paired } },
		});
		const native = nativeCode(c.code, c.mode, c.shape.kept, {
			nodes: { Source: source },
			known: {
				pairedIndex: tracked(),
			} as never,
			pairValues: [c.shape.paired],
		});
		expect(native).toEqual(runner);
	});
});

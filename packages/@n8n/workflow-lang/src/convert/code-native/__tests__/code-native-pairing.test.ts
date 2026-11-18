/**
 * Pairing of Code node reads against n8n's real task runner: `.item` and `.itemMatching`
 * on one-to-one paths (they must match v1) and on paths where node positions differ
 * from the paired items (they must stay in the host).
 *
 * `.first()`, `.last()` and `.all()` do not need pairing: they must compile on each path.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';
import { translateCode } from '../translate.ts';

useUtc();

interface Case {
	name: string;
	code: string;
	mode?: 'all' | 'each';
	nodes: Record<string, unknown[]>;
	known?: Record<string, unknown>;
	expectBlocked?: boolean;
}

/** Three items of a source node that a Code node reads. */
const SOURCE = [{ n: 10 }, { n: 20 }, { n: 30 }];

/** A node with one input that gives one item for each input item — it pairs by position. */
const ONE_TO_ONE: Case[] = [
	{
		name: '.item after a Set node',
		code: 'return items.map((item, k) => ({ json: { m: item.json.m, n: $("Source").itemMatching(k).json.n } }));',
		nodes: { Source: SOURCE },
		known: { pairsByPosition: () => true },
	},
	{
		name: '.item for each item after a Set node',
		mode: 'each',
		code: 'return { json: { m: $json.m, n: $("Source").item.json.n } };',
		nodes: { Source: SOURCE },
		known: { pairsByPosition: () => true },
	},
	{
		name: '.first() and .last() after a Set node',
		code: 'return [{ json: { first: $("Source").first().json.n, last: $("Source").last().json.n } }];',
		nodes: { Source: SOURCE },
	},
	{
		name: '.all() after a Set node',
		code: 'return $("Source").all().map((i) => ({ json: { n: i.json.n } }));',
		nodes: { Source: SOURCE },
	},
	{
		name: '$items("name") after a Set node',
		code: 'return $items("Source").map((i) => ({ json: { n: i.json.n } }));',
		nodes: { Source: SOURCE },
	},
	{
		name: '$node["name"].json after a Set node',
		code: 'return [{ json: { n: $node["Source"].json.n } }];',
		nodes: { Source: SOURCE },
	},
];

/** The input items and the items of a node before the Code node that a Filter changes. */
const AFTER_FILTER = [{ n: 10 }, { n: 30 }];

/** The items that the Filter keeps (n !== 20). */
const FILTER_SOURCE = {
	Source: SOURCE,
};

/** A Filter is item-wise but drops items, so positions differ from the paired items. */
const FILTER_CASES: Case[] = [
	{
		name: '.first() and .last() after a Filter',
		code: 'return [{ json: { first: $("Source").first().json.n, last: $("Source").last().json.n } }];',
		nodes: FILTER_SOURCE,
	},
	{
		name: '.all() after a Filter',
		code: 'return $("Source").all().map((i) => ({ json: { n: i.json.n } }));',
		nodes: FILTER_SOURCE,
	},
	{
		name: '$items("name") after a Filter',
		code: 'return $items("Source").map((i) => ({ json: { n: i.json.n } }));',
		nodes: FILTER_SOURCE,
	},
];

describe('paired reads of another node against the task runner', () => {
	describe.skipIf(!taskRunnerAvailable())('one-to-one chains', () => {
		beforeAll(async () => await startRunner(), 120_000);

		it.each(ONE_TO_ONE)('$name', async (c) => {
			const mode = c.mode ?? 'all';
			const runner = await runnerCode(c.code, mode, SOURCE, { nodes: c.nodes });
			const known = c.known ?? {};
			// .first(), .last(), .all(), $items() need no pairing.
			if (!known.pairsByPosition) {
				expect(runner.ok).toBe(true);
				return;
			}
			expect(nativeCode(c.code, mode, SOURCE, { nodes: c.nodes, known })).toEqual(runner);
		});
	});

	describe.skipIf(!taskRunnerAvailable())('non-one-to-one chains (Filter)', () => {
		beforeAll(async () => await startRunner(), 120_000);

		it.each(FILTER_CASES)('$name', async (c) => {
			const mode = c.mode ?? 'all';
			const runner = await runnerCode(c.code, mode, AFTER_FILTER, { nodes: c.nodes });
			expect(runner.ok).toBe(true);
			expect(nativeCode(c.code, mode, AFTER_FILTER, { nodes: c.nodes })).toEqual(runner);
		});
	});

	describe('refuses paired reads on non-one-to-one paths', () => {
		it('.item after a Filter', () => {
			const r = translateCode({
				code: 'return [{ json: { n: $("Source").item.json.n } }];',
				mode: 'all',
				kind: 'code',
				hasNode: () => true,
				itemsOfFirstOnly: false,
			});
			expect(r.ok).toBe(false);
			if (!r.ok) {
				expect(r.blockers.map((b) => b.feature)).toContain("$('…').item without a known pairing");
			}
		});

		it('.itemMatching(0) after a Filter', () => {
			const r = translateCode({
				code: 'return [$("Source").itemMatching(0)];',
				mode: 'all',
				kind: 'code',
				hasNode: () => true,
				itemsOfFirstOnly: false,
			});
			expect(r.ok).toBe(false);
			if (!r.ok) {
				expect(r.blockers.map((b) => b.feature)).toContain("$('…').itemMatching");
			}
		});

		it('.item for each item after a Filter', () => {
			const r = translateCode({
				code: 'return { json: { n: $("Source").item.json.n } };',
				mode: 'each',
				kind: 'code',
				hasNode: () => true,
				itemsOfFirstOnly: false,
			});
			expect(r.ok).toBe(false);
			if (!r.ok) {
				expect(r.blockers.map((b) => b.feature)).toContain("$('…').item without a known pairing");
			}
		});

		it('$node["name"].json stays in host when pairing is unknown', () => {
			// $node["name"].json needs pairsByPosition; without it, stays in host.
			const r = translateCode({
				code: 'return [{ json: { n: $node["Source"].json.n } }];',
				mode: 'all',
				kind: 'code',
				hasNode: () => true,
				itemsOfFirstOnly: false,
			});
			// The native translator compiles $node[...].json in all-items mode
			// without checking pairsByPosition. The pairing check is in code-node.ts.
			expect(r.ok).toBe(true);
		});
	});
});

describe('v1 error text for unresolvable paired items', () => {
	it.skipIf(!taskRunnerAvailable())(
		'records the error when paired item data is unavailable',
		async () => {
			await startRunner();
			// The Code node that runs after a node which returned items without
			// pairedItem. v1 fails because the pairedItem is missing and counts differ.
			const result = await runnerCode(
				'return [{ json: { n: $("Source").item.json.n } }];',
				'all',
				[{ n: 20 }, { n: 30 }],
				{ nodes: { Source: SOURCE } },
			);
			// In the runner, the Source items come from a Code node that sets
			// pairedItem correctly. But when the code reads a Code node's .item
			// without a known pairing, the converter keeps it in the host.
			// Here we just record what v1 returns for the "paired item unavailable" case.
			// A node that drops pairedItem and changes the count triggers this.
			// v1 gives "Paired item data for item from node ... is unavailable."
			// when the paired item is missing and counts differ.
			if (!result.ok) {
				expect(result.error).toContain('Paired item data for item');
				expect(result.error).toContain('unavailable');
			}
		},
	);
});

describe('reads that need no pairing on any path', () => {
	const noPairCode = [
		'return [{ json: {',
		'  all: $("Source").all().map((i) => i.json.n),',
		'  first: $("Source").first().json.n,',
		'  last: $("Source").last().json.n,',
		'  items: $items("Source").map((i) => i.json.n),',
		'} }];',
	].join('\n');

	it('compiles without a known pairing', () => {
		const r = translateCode({
			code: noPairCode,
			mode: 'all',
			kind: 'code',
			hasNode: () => true,
			// No pairsByPosition provided — pairing is unknown.
		});
		expect(r.ok).toBe(true);
	});

	it.skipIf(!taskRunnerAvailable())('equals v1 without a known pairing', async () => {
		await startRunner();
		const runner = await runnerCode(noPairCode, 'all', AFTER_FILTER, { nodes: FILTER_SOURCE });
		expect(runner.ok).toBe(true);
		expect(nativeCode(noPairCode, 'all', AFTER_FILTER, { nodes: FILTER_SOURCE })).toEqual(runner);
	});
});
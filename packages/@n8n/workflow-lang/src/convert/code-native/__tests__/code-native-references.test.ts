/**
 * Reads of other nodes in native Code nodes against n8n's real task runner
 * (`runner-oracle.ts`): `$items` with an output and a run, `.all()`, `.first()` and `.last()`
 * with arguments, and the paired items of `.itemMatching(k)` and `.item`.
 *
 * The oracle workflow is a chain: each node gives one item for each input item, so v1 pairs
 * the items by position. The cases are made up. Without the built n8n CLI and task runner
 * packages the suite is skipped.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { runReference, useUtc } from '../../../reference/runner.ts';
import { convertWorkflow } from '../../index.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

interface Case {
	name: string;
	code: string;
	mode?: CodeMode;
}

const ITEMS = [{ a: 1 }, { a: 2 }, { a: 3 }];
const NODES = { Source: [{ n: 10 }, { n: 20 }, { n: 30 }] };
const KNOWN = { pairsByPosition: () => true };

const CASES: Case[] = [
	{
		name: '$items() gives the input items',
		code: 'return $items().map((i) => ({ json: i.json }));',
	},
	{ name: '$items(name, 0, 0)', code: 'return $items("Source", 0, 0);' },
	{ name: '$items(name, 0, -1)', code: 'return $items("Source", 0, -1);' },
	{ name: '.all(0, 0)', code: 'return $("Source").all(0, 0);' },
	{ name: '.all(0)', code: 'return $("Source").all(0);' },
	{ name: '.all(0, -1)', code: 'return $("Source").all(0, -1);' },
	{
		name: '.first(0, 0) and .last(0)',
		code: 'return [$("Source").first(0, 0), $("Source").last(0)];',
	},
	{ name: '.itemMatching(0)', code: 'return [$("Source").itemMatching(0)];' },
	{ name: '.itemMatching(2)', code: 'return [$("Source").itemMatching(2)];' },
	{
		name: '.itemMatching of the text of an index',
		code: 'return [$("Source").itemMatching("1")];',
	},
	{ name: '.itemMatching after the last item', code: 'return [$("Source").itemMatching(3)];' },
	{ name: '.itemMatching(-1)', code: 'const k = -1;\nreturn [$("Source").itemMatching(k)];' },
	{ name: '.itemMatching(1.5)', code: 'return [$("Source").itemMatching(1.5)];' },
	{ name: '.itemMatching(null)', code: 'return [$("Source").itemMatching(null)];' },
	{ name: '.itemMatching(undefined)', code: 'return [$("Source").itemMatching(undefined)];' },
	{
		name: '.itemMatching(k) in a map',
		code: 'return items.map((item, k) => ({ json: { a: item.json.a, n: $("Source").itemMatching(k).json.n } }));',
	},
	{
		name: '.itemMatching(k) in a loop on line 3',
		code: 'const out = [];\nfor (let k = 0; k <= items.length; k++) {\n  out.push({ json: { n: $("Source").itemMatching(k).json.n } });\n}\nreturn out;',
	},
	{
		name: '.itemMatching($itemIndex) for each item',
		mode: 'each',
		code: 'return { json: { n: $("Source").itemMatching($itemIndex).json.n } };',
	},
	{
		name: '.itemMatching after the last item for each item',
		mode: 'each',
		code: 'return { json: { n: $("Source").itemMatching($itemIndex + 1).json.n } };',
	},
	{
		name: '.item for each item',
		mode: 'each',
		code: 'return { json: { n: $("Source").item.json.n, a: $json.a } };',
	},
	{ name: '.item for all items', code: 'return [{ json: { n: $("Source").item.json.n } }];' },
	{
		name: 'a change of a matched item does not change the input items',
		code: 'const m = $("Source").itemMatching(0);\nm.json.n = 99;\nreturn [{ json: { n: $("Source").first().json.n, a: items[0].json.a } }];',
	},
];

/** Reads of a node that has no run: in the oracle workflow, the Code node itself. */
const NOT_RUN: Case[] = [
	{ name: '.isExecuted', code: 'return [{ json: { ran: $("Code").isExecuted } }];' },
	{
		name: 'a read behind .isExecuted',
		code: 'const n = $("Code").isExecuted ? $("Code").first().json.n : -1;\nreturn [{ json: { n } }];',
	},
	{ name: '.first() on line 2', code: 'const a = 1;\nreturn [$("Code").first()];' },
	{ name: '.all()', code: 'return $("Code").all();' },
	{ name: '.last(0)', code: 'return [$("Code").last(0)];' },
	{
		name: '.first() for each item',
		mode: 'each',
		code: 'return { json: { n: $("Code").first().json.n } };',
	},
	{
		name: 'the error in a catch block',
		code: 'try {\n  $("Code").first();\n} catch (e) {\n  return [{ json: { message: e.message, text: String(e) } }];\n}',
	},
];

const blockers = (code: string, known: object = {}): string[] => {
	const r = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => true, ...known });
	return r.ok ? [] : r.blockers.map((b) => b.feature);
};

describe('reads of other nodes that stay in the fallback host', () => {
	it.each([
		['.itemMatching without a known pairing', 'return [$("Source").itemMatching(0)];', {}],
		['.itemMatching with two arguments', 'return [$("Source").itemMatching(0, 1)];', KNOWN],
		['.all of another output', 'return $("Source").all(1);', {}],
		['.all of another run', 'return $("Source").all(0, 1);', {}],
		[
			'.all(0) of a node that this node reads output 1 of',
			'return $("Source").all(0);',
			{ defaultOutput: () => 1 },
		],
		['.all of run 0 in a loop', 'return $("Source").all(0, 0);', { runIndex: 'runIndex' }],
		['$items of another run', 'return $items("Source", 0, 1);', {}],
		['$items of another output', 'return $items("Source", 1);', {}],
		[
			'$items(name) of a node that this node reads output 1 of',
			'return $items("Source");',
			{ defaultOutput: () => 1 },
		],
		['$items() when the node before is not fixed', 'return $items();', {}],
		[
			'.item of a node that has not run',
			'return [$("Source").item];',
			{ hasNode: () => false, notRun: () => true },
		],
		[
			'.itemMatching of a node that has not run',
			'return [$("Source").itemMatching(0)];',
			{ hasNode: () => false, notRun: () => true },
		],
		[
			'.first of a node that is not in the workflow',
			'return [$("Source").first()];',
			{ hasNode: () => false, notRun: () => false },
		],
		[
			'$node of a node that has not run',
			'return [{ json: $node["Source"].json }];',
			{ hasNode: () => false, notRun: () => true },
		],
	])('%s', (_name, code, known) => {
		expect(blockers(code, known)).not.toEqual([]);
	});

	it('takes the forms that name the default output and the last run', () => {
		expect(blockers('return $("Source").all(1, -1);', { defaultOutput: () => 1 })).toEqual([]);
		expect(blockers('return $items("Source", 0, -1);', { runIndex: 'runIndex' })).toEqual([]);
		expect(blockers('return $items();', { itemsOfFirstOnly: true })).toEqual([]);
	});
});

describe.skipIf(!taskRunnerAvailable())("reads of other nodes against n8n's task runner", () => {
	beforeAll(async () => await startRunner(), 120_000);

	it.each(CASES)('$name', async (c) => {
		const mode = c.mode ?? 'all';
		const runner = await runnerCode(c.code, mode, ITEMS, { nodes: NODES });
		expect(nativeCode(c.code, mode, ITEMS, { nodes: NODES, known: KNOWN })).toEqual(runner);
	});
});

const node = (name: string, type: string, parameters: Record<string, unknown>, extra = {}) => ({
	name,
	type: `n8n-nodes-base.${type}`,
	typeVersion: type === 'code' ? 2 : type === 'set' ? 3.4 : 2,
	position: [0, 0],
	parameters,
	...extra,
});
const hook = node('Hook', 'webhook', { path: 'a' });
const list = node('List', 'code', {
	jsCode: 'return [{ json: { n: 10 } }, { json: { n: 20 } }, { json: { n: 30 } }];',
});
const edit = node('Edit', 'set', {
	assignments: {
		assignments: [{ id: '1', name: 'm', value: '={{ $json.n + 1 }}', type: 'number' }],
	},
	options: {},
});
const link = (from: string, to: string) => [
	from,
	{ main: [[{ node: to, type: 'main', index: 0 }]] },
];

async function converted(nodes: unknown[], connections: Record<string, unknown>) {
	const out = convertWorkflow({ name: 'References', nodes, connections }, { trace: 'all' });
	expect(out.ok).toBe(true);
	const run = await runReference(out.source, {
		trigger: { body: {} },
		now: 0,
		seed: 1,
		effects: {},
		trace: true,
	});
	return { out, items: (run.trace ?? []).find((t) => t.step === 'Code')?.items };
}

describe.skipIf(!taskRunnerAvailable())(
	"reads of a node that has not run against n8n's task runner",
	() => {
		beforeAll(async () => await startRunner(), 120_000);

		it.each(NOT_RUN)('$name', async (c) => {
			const mode = c.mode ?? 'all';
			const runner = await runnerCode(c.code, mode, ITEMS);
			const known = { notRun: (name: string) => name === 'Code' };
			expect(nativeCode(c.code, mode, ITEMS, { known })).toEqual(runner);
		});
	},
);

describe('reads of other nodes in a converted workflow', () => {
	it('gives false for .isExecuted of a node that runs after this node', async () => {
		const read = node('Code', 'code', {
			jsCode:
				'return [{ json: { ran: $("Later").isExecuted, n: $("Later").isExecuted ? $("Later").first().json.n : -1 } }];',
		});
		const later = node('Later', 'code', { jsCode: 'return [{ json: { n: 1 } }];' });
		const { out, items } = await converted(
			[hook, read, later],
			Object.fromEntries([link('Hook', 'Code'), link('Code', 'Later')]),
		);
		expect(out.fallbackNodes).toEqual([]);
		expect(items).toEqual([{ ran: false, n: -1 }]);
	});

	it('pairs by position through a node that gives one item for each item', async () => {
		const read = node('Code', 'code', {
			jsCode:
				'return items.map((item, k) => ({ json: { m: item.json.m, n: $("List").itemMatching(k).json.n } }));',
		});
		const { out, items } = await converted(
			[hook, list, edit, read],
			Object.fromEntries([link('Hook', 'List'), link('List', 'Edit'), link('Edit', 'Code')]),
		);
		expect(out.fallbackNodes).toEqual([]);
		expect(items).toEqual([
			{ m: 11, n: 10 },
			{ m: 21, n: 20 },
			{ m: 31, n: 30 },
		]);
	});

	it('gives the paired item of each item in "each item" mode', async () => {
		const read = node('Code', 'code', {
			mode: 'runOnceForEachItem',
			jsCode: 'return { json: { m: $json.m, n: $("List").item.json.n } };',
		});
		const { out, items } = await converted(
			[hook, list, edit, read],
			Object.fromEntries([link('Hook', 'List'), link('List', 'Edit'), link('Edit', 'Code')]),
		);
		expect(out.fallbackNodes).toEqual([]);
		expect(items).toEqual([
			{ m: 11, n: 10 },
			{ m: 21, n: 20 },
			{ m: 31, n: 30 },
		]);
	});

	it('refuses .itemMatching and .item after a node that can change the number of items', () => {
		const pass = node('Pass', 'code', { jsCode: 'return items.slice(1);' });
		for (const jsCode of [
			'return [$("List").itemMatching(0)];',
			'return [$("List").item];',
			'const list = $("List");\nreturn [list.item];',
		]) {
			const out = convertWorkflow(
				{
					name: 'References',
					nodes: [hook, list, pass, node('Code', 'code', { jsCode })],
					connections: Object.fromEntries([
						link('Hook', 'List'),
						link('List', 'Pass'),
						link('Pass', 'Code'),
					]),
				},
				{ trace: 'all' },
			);
			expect(out.ok).toBe(false);
			expect(out.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual([
				'code-node-reference',
			]);
		}
	});

	it('keeps .itemMatching in the host for a node with "execute once"', async () => {
		const read = node(
			'Code',
			'code',
			{ jsCode: 'return [$("List").itemMatching(0)];' },
			{ executeOnce: true },
		);
		const { out } = await converted(
			[hook, list, read],
			Object.fromEntries([link('Hook', 'List'), link('List', 'Code')]),
		);
		expect(out.fallbackNodes).toEqual(['Code']);
	});

	it('gives the input items for $items() when two nodes have a connection to the node', async () => {
		const other = node('Other', 'code', { jsCode: 'return [{ json: { n: 40 } }];' });
		const read = node('Code', 'code', {
			jsCode: 'return $items().map((item) => ({ json: { n: item.json.n } }));',
		});
		const { out } = await converted([hook, list, other, read], {
			Hook: {
				main: [
					[
						{ node: 'List', type: 'main', index: 0 },
						{ node: 'Other', type: 'main', index: 0 },
					],
				],
			},
			...Object.fromEntries([link('List', 'Code'), link('Other', 'Code')]),
		});
		expect(out.fallbackNodes).toEqual([]);
	});

	it('keeps $items() in the host when only one of two nodes before has "execute once"', async () => {
		const other = node(
			'Other',
			'code',
			{ jsCode: 'return [{ json: { n: 40 } }];' },
			{ executeOnce: true },
		);
		const read = node('Code', 'code', { jsCode: 'return $items();' });
		const { out } = await converted([hook, list, other, read], {
			Hook: {
				main: [
					[
						{ node: 'List', type: 'main', index: 0 },
						{ node: 'Other', type: 'main', index: 0 },
					],
				],
			},
			...Object.fromEntries([link('List', 'Code'), link('Other', 'Code')]),
		});
		expect(out.fallbackNodes).toEqual(['Code']);
	});
});

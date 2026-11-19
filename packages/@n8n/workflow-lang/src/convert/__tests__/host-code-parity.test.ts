/**
 * The Code step of the fallback host against n8n's real task runner.
 *
 * Each case is one workflow: `Source` gives three items, an optional node `Mid` changes
 * them, and `Code` holds the generated code. The workflow runs in n8n's engine with its
 * task runner process (`behaviour/task-runner.ts`), and converted with every Code node in
 * the fallback host (`code-step.ts` from source). The items of `Code`, or the message of
 * its error, must be the same.
 *
 * A case that the converter refuses is correct too: n8n then runs the workflow on v1. The
 * list `REFUSALS` names the forms that must be refused, so a refusal is never an accident.
 *
 * The cases are made up. Without the built n8n CLI and task runner packages the suite is
 * skipped.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import type { EffectRecord } from '../../reference/runner.ts';
import { runReference, useUtc } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';
import { startTaskRunner, taskRunnerAvailable } from './behaviour/task-runner.ts';

useUtc();

const here = dirname(fileURLToPath(import.meta.url));
const codeStepModule = join(here, '../../../../workflow-fallback-host/src/code-step.ts');

type Mode = 'all' | 'each';
/** The node between `Source` and `Code`. */
type Chain = 'direct' | 'set' | 'drop' | 'reverse' | 'filter';

interface Case {
	name: string;
	code: string;
	mode: Mode;
	chain: Chain;
}

type Outcome = { ok: true; value: unknown } | { ok: false; error: string } | { refused: string };

const SOURCE =
	"return [{ json: { n: 10, s: 'a' } }, { json: { n: 20, s: 'b' } }, { json: { n: 30, s: 'c' } }];";

const MID: Record<Exclude<Chain, 'direct'>, Record<string, unknown>> = {
	set: {
		name: 'Mid',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [0, 0],
		parameters: {
			assignments: {
				assignments: [{ id: '1', name: 'm', value: '={{ $json.n + 1 }}', type: 'number' }],
			},
			includeOtherFields: true,
			options: {},
		},
	},
	// Fewer items than the input, and no paired items of its own.
	drop: {
		name: 'Mid',
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [0, 0],
		parameters: { jsCode: 'return items.slice(1).map((i) => ({ json: i.json }));' },
	},
	// The items 1 and 2 of three, with the paired item of each: a compiled node that keeps
	// the paired items for the code in the host.
	filter: {
		name: 'Mid',
		type: 'n8n-nodes-base.filter',
		typeVersion: 2.2,
		position: [0, 0],
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: '1',
						leftValue: '={{ $json.n }}',
						rightValue: 10,
						operator: { type: 'number', operation: 'gt' },
					},
				],
				combinator: 'and',
			},
			options: {},
		},
	},
	// The same number of items in another order, with the paired item of each.
	reverse: {
		name: 'Mid',
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [0, 0],
		parameters: {
			jsCode: 'return items.map((i, k) => ({ json: i.json, pairedItem: { item: k } })).reverse();',
		},
	},
};

function workflow(c: Case, withTrigger: boolean) {
	const code = (name: string, parameters: Record<string, unknown>) => ({
		name,
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [0, 0],
		parameters,
	});
	const names = ['Source', ...(c.chain === 'direct' ? [] : ['Mid']), 'Code'];
	const nodes: unknown[] = [
		code('Source', { jsCode: SOURCE }),
		...(c.chain === 'direct' ? [] : [MID[c.chain]]),
		code('Code', {
			jsCode: c.code,
			...(c.mode === 'each' ? { mode: 'runOnceForEachItem' } : {}),
		}),
	];
	if (withTrigger) {
		nodes.unshift({
			name: 'Hook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: { path: 'parity' },
		});
		names.unshift('Hook');
	}
	const connections = Object.fromEntries(
		names
			.slice(0, -1)
			.map((name, k) => [name, { main: [[{ node: names[k + 1], type: 'main', index: 0 }]] }]),
	);
	return {
		id: 'wf-1',
		name: 'Parity',
		nodes,
		connections,
		settings: { timezone: 'America/New_York' },
	};
}

async function v1(c: Case): Promise<Outcome> {
	const runner = await startTaskRunner();
	const result = await runOracle(workflow(c, false) as never, {
		start: 'Source',
		item: {},
		mode: 'trigger',
		withBinary: true,
		timeoutMs: 30_000,
		additionalData: { startRunnerTask: runner.startRunnerTask },
	});
	if (result.error !== null) return { ok: false, error: result.error };
	return { ok: true, value: result.nodes.Code?.[0] ?? [] };
}

interface CodeStepModule {
	runCodeStepAsync(args: unknown): Promise<unknown[]>;
	parseCodeStepArgs(args: unknown): unknown;
}

let hostModule: CodeStepModule | undefined;

async function host(c: Case): Promise<Outcome> {
	const out = convertWorkflow(workflow(c, true) as never, { trace: 'all', codeNodes: 'host' });
	if (!out.ok) {
		const first = out.diagnostics.find((d) => d.severity === 'error');
		return { refused: first?.code ?? 'unknown' };
	}
	hostModule ??= (await import(codeStepModule)) as CodeStepModule;
	const mod = hostModule;
	const run = await runReference(
		out.source,
		{ trigger: { body: {} }, now: Date.now(), seed: 1, effects: {}, trace: true },
		{
			answer: async (effect: EffectRecord) => {
				if (effect.kind !== 'code') return undefined;
				try {
					return await mod.runCodeStepAsync(mod.parseCodeStepArgs(effect.args));
				} catch (error) {
					return { $error: error instanceof Error ? error.message : String(error) };
				}
			},
		},
	);
	if (run.status !== 'ok') {
		const r: unknown = run.result;
		return {
			ok: false,
			error: typeof r === 'object' && r !== null ? String(Reflect.get(r, 'message')) : String(r),
		};
	}
	return {
		ok: true,
		value: (run.trace ?? []).filter((t) => t.step === 'Code').at(-1)?.items ?? [],
	};
}

const item = (text: string) => `{ json: { v: ${text} } }`;

/** A value expression as the code of each mode. */
const valueCase = (name: string, text: string, chain: Chain = 'direct'): Case[] => [
	{ name: `${name} [all, ${chain}]`, code: `return [${item(text)}];`, mode: 'all', chain },
	{ name: `${name} [each, ${chain}]`, code: `return ${item(text)};`, mode: 'each', chain },
];

const CHAINS: Chain[] = ['direct', 'set', 'drop', 'reverse', 'filter'];

const PAIRING: Case[] = CHAINS.flatMap((chain) => [
	...valueCase('$(node).item', '$("Source").item.json.n', chain),
	...valueCase('$(node).itemMatching(1)', '$("Source").itemMatching(1).json.n', chain),
	...valueCase(
		'$(node).itemMatching($itemIndex)',
		'$("Source").itemMatching($itemIndex).json.n',
		chain,
	),
	...valueCase('$(node).pairedItem(0)', '$("Source").pairedItem(0).json.n', chain),
	...valueCase('$(node).itemMatching()', '$("Source").itemMatching().json.n', chain),
	...valueCase('$(node).itemMatching(9)', '$("Source").itemMatching(9).json.n', chain),
	...valueCase(
		'$(node).first and last',
		'[$("Source").first().json.n, $("Source").last().json.n]',
		chain,
	),
	...valueCase('$(node).all', '$("Source").all().map((i) => i.json.n)', chain),
	...valueCase('$node[name].json', '$node["Source"].json.n', chain),
	...valueCase('$items(name)', '$items("Source").map((i) => i.json.n)', chain),
	...valueCase('$items()', '$items().map((i) => i.json.n)', chain),
	...valueCase('$input.item', '$input.item.json.n', chain),
	...valueCase(
		'$input.first/last/all',
		'[$input.first().json.n, $input.last().json.n, $input.all().length]',
		chain,
	),
	...valueCase('paired item of an input item', '$input.all().map((i) => i.pairedItem)', chain),
	...valueCase('paired item of a node item', '$("Source").all().map((i) => i.pairedItem)', chain),
]);

const GLOBALS: Case[] = [
	...valueCase('$itemIndex', '$itemIndex'),
	...valueCase('$runIndex', '$runIndex'),
	...valueCase('$json', '$json.n'),
	...valueCase('$binary', '$binary'),
	...valueCase('$prevNode', '[$prevNode.name, $prevNode.outputIndex, $prevNode.runIndex]'),
	...valueCase('$prevNode after a node', '$prevNode.name', 'set'),
	...valueCase('$workflow', '[$workflow.id, $workflow.name]'),
	...valueCase('$workflow.active', '$workflow.active'),
	...valueCase(
		'$nodeVersion and other names of the item',
		'[$nodeVersion, typeof btoa, typeof atob]',
	),
	...valueCase('$position', '$position'),
	...valueCase('$thisItem', '$thisItem.json.n'),
	...valueCase('$node[name].binary', '$node["Source"].binary'),
	...valueCase('$node[name].data in a later item', '$node["Source"].data.s', 'drop'),
	...valueCase('$node[name].runIndex', '$node["Source"].runIndex'),
	...valueCase('$node[name].parameter', 'typeof $node["Source"].parameter'),
	...valueCase('$items with an output', '$items("Source", 0).length'),
	...valueCase('.all with an output', '$("Source").all(0).length'),
	...valueCase('a node in a value', '((node) => node.item.json.n)($("Source"))', 'reverse'),
	...valueCase(
		'a node in a value, first item',
		'((node) => node.first().json.n)($("Source"))',
		'reverse',
	),
	...valueCase('a computed name', '((name) => $(name).item.json.n)("Source")', 'drop'),
	...valueCase('a computed name, last item', '((name) => $(name).last().json.n)("Source")', 'drop'),
	...valueCase(
		'the error of a pairing in a catch block',
		'(() => { try { return $("Source").itemMatching(7); } catch (e) { return [e.message, e instanceof Error]; } })()',
	),
	...valueCase(
		'$execution',
		'[typeof $execution.id, $execution.mode, typeof $execution.resumeUrl]',
	),
	...valueCase('$execution.customData', '$execution.customData.getAll()'),
	...valueCase('$mode', '$mode'),
	...valueCase('$nodeVersion', '$nodeVersion'),
	...valueCase('$nodeId', 'typeof $nodeId'),
	...valueCase('$parameter', 'typeof $parameter.jsCode'),
	...valueCase('$self', 'typeof $self'),
	...valueCase('$node of this node', '$node.name'),
	...valueCase('$vars', 'Object.keys($vars)'),
	...valueCase('$now zone', '[$now.zoneName, typeof $now.toMillis()]'),
	...valueCase('$today', '[$today.hour, $today.minute, $today.zoneName]'),
	...valueCase('$now is one value', '$now === $now'),
	...valueCase('$today is one value', '$today === $today'),
	...valueCase('DateTime zone', 'DateTime.now().zoneName'),
	...valueCase('DateTime local', 'DateTime.fromISO("2024-03-10T12:00:00").toISO()'),
	...valueCase('Date zone offset', 'new Date(0).getTimezoneOffset()'),
	...valueCase('$jmespath', '$jmespath({ a: [1, 2] }, "a[0]")'),
	...valueCase('$jmesPath', '$jmesPath({ a: [1, 2] }, "a[1]")'),
	...valueCase(
		'typeof names',
		'[typeof $input, typeof $, typeof $items, typeof $getWorkflowStaticData, typeof helpers, typeof require, typeof Buffer, typeof fetch, typeof process, typeof console, typeof btoa, typeof structuredClone, typeof TextEncoder, typeof URL, typeof crypto]',
	),
	...valueCase('console.log', '(console.log("text", { a: 1 }), console.warn("w"), 1)'),
	...valueCase('items in each mode', 'typeof items'),
	...valueCase('item in all mode', 'typeof item'),
	...valueCase('$input.params', 'typeof $input.params'),
	...valueCase('$input.context', 'typeof $input.context'),
	...valueCase('$("Code") of this node', '$("Code").isExecuted'),
	...valueCase('$ of an unknown node', '$("Nothing").first()'),
	...valueCase('$ isExecuted', '$("Source").isExecuted'),
	...valueCase('$item', '$item(1).$node["Source"].json.n'),
	...valueCase('$evaluateExpression', '$evaluateExpression("{{ 1 + 1 }}")'),
];

const all = (name: string, code: string, chain: Chain = 'direct'): Case => ({
	name: `${name} [all, ${chain}]`,
	code,
	mode: 'all',
	chain,
});
const each = (name: string, code: string, chain: Chain = 'direct'): Case => ({
	name: `${name} [each, ${chain}]`,
	code,
	mode: 'each',
	chain,
});

const BIN = "{ data: { data: 'aGk=', mimeType: 'text/plain' } }";

const RETURNS: Case[] = [
	all('no return', 'const a = 1;'),
	all('null', 'return null;'),
	all('undefined', 'return undefined;'),
	all('a number', 'return 5;'),
	all('a text', "return 'text';"),
	all('true', 'return true;'),
	all('an empty list', 'return [];'),
	all('an object', 'return { a: 1 };'),
	all('an object with json', 'return { json: { a: 1 } };'),
	all('an object with json null', 'return { json: null };'),
	all('a list of plain objects', 'return [{ a: 1 }, { b: 2 }];'),
	all('a list with a number', 'return [{ json: { a: 1 } }, 5];'),
	all('a list with null', 'return [null];'),
	all('a list with a list', 'return [[{ json: { a: 1 } }]];'),
	all('json a text', "return [{ json: 'text' }];"),
	all('json a list', 'return [{ json: [1] }];'),
	all('json null', 'return [{ json: null }];'),
	all('json and an unknown key', 'return [{ json: { a: 1 }, other: 1 }];'),
	all('a mix of forms', 'return [{ json: { a: 1 } }, { b: 2 }];'),
	all('a Date in json', 'return [{ json: { d: new Date(0) } }];'),
	all('undefined and a function in json', 'return [{ json: { u: undefined, f() {}, n: NaN } }];'),
	all('a Map and a Set', 'return [{ json: { m: new Map([[1, 2]]), s: new Set([1]) } }];'),
	all('a BigInt', 'return [{ json: { b: 10n } }];'),
	all('a Buffer in json', "return [{ json: { b: Buffer.from('hi') } }];"),
	all('a DateTime in json', 'return [{ json: { d: DateTime.fromMillis(0) } }];'),
	all('a cycle', 'const a = { x: 1 }; a.self = a; return [{ json: a }];'),
	all(
		'a class instance',
		'class A { constructor() { this.x = 1; } get y() { return 2; } } return [{ json: new A() }];',
	),
	all('a promise', 'return Promise.resolve([{ json: { a: 1 } }]);'),
	all('the input items', 'return items;'),
	all('$input.all()', 'return $input.all();'),
	all('the items of a node', 'return $("Source").all();', 'set'),
	all('paired item missing', 'return [{ json: { a: 1 } }];'),
	all('paired item a number', 'return [{ json: { a: 1 }, pairedItem: 2 }];'),
	all('paired item an object', 'return [{ json: { a: 1 }, pairedItem: { item: 1 } }];'),
	all('paired item a list', 'return [{ json: { a: 1 }, pairedItem: [{ item: 0 }, { item: 2 }] }];'),
	all('paired item a text', "return [{ json: { a: 1 }, pairedItem: 'x' }];"),
	all('index and error keys', "return [{ json: { a: 1 }, index: 4, error: 'e' }];"),
	all('index key', 'return [{ json: { a: 1 }, index: 4 }];'),
	all('error key a text', "return [{ json: { a: 1 }, error: 'e' }];"),
	all('error key an Error', "return [{ json: { a: 1 }, error: new Error('e') }];"),
	all(
		'error key an object',
		"return [{ json: { a: 1 }, error: { message: 'm' } }, { json: { b: 2 } }];",
	),
	all('error key null', 'return [{ json: { a: 1 }, error: null }];'),
	each('index key', 'return { json: { a: 1 }, index: 4 };'),
	each('error key a text', "return { json: { a: 1 }, error: 'e' };"),
	all('binary', `return [{ json: { a: 1 }, binary: ${BIN} }];`),
	all('binary only', `return [{ binary: ${BIN} }];`),
	all('binary empty', 'return [{ json: { a: 1 }, binary: {} }];'),
	all('binary a text', "return [{ json: { a: 1 }, binary: 'x' }];"),
	all('binary null', 'return [{ json: { a: 1 }, binary: null }];'),
	all(
		'binary with more keys',
		"return [{ json: {}, binary: { f: { data: 'aGk=', mimeType: 'text/plain', fileName: 'a.txt', fileExtension: 'txt', other: 1 } } }];",
	),
	all('binary and plain keys', `return [{ a: 1, binary: ${BIN} }];`),
	all('a throw', "throw new Error('stop');"),
	all('a syntax error', 'return [;'),
	all('a reference error on line 2', '\nreturn nothing;'),
	all(
		'a change of the input',
		'items[0].json.n = 99; return [{ json: { n: $input.first().json.n } }];',
	),
	each('no return', 'const a = 1;'),
	each('null', 'return null;'),
	each('a number', 'return 5;'),
	each('zero', 'return 0;'),
	each('a text', "return 'text';"),
	each('a list', 'return [{ json: { a: 1 } }];'),
	each('an empty list', 'return [];'),
	each('an object', 'return { a: $json.n };'),
	each('an object with json', 'return { json: { a: $json.n } };'),
	each('json a text', "return { json: 'text' };"),
	each('json null', 'return { json: null };'),
	each('json undefined', 'return { json: undefined };'),
	each('json and an unknown key', 'return { json: { a: 1 }, other: 1 };'),
	each('the item', 'return item;'),
	each('$input.item', 'return $input.item;'),
	each('a changed item', 'item.json.x = $itemIndex; return item;'),
	each('paired item a number', 'return { json: { a: 1 }, pairedItem: 2 };'),
	each('paired item an object', 'return { json: { a: 1 }, pairedItem: { item: 1 } };'),
	each('binary', `return { json: { a: 1 }, binary: ${BIN} };`),
	each('binary only', `return { binary: ${BIN} };`),
	each('binary and plain keys', `return { a: 1, binary: ${BIN} };`),
	each('binary empty', 'return { json: { a: 1 }, binary: {} };'),
	each('binary a text', "return { json: { a: 1 }, binary: 'x' };"),
	each(
		'a result for some items',
		'if ($itemIndex === 1) return null; return { json: { k: $itemIndex } };',
	),
	each('a throw on item 1', "if ($itemIndex === 1) throw new Error('stop'); return item;"),
	each('a Date in json', 'return { json: { d: new Date(0) } };'),
	each('$input.all in each mode', 'return { json: { n: $input.all().length } };'),
	each('$input.first in each mode', 'return { json: { n: $input.first().json.n } };'),
	each('items in each mode', 'return { json: { n: items.length } };'),
];

const CASES: Case[] = [...PAIRING, ...GLOBALS, ...RETURNS];

/** The members of `$('Node')` that read a paired item. */
const PAIRED = /(?:\$\([^)]*\)|\bnode)\.(?:item\b(?!\()|itemMatching\(|pairedItem\()/;

/**
 * The forms that the host cannot give as v1 does, with the diagnostic of the converter. The
 * converter must refuse each of them, and no other case: n8n then runs the workflow on v1.
 */
const REFUSALS: Array<{ code: string; when: (c: Case) => boolean }> = [
	{
		code: 'code-node-reference',
		when: (c) => (c.chain === 'drop' || c.chain === 'reverse') && PAIRED.test(c.code),
	},
	{
		code: 'code-node-reference',
		when: (c) =>
			(c.chain === 'drop' || c.chain === 'reverse' || c.chain === 'filter') &&
			/\$node\s*\[\s*['"]/.test(c.code),
	},
	{
		code: 'code-node-reference',
		when: (c) => /\.pairedItem\b(?!\()/.test(c.code) && c.code.includes('$("Source")'),
	},
	{
		code: 'code-global',
		when: (c) =>
			/\$(?:workflow\.active|execution\.customData|mode|nodeId|parameter|self|evaluateExpression|position|thisItem)\b/.test(
				c.code,
			) ||
			/\$input\.(?:params|context)|\$node\[[^\]]*\]\.(?:runIndex|parameter)\b|\$items\("Source", |\.all\(0\)/.test(
				c.code,
			),
	},
	{ code: 'code-global', when: (c) => c.mode === 'each' && /(?<![.\w$])items\b/.test(c.code) },
];

const refusalOf = (c: Case): string | undefined => REFUSALS.find((r) => r.when(c))?.code;

describe.skipIf(!taskRunnerAvailable())("the host Code step against n8n's task runner", () => {
	beforeAll(async () => {
		await startTaskRunner();
	}, 120_000);

	it.each(CASES)(
		'$name',
		async (c) => {
			const actual = await host(c);
			if ('refused' in actual || refusalOf(c) !== undefined) {
				expect(actual).toEqual({ refused: refusalOf(c) });
				return;
			}
			expect(actual).toEqual(await v1(c));
		},
		60_000,
	);
});

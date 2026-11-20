/**
 * The pair data of a Code node step must be declared where the readers of the walk can see it.
 * The pair data of a step (`<out>Pairs`) is a `const` where the step is written: a form that is
 * written below that place (the fallback-host form of a native node, a block of a traced step)
 * declares names that no reader sees, and a reader that named them made the whole workflow fail
 * to compile. Each case here converts the workflow and compiles the generated source.
 */
import { describe, expect, it } from 'vitest';

import { compile } from '../../compiler/index.ts';
import type { ConvertOptions } from '../generator.ts';
import { convertWorkflow } from '../index.ts';
import { connect, node, webhookNode } from './workflows.ts';

const HOST = 'class Box {}\n';
const FRESH = 'return items.map(i => ({ json: { ...i.json, x: 1 } }));';
/** The code of a native node that can hand the node over to the host: it prepares binary data. */
const BINARY =
	"return items.map(async (i) => ({ json: { ...i.json }, binary: { out: await this.helpers.prepareBinaryData(Buffer.from('ab')) } }));";

const source = () =>
	node('Source', 'code', 2, [200, 0], {
		jsCode:
			"return [{ json: { id: 'a1' } }, { json: { id: 'b2' } }, { json: { id: 'c3' } }, { json: { id: 'd4' } }];",
	});

const middle = (host: boolean, body = FRESH, extra: Record<string, unknown> = {}) =>
	node('Middle', 'code', 2, [600, 0], { jsCode: (host ? HOST : '') + body }, extra);

const reader = (name: string, at: [number, number]) =>
	node(name, 'code', 2, at, {
		mode: 'runOnceForEachItem',
		jsCode: "return { json: { sourceId: $('Source').item.json.id } };",
	});

const ifNode = (name: string, at: [number, number]) =>
	node(
		name,
		'if',
		2.2,
		at,
		{ conditions: { options: { version: 2 }, conditions: [], combinator: 'and' }, options: {} },
		{},
	);

interface Shape {
	name: string;
	nodes: Array<ReturnType<typeof node>>;
	edges: Array<[string, number, string, number]>;
}

/** The shapes of the card: a host Code node on the way of a paired read, in other scopes. */
function shapes(host: boolean): Shape[] {
	const middleNode = middle(host);
	return [
		{
			name: '1 middle and reader in the true branch',
			nodes: [
				webhookNode(),
				source(),
				ifNode('If', [400, 0]),
				middleNode,
				reader('Read', [800, 0]),
			],
			edges: [
				['Webhook', 0, 'Source', 0],
				['Source', 0, 'If', 0],
				['If', 0, 'Middle', 0],
				['Middle', 0, 'Read', 0],
			],
		},
		{
			name: '2 middle before the If, reader in a branch',
			nodes: [
				webhookNode(),
				source(),
				middleNode,
				ifNode('If', [800, 0]),
				reader('Read', [1000, 0]),
			],
			edges: [
				['Webhook', 0, 'Source', 0],
				['Source', 0, 'Middle', 0],
				['Middle', 0, 'If', 0],
				['If', 0, 'Read', 0],
			],
		},
		{
			name: '4 two readers in two branches',
			nodes: [
				webhookNode(),
				source(),
				middleNode,
				ifNode('If', [800, 0]),
				reader('Read True', [1000, 0]),
				reader('Read False', [1000, 200]),
			],
			edges: [
				['Webhook', 0, 'Source', 0],
				['Source', 0, 'Middle', 0],
				['Middle', 0, 'If', 0],
				['If', 0, 'Read True', 0],
				['If', 1, 'Read False', 0],
			],
		},
		{
			name: '6 engine form: two parents into a later node',
			nodes: [
				webhookNode(),
				source(),
				ifNode('If', [400, 0]),
				middleNode,
				reader('Read', [1000, 0]),
				node('Merge', 'merge', 3, [1000, 200], { mode: 'append', options: {} }),
			],
			edges: [
				['Webhook', 0, 'Source', 0],
				['Source', 0, 'If', 0],
				['If', 0, 'Middle', 0],
				['Middle', 0, 'Read', 0],
				['Middle', 0, 'Merge', 0],
				['If', 1, 'Merge', 1],
			],
		},
	];
}

function convert(shape: Shape, options: ConvertOptions) {
	const result = convertWorkflow(
		{
			name: shape.name,
			settings: { executionOrder: 'v1' },
			nodes: shape.nodes,
			connections: connect(shape.edges),
		},
		options,
	);
	const errors = result.diagnostics.filter((d) => d.severity === 'error');
	const compiled = compile(result.source, { extraNodes: result.nodes });
	return { result, errors, diagnostics: compiled.diagnostics };
}

const OPTIONS: Array<[string, ConvertOptions]> = [
	['flat', {}],
	['trace all', { trace: 'all' }],
	['engine always', { engine: 'always' }],
	['engine always, trace all', { engine: 'always', trace: 'all' }],
	['run data', { runData: true, trace: 'all' }],
];

describe('the pair data of a Code node in the fallback host is in the scope of its readers', () => {
	for (const host of [true, false]) {
		for (const shape of shapes(host)) {
			for (const [label, options] of OPTIONS) {
				it(`${shape.name}, ${host ? 'host' : 'native'} middle, ${label}`, () => {
					const out = convert(shape, options);
					expect(out.errors).toEqual([]);
					expect(out.diagnostics).toEqual([]);
					expect(out.result.source).toContain('paired');
				});
			}
		}
	}

	it('refuses the reader when the pairs of the native form are in the host form only', () => {
		const shape = shapes(false)[0];
		const withBinary = {
			...shape,
			nodes: shape.nodes.map((n) => (n.name === 'Middle' ? middle(false, BINARY) : n)),
		};
		const out = convert(withBinary, { engine: 'always' });
		// The node prepares binary data in the host: no form of it gives pairs, so the read is
		// refused, and the source compiles without a name that a reader cannot see.
		expect(out.errors.map((d) => d.code)).toEqual(['code-node-reference']);
		expect(out.errors[0]?.message).toContain('[pairing: ');
		expect(out.diagnostics).toEqual([]);
	});

	it('refuses the reader under an error setting or "retry on fail" instead of failing', () => {
		for (const extra of [{ onError: 'continueRegularOutput' }, { retryOnFail: true }]) {
			const shape = shapes(true)[0];
			const withSetting = {
				...shape,
				nodes: shape.nodes.map((n) => (n.name === 'Middle' ? middle(true, FRESH, extra) : n)),
			};
			const out = convert(withSetting, {});
			expect(out.errors.map((d) => d.code)).toEqual(['code-node-reference']);
			expect(out.diagnostics).toEqual([]);
		}
	});
});

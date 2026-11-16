/**
 * A compiled node with a parameter that has an expression: the converter evaluates the
 * expression for each item, and calls the module once with the values of all items.
 */
import { describe, expect, it } from 'vitest';

import { compile } from '../../compiler/index.ts';
import type { NodeSources } from '../../node-compile/convert.ts';
import { runReference } from '../../reference/runner.ts';
import { raw } from '../code.ts';
import { neverThrows } from '../expression.ts';
import { convertWorkflow } from '../index.ts';

const TYPE = 'n8n-nodes-base.probe';
const ENTRY = '/probe/Probe.node.ts';

const SOURCE = `import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';

export class Probe implements INodeType {
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			if (items[i].json.skip) {
				returnData.push({ json: { skipped: true }, pairedItem: { item: i } });
				continue;
			}
			try {
				const id = this.getNodeParameter('id', i) as string;
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: 'https://api.example.test/things/' + id,
					json: true,
				});
				returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
`;

const description = {
	name: 'probe',
	properties: [{ displayName: 'Id', name: 'id', type: 'string', default: '' }],
};

const REGULAR = '@onError=continueRegularOutput';

const sources = (conditions: string[]): NodeSources => ({
	entry: (type) => (type === TYPE ? ENTRY : undefined),
	readFile: (path) => (path === ENTRY ? SOURCE : undefined),
	description: (type) => (type === TYPE ? description : undefined),
	verified: { [`${TYPE}@1:.`]: ['id', ...conditions] },
});

function workflowWith(id: string, settings: Record<string, unknown>) {
	return {
		name: 'Probe',
		settings: { executionOrder: 'v1' },
		nodes: [
			{
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p', httpMethod: 'POST' },
			},
			{
				name: 'Split',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [200, 0],
				parameters: { fieldToSplitOut: 'body.list' },
			},
			{
				name: 'Probe',
				type: TYPE,
				typeVersion: 1,
				position: [400, 0],
				parameters: { id },
				...settings,
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: 'Probe', type: 'main', index: 0 }]] },
		},
	};
}

const OK = { status: 200, headers: {}, body: { ok: true } };

async function run(
	id: string,
	list: Array<Record<string, unknown>>,
	settings: Record<string, unknown> = {},
	conditions = ['@each=id', REGULAR],
) {
	const result = convertWorkflow(workflowWith(id, settings), {
		nodeSources: sources(conditions),
		instance: { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) },
	});
	expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	if (result.fallbackNodes.length > 0)
		return { fallback: result.fallbackNodes, source: result.source, urls: [] };
	expect(compile(result.source, { extraNodes: result.nodes }).diagnostics).toEqual([]);
	const out = await runReference(
		result.source,
		{
			trigger: { body: { list }, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Probe: [OK] },
		},
		{ extraNodes: result.nodes },
	);
	const urls = out.effects
		.filter((effect) => effect.kind === 'http')
		.map((effect) => String(Reflect.get(Object(effect.args), 'url')).replace(/^.*\//, ''));
	return { status: out.status, result: out.result, urls, source: result.source };
}

const BY_ITEM = '={{ $json.id }}';
const FAILS_FOR_B = "={{ $json.id === 'b' ? $('No such node').first().json.id : $json.id }}";
const NO_NODE = "Referenced node doesn't exist";

describe('a compiled node with a parameter that reads the item', () => {
	it('runs once with all items, and each item has its own value', async () => {
		const out = await run(BY_ITEM, [{ id: 'a' }, { id: 'b' }, { other: 1 }, { id: 'd' }]);
		expect(out.status).toBe('ok');
		expect(out.urls).toEqual(['a', 'b', 'undefined', 'd']);
		expect(out.source).toContain('probeParameters.push({ id: ');
		expect(out.source).toContain('parameters: { each: probeParameters },');
		expect(out.source).toContain('items: split,');
		expect(out.source).not.toContain('parameterOrError');
	});

	it('runs in the fallback host when the parameter is not checked as an expression', async () => {
		expect(await run(BY_ITEM, [{ id: 'a' }], {}, [])).toMatchObject({ fallback: ['Probe'] });
		expect(await run(BY_ITEM, [{ id: 'a' }], {}, ['@items=each'])).toMatchObject({
			fallback: ['Probe'],
		});
		expect((await run('fixed', [{ id: 'a' }], {}, [])).urls).toEqual(['fixed']);
	});

	it('does not throw the error of an expression for an item that the node does not read', async () => {
		const out = await run(FAILS_FOR_B, [{ id: 'a' }, { id: 'b', skip: true }, { id: 'c' }]);
		expect(out.source).toContain('parameterOrError(() => (');
		expect(out.status).toBe('ok');
		expect(out.urls).toEqual(['a', 'c']);
		expect(out.result).toMatchObject({ Probe: [{ ok: true }, { skipped: true }, { ok: true }] });
	});

	it('throws the error of an expression when the node reads the parameter, not before', async () => {
		const out = await run(FAILS_FOR_B, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
		expect(out.status).toBe('error');
		expect(out.result).toMatchObject({ message: NO_NODE });
		expect(out.urls).toEqual(['a']);
	});

	it('gives the error of an expression to the node under "continue on fail"', async () => {
		const out = await run(FAILS_FOR_B, [{ id: 'a' }, { id: 'b' }, { id: 'c' }], {
			onError: 'continueRegularOutput',
		});
		expect(out.status).toBe('ok');
		expect(out.source).toContain('each: [');
		expect(out.source).toContain('items: [$json],');
		expect(out.urls).toEqual(['a', 'c']);
		expect(out.result).toMatchObject({ Probe: [{ ok: true }, { error: NO_NODE }, { ok: true }] });
	});
});

describe('code of a translated value that cannot throw', () => {
	it.each([
		['$json.id', true],
		["'text'", true],
		['`a$' + '{$json.id}b`', true],
		['orNull(() => $json.a.b.c)', true],
		['orNull(() => $json.a in $json.b)', true],
		['\u00017\u0002orNull(() => $json.a.b)\u0003', true],
		['$json.a.b', false],
		['$json.a in $json.b', false],
		['orNull(() => $json.a.b.toUpperCase())', false],
		['luxNow(ctx).toISO()', false],
		["((): Json => { throw new Error('no'); })()", false],
		['new Date($json.at)', false],
	])('%s: %s', (code, expected) => {
		expect(neverThrows(raw(code))).toBe(expected);
	});

	it('reads every part of a collection', () => {
		expect(
			neverThrows({
				kind: 'object',
				entries: [
					['a', raw('$json.a')],
					['b', raw('1')],
				],
			}),
		).toBe(true);
		expect(
			neverThrows({
				kind: 'object',
				entries: [['a', { kind: 'array', items: [raw('$json.a'), raw('f($json.b)')] }]],
			}),
		).toBe(false);
	});
});

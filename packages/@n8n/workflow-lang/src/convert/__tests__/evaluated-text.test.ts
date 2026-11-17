/**
 * A compiled node that evaluates the expressions in the text of a parameter
 * (`this.evaluateExpression`): the converter translates each expression, and gives the
 * module its value for each item.
 */
import { describe, expect, it } from 'vitest';

import { compile } from '../../compiler/index.ts';
import type { NodeSources } from '../../node-compile/convert.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

const TYPE = 'n8n-nodes-base.probe';
const ENTRY = '/probe/Probe.node.ts';

const SOURCE = `import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';

export function getResolvables(expression: string) {
	if (!expression) return [];

	const resolvables = [];
	const resolvableRegex = /({{[\\s\\S]*?}})/g;

	let match;

	while ((match = resolvableRegex.exec(expression)) !== null) {
		if (match[1]) {
			resolvables.push(match[1]);
		}
	}

	return resolvables;
}

export class Probe implements INodeType {
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			let query = this.getNodeParameter('query', i) as string;
			for (const resolvable of getResolvables(query)) {
				query = query.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
			}
			const response = await this.helpers.httpRequest({
				method: 'POST',
				url: 'https://api.example.test/query',
				body: { query },
				json: true,
			});
			returnData.push({ json: response, pairedItem: { item: i } });
		}
		return [returnData];
	}
}
`;

const description = {
	name: 'probe',
	properties: [
		{ displayName: 'Query', name: 'query', type: 'string', default: '', noDataExpression: true },
	],
};

const sources = (conditions: string[]): NodeSources => ({
	entry: (type) => (type === TYPE ? ENTRY : undefined),
	readFile: (path) => (path === ENTRY ? SOURCE : undefined),
	description: (type) => (type === TYPE ? description : undefined),
	verified: { [`${TYPE}@1:.`]: ['query', ...conditions] },
});

function workflowWith(query: string) {
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
				parameters: { query },
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
	query: string,
	list: Array<Record<string, unknown>>,
	conditions = ['@evaluated=query', '@eachError'],
) {
	const result = convertWorkflow(workflowWith(query), {
		nodeSources: sources(conditions),
		instance: { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) },
	});
	expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	if (result.fallbackNodes.length > 0) return { fallback: result.fallbackNodes, queries: [] };
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
	const queries = out.effects
		.filter((effect) => effect.kind === 'http')
		.map((effect) => Reflect.get(Object(Reflect.get(Object(effect.args), 'body')), 'query'));
	return { status: out.status, result: out.result, queries, source: result.source };
}

const TEXT = 'SELECT {{ $json.id }} AS id, {{ $json.name.toUpperCase() }} AS name';

describe('a compiled node that evaluates the expressions in the text of a parameter', () => {
	it('gives each item the values of its expressions', async () => {
		const out = await run(TEXT, [
			{ id: 1, name: 'ada' },
			{ id: 'two', name: 'bob' },
		]);
		expect(out.status).toBe('ok');
		expect(out.queries).toEqual(['SELECT 1 AS id, ADA AS name', 'SELECT two AS id, BOB AS name']);
	});

	it('evaluates the expressions of a text that starts with `=` and takes no expression', async () => {
		const out = await run(`=${TEXT}`, [{ id: 1, name: 'ada' }]);
		expect(out.status).toBe('ok');
		expect(out.queries).toEqual(['SELECT 1 AS id, ADA AS name']);
	});

	it('throws the error of a failed expression when the node evaluates it', async () => {
		const out = await run("SELECT {{ $('No such node').first().json.id }}", [{ id: 1 }]);
		expect(out.status).toBe('error');
		expect(out.result).toMatchObject({ message: "Referenced node doesn't exist" });
		expect(out.queries).toEqual([]);
	});

	it('runs in the fallback host without the check of expressions in the text', async () => {
		expect(await run(TEXT, [{ id: 1, name: 'ada' }], [])).toMatchObject({ fallback: ['Probe'] });
		expect((await run('SELECT 1', [{ id: 1 }], [])).queries).toEqual(['SELECT 1']);
	});

	it('runs in the fallback host when an expression can fail and that has no check', async () => {
		expect(
			await run(
				"SELECT {{ $('No such node').first().json.id }}",
				[{ id: 1 }],
				['@evaluated=query'],
			),
		).toMatchObject({ fallback: ['Probe'] });
	});
});

/**
 * The paired items of a compiled node: a later node reads the item of an earlier node
 * through the compiled node (`$('Node').item`), as v1 finds it with `pairedItem`.
 */
import { describe, expect, it } from 'vitest';

import { compile } from '../../compiler/index.ts';
import type { NodeSources } from '../../node-compile/convert.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

const TYPE = 'n8n-nodes-base.probe';
const ENTRY = '/probe/Probe.node.ts';

const SOURCE = `import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';

export class Probe implements INodeType {
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as string;
		const returnData: INodeExecutionData[] = [];
		const all: INodeExecutionData['pairedItem'] = [];
		for (let i = items.length - 1; i >= 0; i--) {
			const response = await this.helpers.httpRequest({
				method: 'GET',
				url: 'https://api.example.test/things/' + items[i].json.id,
				json: true,
			});
			all.push({ item: i });
			if (mode === 'aggregate') continue;
			if (mode === 'unpaired') {
				returnData.push({ json: response });
				returnData.push({ json: response });
				continue;
			}
			const found = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(mode === 'list' ? [response, response] : response),
				{ itemData: { item: i } },
			);
			returnData.push(...found);
		}
		if (mode === 'aggregate') returnData.push({ json: { count: items.length }, pairedItem: all });
		return [returnData];
	}
}
`;

const description = {
	name: 'probe',
	properties: [{ displayName: 'Mode', name: 'mode', type: 'string', default: 'one' }],
};

const sources = (conditions: string[]): NodeSources => ({
	entry: (type) => (type === TYPE ? ENTRY : undefined),
	readFile: (path) => (path === ENTRY ? SOURCE : undefined),
	description: (type) => (type === TYPE ? description : undefined),
	verified: { [`${TYPE}@1:.`]: ['mode', ...conditions] },
});

function workflowWith(mode: string, reads: string) {
	const node = (name: string, type: string, x: number, parameters: object, typeVersion = 1) => ({
		name,
		type,
		typeVersion,
		position: [x, 0],
		parameters,
	});
	return {
		name: 'Lineage',
		settings: { executionOrder: 'v1' },
		nodes: [
			node('Webhook', 'n8n-nodes-base.webhook', 0, { path: 'p', httpMethod: 'POST' }, 2),
			node('Split', 'n8n-nodes-base.splitOut', 200, { fieldToSplitOut: 'body.list' }),
			node('Probe', TYPE, 400, { mode }),
			node(
				'Read',
				'n8n-nodes-base.set',
				600,
				{
					assignments: {
						assignments: [{ id: '1', name: 'source', value: reads, type: 'string' }],
					},
					options: {},
				},
				3.4,
			),
		],
		connections: {
			Webhook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: 'Probe', type: 'main', index: 0 }]] },
			Probe: { main: [[{ node: 'Read', type: 'main', index: 0 }]] },
		},
	};
}

const ITEM = "={{ $('Split').item.json.id }}";

async function run(mode: string, conditions: string[], reads = ITEM) {
	const result = convertWorkflow(workflowWith(mode, reads), {
		nodeSources: sources(conditions),
		instance: { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) },
	});
	expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(result.fallbackNodes).toEqual([]);
	expect(compile(result.source, { extraNodes: result.nodes }).diagnostics).toEqual([]);
	const out = await runReference(
		result.source,
		{
			trigger: { body: { list: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Probe: [{ status: 200, headers: {}, body: { ok: true } }] },
		},
		{ extraNodes: result.nodes },
	);
	const lists: Record<string, unknown> =
		typeof out.result === 'object' && out.result !== null ? { ...out.result } : {};
	const read = Array.isArray(lists.Read) ? lists.Read : [];
	return {
		status: out.status,
		result: out.result,
		sources: read.map((item: unknown) => Reflect.get(Object(item), 'source')),
		source: result.source,
		warnings: result.diagnostics.filter((d) => d.code === 'paired-item').length,
	};
}

describe('the paired items of a compiled node', () => {
	it('pairs by position, with a warning, when the paired items are not checked against v1', async () => {
		const out = await run('one', []);
		expect(out.source).not.toContain('pairedSourceIndex');
		expect(out.warnings).toBe(1);
		expect(out.sources).toEqual(['a', 'b', 'c']);
	});

	it('gives the item that the node paired, for one output item for each input item', async () => {
		const out = await run('one', ['@pairedItems']);
		expect(out.source).toContain('pairedSourceIndex(');
		expect(out.warnings).toBe(0);
		expect(out.sources).toEqual(['c', 'b', 'a']);
	});

	it('gives the item that the node paired, for several output items for one input item', async () => {
		const out = await run('list', ['@pairedItems']);
		expect(out.sources).toEqual(['c', 'c', 'b', 'b', 'a', 'a']);
	});

	it('fails as v1 when the node gave no paired item and the counts differ', async () => {
		const out = await run('unpaired', ['@pairedItems']);
		expect(out.status).toBe('error');
		expect(out.result).toMatchObject({
			message:
				"Paired item data for item from node 'Probe' is unavailable. Ensure 'Probe' is providing the required output.",
		});
	});

	it('fails as v1 for an item with paired items that are different items of the node', async () => {
		const out = await run('aggregate', ['@pairedItems']);
		expect(out.status).toBe('error');
		expect(out.result).toMatchObject({ message: 'Multiple matches found' });
	});

	it('does not ask the module for paired items when no later node needs them', async () => {
		const out = await run('one', ['@pairedItems'], '={{ $json.ok }}');
		expect(out.source).not.toContain('.paired');
		expect(out.source).not.toContain('.items;');
	});
});

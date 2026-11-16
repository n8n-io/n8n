/**
 * A compiled node under the error settings of n8n: "continue on fail", "continue (using
 * error output)" and "retry on fail". The node source here is a small test node.
 */
import { describe, expect, it } from 'vitest';

import { compile } from '../../compiler/index.ts';
import type { NodeSources } from '../../node-compile/convert.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

const TYPE = 'n8n-nodes-base.probe';
const ENTRY = '/probe/Probe.node.ts';

const probeSource = (errorItem: string) => `import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export class Probe implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Probe',
		name: 'probe',
		group: ['transform'],
		version: 1,
		description: 'Probe',
		defaults: { name: 'Probe' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			const strict = this.getNodeParameter('strict', i) as boolean;
			if (strict) throw new NodeOperationError(this.getNode(), 'The strict setting stops the node');
			try {
				const id = this.getNodeParameter('id', i) as string;
				let response;
				try {
					response = await this.helpers.httpRequest({
						method: 'GET',
						url: 'https://api.example.test/things/' + id,
						json: true,
					});
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}
				returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push(${errorItem});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
`;

const PAIRED = '{ json: { error: error.message }, pairedItem: { item: i } }';
const UNPAIRED = '{ json: { error: error.message } }';
const DETAILED =
	'{ json: { error: error.message, description: error.description, httpCode: error.httpCode }, pairedItem: { item: i } }';

const description = {
	name: 'probe',
	properties: [
		{ displayName: 'Id', name: 'id', type: 'string', default: '' },
		{ displayName: 'Strict', name: 'strict', type: 'boolean', default: false },
	],
};

function sources(errorItem: string, conditions: string[]): NodeSources {
	const source = probeSource(errorItem);
	return {
		entry: (type) => (type === TYPE ? ENTRY : undefined),
		readFile: (path) => (path === ENTRY ? source : undefined),
		description: (type) => (type === TYPE ? description : undefined),
		verified: { [`${TYPE}@1:.`]: ['id', 'strict', ...conditions] },
	};
}

const REGULAR = '@onError=continueRegularOutput';
const ERROR_OUTPUT = '@onError=continueErrorOutput';
const BY_POSITION = '@errorItems=position';

function workflowWith(settings: Record<string, unknown>, strict = false) {
	const errorOutput = settings.onError === 'continueErrorOutput';
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
				parameters: { id: '={{ $json.id }}', strict },
				...settings,
			},
			{
				name: 'Good',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [600, 0],
				parameters: {},
			},
			{
				name: 'Bad',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [600, 200],
				parameters: {},
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: 'Probe', type: 'main', index: 0 }]] },
			Probe: {
				main: [
					[{ node: 'Good', type: 'main', index: 0 }],
					...(errorOutput ? [[{ node: 'Bad', type: 'main', index: 0 }]] : []),
				],
			},
		},
	};
}

const OK = (name: string) => ({ status: 200, headers: {}, body: { name } });
const BAD = { status: 400, headers: {}, body: { message: 'The thing is not there' } };
const BAD_REQUEST = 'Bad request - please check your parameters';

async function run(
	nodeSources: NodeSources,
	settings: Record<string, unknown>,
	answers: unknown[],
	options: { strict?: boolean; ids?: string[] } = {},
) {
	const result = convertWorkflow(workflowWith(settings, options.strict), {
		nodeSources,
		instance: { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) },
	});
	expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	if (result.fallbackNodes.length > 0)
		return { fallback: result.fallbackNodes, source: result.source };
	expect(compile(result.source, { extraNodes: result.nodes }).diagnostics).toEqual([]);
	const out = await runReference(
		result.source,
		{
			trigger: {
				body: { list: (options.ids ?? ['a', 'b']).map((id) => ({ id })) },
				headers: {},
				query: {},
			},
			now: 0,
			seed: 1,
			effects: { Probe: answers },
		},
		{ extraNodes: result.nodes },
	);
	expect(out.status).toBe('ok');
	const requests = out.effects.filter((effect) => effect.kind === 'http').length;
	return { result: out.result, requests, source: result.source };
}

describe('a compiled node under the error settings of the node', () => {
	it('runs in the fallback host when the setting is not checked against v1', async () => {
		const stopOnly = sources(PAIRED, []);
		expect(await run(stopOnly, { onError: 'continueRegularOutput' }, [OK('A')])).toMatchObject({
			fallback: ['Probe'],
		});
		expect(await run(stopOnly, { continueOnFail: true }, [OK('A')])).toMatchObject({
			fallback: ['Probe'],
		});
		expect(await run(stopOnly, { onError: 'continueErrorOutput' }, [OK('A')])).toMatchObject({
			fallback: ['Probe'],
		});
		const regularOnly = sources(PAIRED, [REGULAR]);
		expect(await run(regularOnly, { onError: 'continueErrorOutput' }, [OK('A')])).toMatchObject({
			fallback: ['Probe'],
		});
		expect((await run(stopOnly, {}, [OK('A')])).result).toEqual({
			Good: [{ name: 'A' }, { name: 'A' }],
		});
	});

	it('gives the error item of the node under "continue on fail"', async () => {
		const out = await run(sources(PAIRED, [REGULAR]), { onError: 'continueRegularOutput' }, [
			OK('A'),
			BAD,
		]);
		expect(out.result).toEqual({ Good: [{ name: 'A' }, { error: BAD_REQUEST }] });
		const legacy = await run(sources(PAIRED, [REGULAR]), { continueOnFail: true }, [BAD, OK('B')]);
		expect(legacy.result).toEqual({ Good: [{ error: BAD_REQUEST }, { name: 'B' }] });
	});

	it('gives the description and the status of a v1 API error to the node code', async () => {
		const out = await run(sources(DETAILED, [REGULAR]), { onError: 'continueRegularOutput' }, [
			BAD,
			{ status: 503, headers: {}, body: 'down' },
		]);
		expect(out.result).toEqual({
			Good: [
				{ error: BAD_REQUEST, description: 'The thing is not there', httpCode: '400' },
				{
					error:
						'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)',
					description: 'Request failed with status code 503',
					httpCode: '503',
				},
			],
		});
	});

	it('moves an error item to the error output, in its input item', async () => {
		const out = await run(sources(PAIRED, [ERROR_OUTPUT]), { onError: 'continueErrorOutput' }, [
			OK('A'),
			BAD,
		]);
		expect(out.result).toEqual({ Good: [{ name: 'A' }], Bad: [{ id: 'b', error: BAD_REQUEST }] });
	});

	it('pairs error items by position when the v1 node does not pair them', async () => {
		const unpaired = sources(UNPAIRED, [ERROR_OUTPUT, BY_POSITION]);
		const settings = { onError: 'continueErrorOutput' };
		expect((await run(unpaired, settings, [BAD, BAD])).result).toEqual({
			Good: [],
			Bad: [
				{ id: 'a', error: BAD_REQUEST },
				{ id: 'b', error: BAD_REQUEST },
			],
		});
		expect((await run(unpaired, settings, [BAD], { ids: ['a'] })).result).toEqual({
			Good: [],
			Bad: [{ id: 'a', error: BAD_REQUEST }],
		});
		expect(
			(await run(unpaired, settings, [OK('A'), BAD, OK('C')], { ids: ['a', 'b', 'c'] })).result,
		).toEqual({
			Good: [{ name: 'A' }, { name: 'C' }],
			Bad: [{ id: 'b', error: BAD_REQUEST }],
		});
	});

	it('passes the input items on output 0 when the node throws', async () => {
		const both = sources(PAIRED, [REGULAR, ERROR_OUTPUT]);
		const regular = await run(both, { onError: 'continueRegularOutput' }, [OK('A')], {
			strict: true,
		});
		expect(regular).toMatchObject({ result: { Good: [{ id: 'a' }, { id: 'b' }] }, requests: 0 });
		const errorOutput = await run(both, { onError: 'continueErrorOutput' }, [OK('A')], {
			strict: true,
		});
		expect(errorOutput.result).toEqual({ Good: [{ id: 'a' }, { id: 'b' }], Bad: [] });
	});

	it('runs the whole node again under "retry on fail" when its first item has an error', async () => {
		const both = sources(PAIRED, [REGULAR, ERROR_OUTPUT]);
		const retry = { retryOnFail: true, maxTries: 2, waitBetweenTries: 10 };
		const first = await run(both, { onError: 'continueRegularOutput', ...retry }, [
			BAD,
			OK('B'),
			OK('A'),
			OK('B'),
		]);
		expect(first).toMatchObject({ result: { Good: [{ name: 'A' }, { name: 'B' }] }, requests: 4 });
		const second = await run(both, { onError: 'continueRegularOutput', ...retry }, [OK('A'), BAD]);
		expect(second).toMatchObject({
			result: { Good: [{ name: 'A' }, { error: BAD_REQUEST }] },
			requests: 2,
		});
		const last = await run(both, { onError: 'continueErrorOutput', ...retry }, [BAD, OK('B')]);
		expect(last).toMatchObject({
			result: { Good: [{ name: 'B' }], Bad: [{ id: 'a', error: BAD_REQUEST }] },
			requests: 4,
		});
		const thrown = await run(both, { onError: 'continueRegularOutput', ...retry }, [OK('A')], {
			strict: true,
		});
		expect(thrown.result).toEqual({ Good: [{ id: 'a' }, { id: 'b' }] });
		expect(thrown.source).toContain("await ctx.wait({ name: 'Probe (retry)', duration: 10 })");
	});

	it('keeps "always output data" and "execute once" of the node', async () => {
		const both = sources(PAIRED, [REGULAR, ERROR_OUTPUT]);
		const once = await run(both, { onError: 'continueRegularOutput', executeOnce: true }, [BAD]);
		expect(once).toMatchObject({ result: { Good: [{ error: BAD_REQUEST }] }, requests: 1 });
		const always = await run(
			both,
			{ onError: 'continueErrorOutput', alwaysOutputData: true },
			[BAD],
			{ ids: ['a'] },
		);
		expect(always.result).toEqual({ Good: [{}], Bad: [{ id: 'a', error: BAD_REQUEST }] });
	});
});

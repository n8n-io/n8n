/**
 * A compiled node that stores a response reaches the largest size of a stored file of the
 * runtime (`--binary-max-file-mb`). v1 has no such limit, so the node runs in the fallback
 * host in the same run, when the node sent only GET requests before the failure.
 */
import { describe, expect, it } from 'vitest';

import { decodeModule } from '../../compiler/decode.ts';
import { compile } from '../../compiler/index.ts';
import type { NodeSources } from '../../node-compile/convert.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { RUNS_IN_HOST } from '../helpers.ts';
import { convertWorkflow } from '../index.ts';

const TYPE = 'n8n-nodes-base.probe';
const ENTRY = '/probe/Probe.node.ts';

const SOURCE = `import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

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
			try {
				const id = this.getNodeParameter('id', i) as string;
				const touch = this.getNodeParameter('touch', i) as boolean;
				if (touch) {
					await this.helpers.request({
						method: 'POST',
						uri: 'https://api.example.test/touch/' + id,
						json: true,
					});
				}
				const bytes = await this.helpers.request({
					uri: 'https://api.example.test/files/' + id,
					encoding: null,
				});
				returnData.push({
					json: { id },
					binary: { data: await this.helpers.prepareBinaryData(Buffer.from(bytes), 'a.txt') },
					pairedItem: { item: i },
				});
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
	properties: [
		{ displayName: 'Id', name: 'id', type: 'string', default: '' },
		{ displayName: 'Touch', name: 'touch', type: 'boolean', default: false },
	],
};

const ONE_CALL = ['@oneCall=continueRegularOutput', '@oneCall=continueErrorOutput'];

const sourcesWith = (oneCall: string[]): NodeSources => ({
	entry: (type) => (type === TYPE ? ENTRY : undefined),
	readFile: (path) => (path === ENTRY ? SOURCE : undefined),
	description: (type) => (type === TYPE ? description : undefined),
	storesResponses: true,
	verified: {
		[`${TYPE}@1:.`]: [
			'id',
			'touch',
			'@each=id',
			'@each=id@continueRegularOutput',
			'@each=id@continueErrorOutput',
			'@onError=continueRegularOutput',
			'@onError=continueErrorOutput',
			...oneCall,
		],
	},
});
const nodeSources = sourcesWith(ONE_CALL);

function workflowWith(settings: Record<string, unknown>, touch: boolean, reads = false) {
	const errorOutput = settings.onError === 'continueErrorOutput';
	const plain = (name: string, type: string, x: number, parameters: Record<string, unknown>) => ({
		name,
		type,
		typeVersion: type.endsWith('webhook') ? 2 : 1,
		position: [x, 0],
		parameters,
	});
	return {
		name: 'Probe',
		settings: { executionOrder: 'v1' },
		nodes: [
			plain('Webhook', 'n8n-nodes-base.webhook', 0, { path: 'p', httpMethod: 'POST' }),
			plain('Split', 'n8n-nodes-base.splitOut', 200, { fieldToSplitOut: 'body.list' }),
			{ ...plain('Probe', TYPE, 400, { id: '={{ $json.id }}', touch }), ...settings },
			reads
				? {
						...plain('Good', 'n8n-nodes-base.set', 600, {
							assignments: {
								assignments: [
									{
										id: '1',
										name: 'source',
										value: "={{ $('Split').item.json.id }}",
										type: 'string',
									},
								],
							},
							options: {},
						}),
						typeVersion: 3.4,
					}
				: plain('Good', 'n8n-nodes-base.noOp', 600, {}),
			plain('Bad', 'n8n-nodes-base.noOp', 800, {}),
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

const FILE = { status: 200, headers: { 'content-type': 'text/plain' }, body: 'hello bytes' };
const TOUCHED = { status: 200, headers: {}, body: { ok: true } };
const LIMIT =
	'http: the response body is 9 bytes; a stored file can have 8 (--binary-max-file-mb); the fallback host can run the node (limit: binary-max-file)';
const TOO_LARGE = { $error: LIMIT };
const FROM_HOST = [
	{ id: 'a', host: true },
	{ id: 'b', host: true },
];

async function run(
	settings: Record<string, unknown>,
	answers: unknown[],
	options: { touch?: boolean; trace?: boolean; reads?: boolean } = {},
) {
	const flow = workflowWith(settings, options.touch === true, options.reads === true);
	const result = convertWorkflow(flow, {
		nodeSources: options.reads ? sourcesWith([...ONE_CALL, '@pairedItems']) : nodeSources,
		instance: { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) },
		...(options.trace ? { trace: 'all' as const } : {}),
	});
	expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(result.fallbackNodes).toEqual([]);
	const compiled = compile(result.source, { extraNodes: result.nodes });
	expect(compiled.diagnostics).toEqual([]);
	const fixture = {
		trigger: { body: { list: [{ id: 'a' }, { id: 'b' }] }, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { Probe: answers, 'Probe (fallback host)': [FROM_HOST] },
	};
	const reference = await runReference(result.source, fixture, { extraNodes: result.nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	const kinds = reference.effects
		.filter((effect) => effect.step.startsWith('Probe'))
		.map((effect) => {
			const args: unknown = effect.args;
			const method =
				typeof args === 'object' && args !== null && 'method' in args ? args.method : '';
			return effect.kind === 'http' ? `http ${String(method)}` : effect.kind;
		});
	const hostCall = reference.effects.find(
		(effect) => effect.step === 'Probe (fallback host)' && effect.kind === 'node',
	);
	return {
		status: reference.status,
		result: reference.result,
		kinds,
		hostCall,
		source: result.source,
	};
}

describe('a compiled node that reaches the largest size of a stored file', () => {
	it('runs compiled when the files are not too large', async () => {
		const out = await run({}, [FILE]);
		expect(out.status).toBe('ok');
		expect(out.kinds).toEqual(['http GET', 'http GET']);
		expect(out.result).toMatchObject({ Good: [{ id: 'a' }, { id: 'b' }] });
	});

	it('runs the node in the fallback host in the same run, with the v1 parameters', async () => {
		const out = await run({}, [FILE, TOO_LARGE]);
		expect(out.status).toBe('ok');
		expect(out.kinds).toEqual(['http GET', 'http GET', 'node']);
		expect(out.result).toEqual({ Good: FROM_HOST });
		expect(out.hostCall?.args).toMatchObject({
			type: TYPE,
			parameters: { id: '={{ $json.id }}', touch: false },
			items: [{ id: 'a' }, { id: 'b' }],
		});
	});

	it('does not trace the error of the limit when the host runs the node', async () => {
		const out = await run({}, [TOO_LARGE], { trace: true });
		expect(out.status).toBe('ok');
		expect(out.result).toEqual({ Good: FROM_HOST });
	});

	it('runs the node in the host under "continue on fail" too', async () => {
		const out = await run({ onError: 'continueRegularOutput' }, [TOO_LARGE]);
		expect(out.status).toBe('ok');
		expect(out.kinds).toEqual(['http GET', 'node']);
		expect(out.result).toEqual({ Good: FROM_HOST });
	});

	it('runs the node in the host under "continue (using error output)" too', async () => {
		const out = await run({ onError: 'continueErrorOutput' }, [FILE, TOO_LARGE]);
		expect(out.status).toBe('ok');
		expect(out.kinds).toEqual(['http GET', 'http GET', 'node']);
		expect(out.result).toMatchObject({ Good: FROM_HOST });
	});

	it('does not wait and try again under "retry on fail"', async () => {
		const retry = { retryOnFail: true, maxTries: 3, waitBetweenTries: 10 };
		const out = await run(retry, [TOO_LARGE]);
		expect(out.kinds).toEqual(['http GET', 'node']);
		expect(out.result).toEqual({ Good: FROM_HOST });
		const kept = await run({ onError: 'continueRegularOutput', ...retry }, [TOO_LARGE]);
		expect(kept.kinds).toEqual(['http GET', 'node']);
		expect(kept.result).toEqual({ Good: FROM_HOST });
	});

	it('does not run the node again after a request that v1 sends once', async () => {
		const stop = await run({}, [TOUCHED, TOO_LARGE], { touch: true });
		expect(stop.kinds).toEqual(['http POST', 'http GET']);
		expect(stop.status).not.toBe('ok');
		const kept = await run(
			{ onError: 'continueRegularOutput' },
			[TOUCHED, TOO_LARGE, TOUCHED, FILE],
			{
				touch: true,
			},
		);
		expect(kept.kinds).toEqual(['http POST', 'http GET', 'http POST', 'http GET']);
		expect(kept.result).toMatchObject({ Good: [{ error: LIMIT }, { id: 'b' }] });
		expect(JSON.stringify(kept.result)).not.toContain(RUNS_IN_HOST);
	});

	it('gives another error of the node as before', async () => {
		const out = await run({ onError: 'continueRegularOutput' }, [
			{ status: 404, headers: {}, body: 'no' },
			FILE,
		]);
		expect(out.kinds).toEqual(['http GET', 'http GET']);
		expect(out.result).toMatchObject({ Good: [{ error: expect.any(String) }, { id: 'b' }] });
	});

	it('keeps no paired items, so a later read of a paired item is not compiled as exact', async () => {
		// The host runs the v1 node for all items and gives no paired items. The v1 node pairs
		// each of its items with its input item, so no rule of positions gives v1's item: for
		// the items `a, a2, b` of the inputs `a, b`, the read by position gives `a, b` and
		// nothing, and v1 gives `a, a, b`.
		const flow = workflowWith({}, false, true);
		const result = convertWorkflow(flow, {
			nodeSources: sourcesWith([...ONE_CALL, '@pairedItems']),
			instance: { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) },
		});
		expect(result.source).not.toContain('.paired');
		expect(result.diagnostics.filter((d) => d.code === 'paired-item').map((d) => d.node)).toEqual([
			'Good',
		]);
		// The node itself hands over as before.
		const out = await run({}, [FILE, TOO_LARGE], { reads: true });
		expect(out.status).toBe('ok');
		expect(out.kinds).toEqual(['http GET', 'http GET', 'node']);
		const stopped = await run({}, [TOUCHED, TOO_LARGE], { reads: true, touch: true });
		expect(stopped.kinds).toEqual(['http POST', 'http GET']);
		expect(stopped.status).not.toBe('ok');
	}, 30_000);

	it('runs the node in the host when its compiled form is a call for each item', () => {
		const convert = (settings: Record<string, unknown>) =>
			convertWorkflow(workflowWith(settings, false), {
				nodeSources: sourcesWith([]),
				instance: { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) },
			});
		// A call for one item does not know what the calls for the items before it sent.
		expect(convert({ onError: 'continueRegularOutput' }).fallbackNodes).toEqual(['Probe']);
		expect(convert({ onError: 'continueErrorOutput' }).fallbackNodes).toEqual(['Probe']);
		expect(convert({}).fallbackNodes).toEqual([]);
	});
});

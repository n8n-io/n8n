import { validate } from '@n8n/node-sdk';
import { ManualTrigger } from 'n8n-nodes-base/dist/nodes/ManualTrigger/ManualTrigger.node';
import { SplitInBatchesV3 } from 'n8n-nodes-base/dist/nodes/SplitInBatches/v3/SplitInBatchesV3.node';
import {
	NodeHelpers,
	type IDataObject,
	type INodeExecutionData,
	type INodeParameters,
} from 'n8n-workflow';

import { loopBatches } from '../../nodes/loop/actions/batches';
import { manualTrigger } from '../../nodes/manual/actions/trigger';

const loopDescription = new SplitInBatchesV3().description;

const keptByLoop = (parameters: INodeParameters) =>
	NodeHelpers.getNodeParameters(
		loopDescription.properties,
		parameters,
		true,
		false,
		{ typeVersion: 3 },
		loopDescription,
	);

/** Runs Loop Over Items v3 once, with one node context for all runs, as n8n keeps it. */
function loopRunner(parameters: IDataObject) {
	const nodeContext: IDataObject = {};
	const source = [{ previousNode: 'Before' }];
	return async (items: INodeExecutionData[]) =>
		await new SplitInBatchesV3().execute.call({
			getInputData: () => items,
			getContext: () => nodeContext,
			getNodeParameter: (name: string, _index: number, fallback?: unknown) =>
				parameters[name] ?? fallback,
			getInputSourceData: () => source[0],
		} as never);
}

describe('flow native contracts against the legacy nodes', () => {
	it('name the legacy node types, versions and outputs', () => {
		expect([loopBatches.native, manualTrigger.native]).toEqual([
			{ type: 'n8n-nodes-base.splitInBatches', version: 3 },
			{ type: 'n8n-nodes-base.manualTrigger', version: 1, on: 'manual' },
		]);
		expect(loopDescription.name).toBe('splitInBatches');
		expect(loopDescription.outputNames).toEqual(loopBatches.outputs);
		const manual = new ManualTrigger().description;
		expect([manual.name, manual.version]).toEqual(['manualTrigger', 1]);
	});

	it.each<[string, INodeParameters]>([
		['a batch size', { batchSize: 2 }],
		[
			'the reset of a nested loop',
			{ batchSize: 1, options: { reset: '={{ !["Line"].includes($prevNode.name) }}' } },
		],
		['a plain reset', { batchSize: 10, options: { reset: true } }],
	])('keep every Loop Over Items parameter the contract emits: %s', (_name, parameters) => {
		expect(validate(parameters, loopBatches.inputSchema, { allowExpressions: true })).toEqual([]);
		expect(keptByLoop(parameters)).toMatchObject(parameters);
	});

	it('reject a batch size the legacy node does not take', () => {
		expect(validate({ batchSize: 0 }, loopBatches.inputSchema)).not.toEqual([]);
		expect(validate({}, loopBatches.inputSchema)).not.toEqual([]);
	});

	it('pass items on as Loop Over Items does: batches on loop, then all returned items on done', async () => {
		const run = loopRunner({ batchSize: 2 });
		const input = [{ n: 1 }, { n: 2 }, { n: 3 }].map((json) => ({ json }));
		const first = await run(input);
		expect(first?.map((items) => items.map(({ json }) => json))).toEqual([
			[],
			[{ n: 1 }, { n: 2 }],
		]);
		const second = await run([{ json: { n: 1, done: true } }, { json: { n: 2, done: true } }]);
		expect(second?.map((items) => items.map(({ json }) => json))).toEqual([[], [{ n: 3 }]]);
		const third = await run([{ json: { n: 3, done: true } }]);
		expect(third?.map((items) => items.map(({ json }) => json))).toEqual([
			[
				{ n: 1, done: true },
				{ n: 2, done: true },
				{ n: 3, done: true },
			],
			[],
		]);
		const emitted = [first, second, third].flatMap((outputs) => (outputs ?? []).flat());
		expect(emitted.flatMap(({ json }) => validate(json, loopBatches.output.json))).toEqual([]);
	});

	it('type the item the Manual Trigger node emits', async () => {
		const emitted: INodeExecutionData[][][] = [];
		const context = {
			emit: (data: INodeExecutionData[][]) => emitted.push(data),
			helpers: { returnJsonArray: (items: IDataObject[]) => items.map((json) => ({ json })) },
		};
		const { manualTriggerFunction } = await new ManualTrigger().trigger.call(context as never);
		await manualTriggerFunction?.();
		expect(emitted).toEqual([[[{ json: {} }]]]);
		expect(validate({}, manualTrigger.output.json)).toEqual([]);
		expect(validate({}, manualTrigger.inputSchema)).toEqual([]);
	});
});

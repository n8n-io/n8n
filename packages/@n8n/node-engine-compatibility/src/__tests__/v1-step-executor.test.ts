import type { WorkflowGraph } from '@n8n/engine';
import { describe, expect, it } from 'vitest';

import {
	EngineRequestNotSupportedError,
	MalformedStepConfigError,
	UnknownNodeTypeError,
	UnsupportedNodeTypeError,
	UnsupportedStepTypeError,
} from '../errors';
import { V1StepExecutor } from '../v1-step-executor';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import {
	items,
	stepRequest,
	testAdditionalDataFactory,
	testNodeTypes,
	v1Workflow,
} from './fixtures';

const converter = new V1WorkflowConverter();
const executor = new V1StepExecutor({
	nodeTypes: testNodeTypes,
	additionalDataFactory: testAdditionalDataFactory,
});

const graphWith = (type: string, parameters = {}): WorkflowGraph =>
	converter.convert(
		v1Workflow([
			{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
			{ id: 'n', name: 'Subject', type, parameters },
		]),
	);

describe('V1StepExecutor', () => {
	it('resolves `getNodeParameter` per item', async () => {
		const graph = graphWith('test.echoParam', { message: 'hi' });
		const result = await executor.execute(stepRequest(graph, 'n', items({ a: 1 }, { a: 2 })));
		expect(result.outputs).toEqual([[{ json: { message: 'hi' } }, { json: { message: 'hi' } }]]);
		// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify
		expect(JSON.parse(JSON.stringify(result.outputs))).toEqual(result.outputs);
	});

	it('guarantees one item for empty input', async () => {
		const graph = graphWith('test.echoParam', { message: 'solo' });
		const result = await executor.execute(stepRequest(graph, 'n', []));
		expect(result.outputs).toEqual([[{ json: { message: 'solo' } }]]);
	});

	it('rejects non-v1-node steps', async () => {
		const graph = graphWith('n8n-nodes-base.noOp');
		const triggerStep = stepRequest(graph, 't', []);
		const execution = executor.execute(triggerStep);
		await expect(execution).rejects.toThrow(UnsupportedStepTypeError);
	});

	it.each([
		['missing', undefined],
		['null', null],
		['a string', 'nonsense'],
		['missing nodeType', { typeVersion: 1, parameters: {}, continueOnFail: false }],
		[
			'non-record parameters',
			{ nodeType: 'x', typeVersion: 1, parameters: 'bad', continueOnFail: false },
		],
	])('rejects a v1-node step whose config is %s', async (_, config) => {
		const graph = graphWith('n8n-nodes-base.noOp');
		const request = stepRequest(graph, 'n', []);
		request.node = { ...request.node, config };
		const execution = executor.execute(request);
		await expect(execution).rejects.toThrow(MalformedStepConfigError);
	});

	it('rejects unknown node types', async () => {
		const graph = graphWith('test.doesNotExist');
		const execution = executor.execute(stepRequest(graph, 'n', []));
		await expect(execution).rejects.toThrow(UnknownNodeTypeError);
	});

	it('rejects node types without an execute method', async () => {
		const graph = graphWith('test.noExecute');
		const execution = executor.execute(stepRequest(graph, 'n', []));
		await expect(execution).rejects.toThrow(UnsupportedNodeTypeError);
	});

	it('propagates node errors per the IStepExecutor failure contract', async () => {
		const graph = graphWith('test.alwaysFails');
		const execution = executor.execute(stepRequest(graph, 'n', []));
		await expect(execution).rejects.toThrow('boom from node');
	});

	it('invokes new-style Node subclasses with the context as argument', async () => {
		const graph = graphWith('test.newStyleEcho');
		const result = await executor.execute(stepRequest(graph, 'n', items({ a: 1 })));
		expect(result.outputs).toEqual([[{ json: { a: 1, newStyle: true } }]]);
	});

	it('passes input through when the node throws and continueOnFail is set', async () => {
		const workflow = v1Workflow([
			{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
			{ id: 'n', name: 'Fails', type: 'test.alwaysFails' },
		]);
		(workflow.nodes[1] as { continueOnFail?: boolean }).continueOnFail = true;
		const graph = converter.convert(workflow);

		const result = await executor.execute(stepRequest(graph, 'n', items({ keep: 'me' })));
		expect(result.outputs).toEqual([[{ json: { keep: 'me' } }]]);
	});

	it('propagates cleanup errors when the node succeeded', async () => {
		const graph = graphWith('test.succeedsWithFailingCleanup');
		const execution = executor.execute(stepRequest(graph, 'n', items({ a: 1 })));
		await expect(execution).rejects.toThrow('cleanup boom');
	});

	it('preserves the node error over cleanup errors when both fail', async () => {
		const graph = graphWith('test.failsWithFailingCleanup');
		const execution = executor.execute(stepRequest(graph, 'n', items({ a: 1 })));
		await expect(execution).rejects.toThrow('boom from node');
	});

	it('throws on EngineRequest results instead of dropping them', async () => {
		const graph = graphWith('test.returnsEngineRequest');
		const execution = executor.execute(stepRequest(graph, 'n', items({ a: 1 })));
		await expect(execution).rejects.toThrow(EngineRequestNotSupportedError);
	});

	it('does not let continueOnFail swallow the EngineRequest rejection', async () => {
		const workflow = v1Workflow([
			{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
			{ id: 'n', name: 'Agent', type: 'test.returnsEngineRequest' },
		]);
		(workflow.nodes[1] as { continueOnFail?: boolean }).continueOnFail = true;
		const graph = converter.convert(workflow);

		const execution = executor.execute(stepRequest(graph, 'n', items({ a: 1 })));
		await expect(execution).rejects.toThrow(EngineRequestNotSupportedError);
	});

	it('routes multi-output results to their output slots', async () => {
		const graph = converter.convert(
			v1Workflow(
				[
					{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
					{ id: 'n', name: 'Splitter', type: 'test.twoOutputs' },
					{ id: 'a', name: 'A', type: 'n8n-nodes-base.noOp' },
					{ id: 'b', name: 'B', type: 'n8n-nodes-base.noOp' },
				],
				{
					Manual: { main: [[{ node: 'Splitter', type: 'main', index: 0 }]] },
					Splitter: {
						main: [
							[{ node: 'A', type: 'main', index: 0 }],
							[{ node: 'B', type: 'main', index: 0 }],
						],
					},
				},
			),
		);

		const result = await executor.execute(stepRequest(graph, 'n', items({ a: 1 })));
		expect(result.outputs).toEqual([[{ json: { a: 1 } }], [{ json: { a: 1, second: true } }]]);
	});

	it('rejects batch steps until the engine iterates loops natively', async () => {
		const graph = converter.convert(
			v1Workflow(
				[
					{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
					{ id: 'loop', name: 'Loop', type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 },
					{ id: 'body', name: 'Body', type: 'n8n-nodes-base.noOp' },
				],
				{
					Manual: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
					Loop: { main: [[], [{ node: 'Body', type: 'main', index: 0 }]] },
					Body: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
				},
			),
		);

		const execution = executor.execute(stepRequest(graph, 'loop', items({ a: 1 })));
		await expect(execution).rejects.toThrow(UnsupportedStepTypeError);
	});

	it('honors onError=continueRegularOutput as passthrough', async () => {
		const workflow = v1Workflow([
			{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
			{ id: 'n', name: 'Fails', type: 'test.alwaysFails' },
		]);
		(workflow.nodes[1] as { onError?: string }).onError = 'continueRegularOutput';
		const graph = converter.convert(workflow);

		const result = await executor.execute(stepRequest(graph, 'n', items({ keep: 'me' })));
		expect(result.outputs).toEqual([[{ json: { keep: 'me' } }]]);
	});
});

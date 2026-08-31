import type { WorkflowGraph } from '@n8n/engine';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type { IConnections, IDataObject } from 'n8n-workflow';
import { Expression, ExpressionError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import {
	EngineRequestNotSupportedError,
	MalformedStepConfigError,
	UnsupportedNodeTypeError,
	UnsupportedStepTypeError,
	VmExpressionEngineRequiredError,
} from '../errors';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import { items, stepRequest, testStepExecutor, v1Workflow } from './fixtures';

const converter = new V1WorkflowConverter();

// The converter drops nodes the trigger cannot reach.
const manualTriggerTo = (name: string): IConnections => ({
	Manual: { main: [[{ node: name, type: 'main', index: 0 }]] },
});

const graphWith = (type: string, parameters = {}): WorkflowGraph =>
	converter.convert(
		v1Workflow(
			[
				{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				{ id: 'n', name: 'Subject', type, parameters },
			],
			manualTriggerTo('Subject'),
		),
	);

describe('V1StepExecutor', () => {
	it('rejects legacy expression engine', async () => {
		vi.spyOn(Expression, 'getActiveImplementation').mockReturnValue('legacy');
		try {
			const graph = graphWith('test.echoParam', { message: 'hi' });
			const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', items({})));
			await expect(execution).rejects.toThrow(VmExpressionEngineRequiredError);
		} finally {
			vi.restoreAllMocks();
		}
	});

	it('accepts the quickjs expression engine', async () => {
		vi.spyOn(Expression, 'getActiveImplementation').mockReturnValue('quickjs');
		try {
			const graph = graphWith('test.echoParam', { message: 'hi' });
			const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', items({})));
			expect(result.outputs).toEqual([[{ json: { message: 'hi' } }]]);
		} finally {
			vi.restoreAllMocks();
		}
	});

	it('resolves `getNodeParameter` per item', async () => {
		const graph = graphWith('test.echoParam', { message: 'hi' });
		const result = await testStepExecutor(graph).execute(
			stepRequest(graph, 'n', items({ a: 1 }, { a: 2 })),
		);
		expect(result.outputs).toEqual([[{ json: { message: 'hi' } }, { json: { message: 'hi' } }]]);
		// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify
		expect(JSON.parse(JSON.stringify(result.outputs))).toEqual(result.outputs);
	});

	it('guarantees one item for empty input', async () => {
		const graph = graphWith('test.echoParam', { message: 'solo' });
		const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', []));
		expect(result.outputs).toEqual([[{ json: { message: 'solo' } }]]);
	});

	it('rejects non-v1-node steps', async () => {
		const graph = graphWith('n8n-nodes-base.noOp');
		const triggerStep = stepRequest(graph, 't', []);
		const execution = testStepExecutor(graph).execute(triggerStep);
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
		const execution = testStepExecutor(graph).execute(request);
		await expect(execution).rejects.toThrow(MalformedStepConfigError);
	});

	it('rejects unknown node types', async () => {
		const graph = graphWith('test.doesNotExist');
		const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', []));
		await expect(execution).rejects.toThrow(UnrecognizedNodeTypeError);
	});

	it('rejects node types without an execute method', async () => {
		const graph = graphWith('test.noExecute');
		const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', []));
		await expect(execution).rejects.toThrow(UnsupportedNodeTypeError);
	});

	it('propagates node errors per the IStepExecutor failure contract', async () => {
		const graph = graphWith('test.alwaysFails');
		const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', []));
		await expect(execution).rejects.toThrow('boom from node');
	});

	it('invokes new-style Node subclasses with the context as argument', async () => {
		const graph = graphWith('test.newStyleEcho');
		const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', items({ a: 1 })));
		expect(result.outputs).toEqual([[{ json: { a: 1, newStyle: true } }]]);
	});

	it('passes input through when the node throws and continueOnFail is set', async () => {
		const workflow = v1Workflow(
			[
				{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				{ id: 'n', name: 'Fails', type: 'test.alwaysFails' },
			],
			manualTriggerTo('Fails'),
		);
		(workflow.nodes[1] as { continueOnFail?: boolean }).continueOnFail = true;
		const graph = converter.convert(workflow);

		const result = await testStepExecutor(graph).execute(
			stepRequest(graph, 'n', items({ keep: 'me' })),
		);
		expect(result.outputs).toEqual([[{ json: { keep: 'me' } }]]);
	});

	it('propagates cleanup errors when the node succeeded', async () => {
		const graph = graphWith('test.succeedsWithFailingCleanup');
		const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', items({ a: 1 })));
		await expect(execution).rejects.toThrow('cleanup boom');
	});

	it('preserves the node error over cleanup errors when both fail', async () => {
		const graph = graphWith('test.failsWithFailingCleanup');
		const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', items({ a: 1 })));
		await expect(execution).rejects.toThrow('boom from node');
	});

	it('throws on EngineRequest results instead of dropping them', async () => {
		const graph = graphWith('test.returnsEngineRequest');
		const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', items({ a: 1 })));
		await expect(execution).rejects.toThrow(EngineRequestNotSupportedError);
	});

	it('does not let continueOnFail swallow the EngineRequest rejection', async () => {
		const workflow = v1Workflow(
			[
				{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				{ id: 'n', name: 'Agent', type: 'test.returnsEngineRequest' },
			],
			manualTriggerTo('Agent'),
		);
		(workflow.nodes[1] as { continueOnFail?: boolean }).continueOnFail = true;
		const graph = converter.convert(workflow);

		const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', items({ a: 1 })));
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

		const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', items({ a: 1 })));
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

		const execution = testStepExecutor(graph).execute(stepRequest(graph, 'loop', items({ a: 1 })));
		await expect(execution).rejects.toThrow(UnsupportedStepTypeError);
	});

	describe('expressions', () => {
		const expressionWorkflow = (bParameters: IDataObject) =>
			converter.convert(
				v1Workflow(
					[
						{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
						{ id: 'a', name: 'A', type: 'test.echoParam', parameters: { message: 'from-A' } },
						{ id: 'b', name: 'B', type: 'test.echoParam', parameters: bParameters },
					],
					{
						Manual: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
						A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					},
				),
			);

		it('resolves $json per item against the step inputs', async () => {
			const graph = graphWith('test.echoParam', { message: '={{ $json.a }}' });
			const result = await testStepExecutor(graph).execute(
				stepRequest(graph, 'n', items({ a: 1 }, { a: 2 })),
			);
			expect(result.outputs).toEqual([[{ json: { message: 1 } }, { json: { message: 2 } }]]);
		});

		it('resolves $(...) against a completed step output, convert to execute', async () => {
			const graph = expressionWorkflow({ message: "={{ $('A').first().json.message }}" });

			const aResult = await testStepExecutor(graph).execute(stepRequest(graph, 'a', items({})));
			const bResult = await testStepExecutor(graph, { a: aResult.outputs }).execute(
				stepRequest(graph, 'b', aResult.outputs),
			);

			expect(bResult.outputs).toEqual([[{ json: { message: 'from-A' } }]]);
		});

		it('resolves $prevNode from the input provenance in the graph', async () => {
			const graph = expressionWorkflow({ message: '={{ $prevNode.name }}' });
			const result = await testStepExecutor(graph).execute(stepRequest(graph, 'b', items({})));
			expect(result.outputs).toEqual([[{ json: { message: 'A' } }]]);
		});

		it('rejects a reference to an unexecuted node', async () => {
			const graph = expressionWorkflow({ message: "={{ $('A').first().json.message }}" });
			const execution = testStepExecutor(graph).execute(stepRequest(graph, 'b', items({})));
			await expect(execution).rejects.toThrow("Node 'A' hasn't been executed");
		});

		it('rejects a reference to a node absent from the graph', async () => {
			const graph = graphWith('test.echoParam', { message: "={{ $('Ghost').first().json.x }}" });
			const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', items({})));
			await expect(execution).rejects.toThrow(ExpressionError);
		});

		it('resolves a sibling reference even when its node type is not installed', async () => {
			const graph = converter.convert(
				v1Workflow(
					[
						{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
						{ id: 'a', name: 'A', type: 'community.notInstalled' },
						{
							id: 'b',
							name: 'B',
							type: 'test.echoParam',
							parameters: { message: "={{ $('A').first().json.tag }}" },
						},
					],
					{
						Manual: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
						A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					},
				),
			);

			const result = await testStepExecutor(graph, { a: items({ tag: 'ran-before' }) }).execute(
				stepRequest(graph, 'b', items({})),
			);
			expect(result.outputs).toEqual([[{ json: { message: 'ran-before' } }]]);
		});
	});

	it('honors onError=continueRegularOutput as passthrough', async () => {
		const workflow = v1Workflow(
			[
				{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				{ id: 'n', name: 'Fails', type: 'test.alwaysFails' },
			],
			manualTriggerTo('Fails'),
		);
		(workflow.nodes[1] as { onError?: string }).onError = 'continueRegularOutput';
		const graph = converter.convert(workflow);

		const result = await testStepExecutor(graph).execute(
			stepRequest(graph, 'n', items({ keep: 'me' })),
		);
		expect(result.outputs).toEqual([[{ json: { keep: 'me' } }]]);
	});
});

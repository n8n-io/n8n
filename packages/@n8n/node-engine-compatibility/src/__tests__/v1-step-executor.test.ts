import type { StepExecutionResult, StepSlots, WorkflowGraph } from '@n8n/engine';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type {
	IConnections,
	IDataObject,
	INodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	Expression,
	ExpressionError,
	WAIT_FOR_SUB_EXECUTION,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import {
	EngineRequestNotSupportedError,
	InvalidWaitDateError,
	MalformedStepConfigError,
	UnsupportedNodeTypeError,
	UnsupportedStepTypeError,
	UnsupportedWaitError,
	VmExpressionEngineRequiredError,
} from '../errors';
import { V1StepExecutor } from '../v1-step-executor';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import {
	items,
	stepRequest,
	testAdditionalDataFactory,
	testNodeTypes,
	testStepExecutor,
	v1Workflow,
} from './fixtures';

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

/** The outputs of a result, for a test that feeds one step's output into the next. */
function outputsOf(result: StepExecutionResult): StepSlots {
	if (result.wait) throw new Error('the step declared a wait, but the test expects outputs');
	return result.outputs;
}

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

	it('builds the additional data from the execution context of the step', async () => {
		const graph = graphWith('test.echoParam', { message: 'hi' });
		const additionalDataFactory = vi.fn(testAdditionalDataFactory);
		const executor = new V1StepExecutor({
			nodeTypes: testNodeTypes,
			additionalDataFactory,
			loadStepData: async () => await Promise.resolve({ graph, outputsByNode: {} }),
		});
		const request = stepRequest(graph, 'n', items({}));
		request.context = {
			...request.context,
			mode: 'production',
			callerContext: { hostMode: 'webhook', userId: 'user-1', projectId: 'project-1' },
		};

		await executor.execute(request);

		expect(additionalDataFactory).toHaveBeenCalledExactlyOnceWith({
			executionId: 'exec-1',
			workflowId: 'wf-1',
			mode: 'webhook',
			userId: 'user-1',
			projectId: 'project-1',
		});
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
			const aOutputs = outputsOf(aResult);
			const bResult = await testStepExecutor(graph, { a: aOutputs }).execute(
				stepRequest(graph, 'b', aOutputs),
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

	describe('a node that puts the execution to wait', () => {
		const input = items({ keep: 'me' });
		const returned = items({ keep: 'me', returned: true });

		// v1 passes the node's input through when a timed wait resumes.
		it('declares a deadline wait that emits the input at the deadline', async () => {
			const graph = graphWith('test.waitsUntil', { waitTill: '2026-10-01T12:00:00.000Z' });
			const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
			expect(result).toEqual({
				wait: {
					resumeAt: '2026-10-01T12:00:00.000Z',
					outputsAtDeadline: input,
					acceptsResumeRequest: true,
				},
			});
		});

		it('fails the step when the node asks to wait until a value that is not a date', async () => {
			const graph = graphWith('test.waitsUntil', { waitTill: 'not a date' });
			const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
			await expect(execution).rejects.toThrow(InvalidWaitDateError);
		});

		it('declares a deadline-only wait when the node says only the deadline ends it', async () => {
			const graph = graphWith('test.waitsUntil', {
				waitTill: '2026-10-01T12:00:00.000Z',
				acceptsResumeRequest: false,
			});
			const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
			expect(result.wait?.acceptsResumeRequest).toBe(false);
		});

		// The Wait node's time modes used to sleep in the process below 65 seconds,
		// so the engine never saw them. The wait now suspends like any other: a
		// sleep would return without a declaration, so `result.wait` proves it.
		it('suspends a short time wait of the Wait node instead of sleeping', async () => {
			const graph = graphWith('n8n-nodes-base.wait', {
				resume: 'timeInterval',
				amount: 2,
				unit: 'seconds',
			});
			const before = Date.now();
			const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
			const after = Date.now();

			expect(result.wait).toMatchObject({ outputsAtDeadline: input, acceptsResumeRequest: false });
			const resumeAt = Date.parse(result.wait!.resumeAt!);
			expect(resumeAt).toBeGreaterThanOrEqual(before + 2000);
			expect(resumeAt).toBeLessThanOrEqual(after + 2000);
		});

		// Nothing can deliver a resume request yet, and a year-3000 deadline would
		// strand the execution, so this sentinel keeps today's no-op behaviour.
		it('completes with what the node returned for the WAIT_INDEFINITELY sentinel', async () => {
			const graph = graphWith('test.waitsUntil', { waitTill: WAIT_INDEFINITELY.toISOString() });
			const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
			expect(result).toEqual({ outputs: returned });
		});

		// Sub-workflow steps do not exist yet, so completing the step would report
		// a child that never finished.
		it('fails the step for the WAIT_FOR_SUB_EXECUTION sentinel', async () => {
			const graph = graphWith('test.waitsUntil', {
				waitTill: WAIT_FOR_SUB_EXECUTION.toISOString(),
			});
			const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
			await expect(execution).rejects.toThrow(UnsupportedWaitError);
			await expect(execution).rejects.toThrow('Engine 2.0 cannot wait for a sub-execution yet');
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

describe('the v1 execution mode a node sees', () => {
	const graph = graphWith('test.echoParam');

	/** Runs `Subject` and reports the mode its context exposed. */
	const modeSeenBy = async (hostMode: string): Promise<string> => {
		let seen = '';
		const reportsMode = {
			description: testNodeTypes.getByName('test.echoParam').description,
			async execute(this: { getMode: () => string }) {
				seen = this.getMode();
				return await Promise.resolve([]);
			},
		} as unknown as INodeType;

		const executor = new V1StepExecutor({
			nodeTypes: { ...testNodeTypes, getByNameAndVersion: () => reportsMode },
			additionalDataFactory: async (): Promise<IWorkflowExecuteAdditionalData> =>
				await testAdditionalDataFactory({
					executionId: 'exec-1',
					workflowId: 'wf-1',
					mode: 'manual',
				}),
			loadStepData: async () => await Promise.resolve({ graph, outputsByNode: {} }),
		});

		const request = stepRequest(graph, 'n', items({ a: 1 }));
		await executor.execute({
			...request,
			context: { ...request.context, callerContext: { hostMode } },
		});

		return seen;
	};

	// The coarse engine mode would report a production run as 'trigger', and
	// `isStreaming()` accepts only a few v1 modes, so a webhook run could not stream.
	it.each(['webhook', 'trigger', 'manual'])('is the host mode %s', async (hostMode) => {
		await expect(modeSeenBy(hostMode)).resolves.toBe(hostMode);
	});
});

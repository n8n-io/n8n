import type { JsonValue, StepExecutionResult, StepSlots, WorkflowGraph } from '@n8n/engine';
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
	if (result.wait || result.child) {
		throw new Error('the step declared a wait, but the test expects outputs');
	}
	return result.outputs;
}

/** What the response channel returns once it has carried a response. */
const sent = () => ({ ok: true as const, result: undefined });

/** An emitter that builds each chunk, so a test can read what the node streamed. */
const recordingEmitter = () => {
	const chunks: JsonValue[] = [];
	const respond = {
		send: vi.fn(sent),
		chunk: vi.fn((build: () => JsonValue) => {
			chunks.push(build());
			return sent();
		}),
	};
	return { chunks, respond };
};

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
		const request = stepRequest(graph, 'n', []);
		request.context.responseExpectation = { kind: 'stream' };
		const { chunks, respond } = recordingEmitter();
		request.respond = respond;
		const execution = testStepExecutor(graph).execute(request);
		await expect(execution).rejects.toThrow('boom from node');
		// Only a description goes to the caller. A plain error has none, so the
		// caller gets a generic text instead of its message.
		expect(chunks).toContainEqual({
			type: 'error',
			content: 'Node execution failed',
			metadata: {
				nodeId: 'n',
				nodeName: 'Subject',
				runIndex: 0,
				itemIndex: 0,
				timestamp: expect.any(Number),
			},
		});
	});

	it("streams the node error's description but not its message", async () => {
		const graph = graphWith('test.failsWithDescription');
		const request = stepRequest(graph, 'n', []);
		request.context.responseExpectation = { kind: 'stream' };
		const { chunks, respond } = recordingEmitter();
		request.respond = respond;

		await expect(testStepExecutor(graph).execute(request)).rejects.toThrow('key=secret');

		expect(chunks).toEqual([
			expect.objectContaining({ type: 'error', content: 'The service rejected the request' }),
		]);
		expect(JSON.stringify(chunks)).not.toContain('secret');
	});

	it('keeps the node error when its error chunk cannot be sent', async () => {
		const graph = graphWith('test.alwaysFails');
		const request = stepRequest(graph, 'n', []);
		request.context.responseExpectation = { kind: 'stream' };
		request.respond = {
			send: vi.fn(sent),
			chunk: vi.fn(() => ({ ok: false as const, error: new Error('Chunk failed') })),
		};

		await expect(testStepExecutor(graph).execute(request)).rejects.toThrow('boom from node');
		expect(request.respond.chunk).toHaveBeenCalledOnce();
	});

	it('does not publish an error chunk for a non-streaming run', async () => {
		const graph = graphWith('test.alwaysFails');
		const request = stepRequest(graph, 'n', []);
		request.respond = { send: vi.fn(sent), chunk: vi.fn(sent) };

		await expect(testStepExecutor(graph).execute(request)).rejects.toThrow('boom from node');

		expect(request.respond.chunk).not.toHaveBeenCalled();
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
		const request = stepRequest(graph, 'n', items({ keep: 'me' }));
		request.context.responseExpectation = { kind: 'stream' };
		const { chunks, respond } = recordingEmitter();
		request.respond = respond;

		const result = await testStepExecutor(graph).execute(request);
		expect(result.outputs).toEqual([[{ json: { keep: 'me' } }]]);
		expect(chunks).toContainEqual(expect.objectContaining({ type: 'error' }));
		expect(JSON.stringify(chunks)).not.toContain('boom from node');
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

		// The flag defaults to true, as it does in core. The deadline emits the
		// node's input, which is what v1 passes through on a timed resume.
		it.each([
			['omitted', true],
			['true', true],
			['false', false],
		])(
			'declares a deadline wait with acceptsResumeRequest %s',
			async (acceptsResumeRequest, declared) => {
				const graph = graphWith('test.waitsUntil', {
					waitTill: '2026-10-01T12:00:00.000Z',
					acceptsResumeRequest,
				});
				const result = await testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
				expect(result).toEqual({
					wait: {
						resumeAt: '2026-10-01T12:00:00.000Z',
						outputsAtDeadline: input,
						acceptsResumeRequest: declared,
					},
				});
			},
		);

		it('fails the step when the node asks to wait until a value that is not a date', async () => {
			const graph = graphWith('test.waitsUntil', { waitTill: 'not a date' });
			const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
			await expect(execution).rejects.toThrow(InvalidWaitDateError);
			await expect(execution).rejects.toThrow(
				'Node "Subject" asked to wait until a date that is not valid',
			);
		});

		// The v1 hook sets the status in the host's `ActiveExecutions`. A data-plane
		// run is not registered there, so the call throws.
		it('does not call the host execution status hook', async () => {
			const graph = graphWith('test.waitsUntil', { waitTill: '2026-10-01T12:00:00.000Z' });
			const setExecutionStatus = vi.fn();
			const executor = new V1StepExecutor({
				nodeTypes: testNodeTypes,
				additionalDataFactory: async (context) => ({
					...(await testAdditionalDataFactory(context)),
					setExecutionStatus,
				}),
				loadStepData: async () => await Promise.resolve({ graph, outputsByNode: {} }),
			});

			const result = await executor.execute(stepRequest(graph, 'n', input));

			expect(result.wait).toBeDefined();
			expect(setExecutionStatus).not.toHaveBeenCalled();
		});

		// Core sleeps in the process for a deadline-only wait under 65 s. A sleep
		// returns no declaration, so `result.wait` proves that the step suspended.
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

		// Nothing can deliver a resume request yet and sub-workflow steps do not
		// exist, so completing the step would report a wait that never happened.
		it.each([
			[
				'WAIT_INDEFINITELY',
				WAIT_INDEFINITELY,
				'Node "Subject" waits with no time limit, and engine v2 cannot end that wait yet. Set a time limit on the node.',
			],
			[
				'WAIT_FOR_SUB_EXECUTION',
				WAIT_FOR_SUB_EXECUTION,
				'Node "Subject" waits for a sub-workflow that is itself waiting, and engine v2 cannot end that wait yet.',
			],
		])('fails the step for the %s sentinel', async (_, sentinel, message) => {
			const graph = graphWith('test.waitsUntil', { waitTill: sentinel.toISOString() });
			const execution = testStepExecutor(graph).execute(stepRequest(graph, 'n', input));
			await expect(execution).rejects.toThrow(message);
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

describe('sub-workflows', () => {
	const childGraph: WorkflowGraph = {
		nodes: [
			{ id: 'ct', name: 'When Executed by Another Workflow', type: 'trigger' },
			{ id: 'x', name: 'X', type: 'v1-node' },
		],
		edges: [{ from: 'ct', to: 'x', outputIndex: 0, inputIndex: 0 }],
	};
	const resolved = {
		workflowId: 'child',
		graph: childGraph,
		workflow: { id: 'child', name: 'Child' },
		triggerOutputs: [[{ json: { a: 1 } }]],
	};
	const input = items({ a: 1 }, { a: 2 });
	const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

	function executorWith(
		graph: WorkflowGraph,
		resolveSubWorkflow = vi.fn().mockResolvedValue(resolved),
	) {
		const executor = new V1StepExecutor({
			nodeTypes: testNodeTypes,
			additionalDataFactory: testAdditionalDataFactory,
			loadStepData: async () => await Promise.resolve({ graph, outputsByNode: {} }),
			resolveSubWorkflow,
		});
		return { executor, resolveSubWorkflow };
	}

	it('turns an awaited executeWorkflow call into a child, resolved through the host', async () => {
		const graph = graphWith('test.runsSubWorkflow');
		const { executor, resolveSubWorkflow } = executorWith(graph);

		const result = await executor.execute(stepRequest(graph, 'n', input));

		expect(result.child).toMatchObject(resolved);
		expect(result.child?.executionId).toMatch(UUID_V7);
		expect(resolveSubWorkflow).toHaveBeenCalledExactlyOnceWith({
			workflowId: 'child',
			// The same id the child then runs under.
			executionId: result.child?.executionId,
			parent: {
				executionId: 'exec-1',
				workflowId: 'wf-1',
				mode: 'manual',
				node: { id: 'n', name: 'Subject', type: 'test.runsSubWorkflow', typeVersion: 1 },
			},
			context: { userId: undefined, projectId: undefined },
			items: [{ json: { a: 1 } }, { json: { a: 2 } }],
		});
	});

	it('starts a fire-and-forget call as a detached child and keeps the node outputs', async () => {
		const graph = graphWith('test.firesSubWorkflow');
		const { executor } = executorWith(graph);

		const result = await executor.execute(stepRequest(graph, 'n', input));

		expect(result.child).toBeUndefined();
		expect(result.detached).toHaveLength(1);
		expect(result.detached?.[0]).toMatchObject(resolved);
		// The node reports the child id, as it does on v1, with no data.
		expect(result.outputs).toEqual([
			[{ json: { childId: result.detached?.[0].executionId, data: [null] } }],
		]);
	});

	it('answers executeWorkflow from the child result on a child resume, asking the host for nothing', async () => {
		const graph = graphWith('test.echoesSubWorkflow');
		const { executor, resolveSubWorkflow } = executorWith(graph);
		const resume = {
			kind: 'child' as const,
			executionId: 'child-1',
			status: 'completed' as const,
			result: [
				{ nodeId: 'x', iteration: 0, outputs: [[{ json: { from: 'x' } }]] },
				{
					nodeId: 'y',
					iteration: 0,
					outputs: [[{ json: { from: 'y' } }], [{ json: { second: true } }]],
				},
			],
		};

		const result = await executor.execute({ ...stepRequest(graph, 'n', input), resume });

		// Terminal outputs concatenate per slot, in the order the child reported them.
		expect(result.outputs).toEqual([
			[{ json: { from: 'x' } }, { json: { from: 'y' } }],
			[{ json: { second: true } }],
		]);
		expect(resolveSubWorkflow).not.toHaveBeenCalled();
	});

	it('keeps only the last pass of each terminal node when the caller asks for the last run only', async () => {
		const graph = graphWith('test.echoesSubWorkflow', { returnLastRunOnly: true });
		const { executor } = executorWith(graph);
		const resume = {
			kind: 'child' as const,
			executionId: 'child-1',
			status: 'completed' as const,
			result: [
				{ nodeId: 'x', iteration: 0, outputs: [[{ json: { pass: 0 } }]] },
				{ nodeId: 'x', iteration: 1, outputs: [[{ json: { pass: 1 } }]] },
			],
		};

		const result = await executor.execute({ ...stepRequest(graph, 'n', input), resume });

		expect(result.outputs).toEqual([[{ json: { pass: 1 } }]]);
	});

	it('fails the node with the child error on a failed child resume', async () => {
		const graph = graphWith('test.echoesSubWorkflow');
		const { executor } = executorWith(graph);
		const resume = {
			kind: 'child' as const,
			executionId: 'child-1',
			status: 'failed' as const,
			error: { name: 'TypeError', message: 'child boom' },
		};

		const execution = executor.execute({ ...stepRequest(graph, 'n', input), resume });

		await expect(execution).rejects.toThrow('child boom');
	});

	it('refuses an inline sub-workflow and asks the host for nothing', async () => {
		const graph = graphWith('test.runsInlineSubWorkflow');
		const { executor, resolveSubWorkflow } = executorWith(graph);

		await expect(executor.execute(stepRequest(graph, 'n', input))).rejects.toThrow(
			'Engine v2 runs sub-workflows from the database only',
		);
		expect(resolveSubWorkflow).not.toHaveBeenCalled();
	});

	it('refuses a second call in one run, so "once for each item" fails before any child starts', async () => {
		const graph = graphWith('test.runsSubWorkflowPerItem');
		const { executor, resolveSubWorkflow } = executorWith(graph);

		await expect(executor.execute(stepRequest(graph, 'n', input))).rejects.toThrow(
			'Engine v2 runs one sub-workflow for each run of a node',
		);
		expect(resolveSubWorkflow).toHaveBeenCalledTimes(1);
	});

	it('refuses the call when the host resolves no sub-workflows', async () => {
		const graph = graphWith('test.runsSubWorkflow');

		await expect(testStepExecutor(graph).execute(stepRequest(graph, 'n', input))).rejects.toThrow(
			'This host cannot run sub-workflows',
		);
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

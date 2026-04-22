import type {
	NodeExecuteAfterContext,
	NodeExecuteBeforeContext,
	WorkflowExecuteAfterContext,
	WorkflowExecuteBeforeContext,
} from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import type { IRun, IRunExecutionData } from 'n8n-workflow';

import type { ExecutionLevelTracer } from '../execution-level-tracer';
import type { OtelConfig } from '../otel.config';
import { OtelLifecycleHandler, countInputItems, countOutputItems } from '../otel-lifecycle-handler';
import type { TracingContext, TraceContextService } from '../tracing-context';

const emptyExecutionData = {
	resultData: { runData: {}, pinData: {} },
	executionData: undefined,
} as unknown as IRunExecutionData;

describe('OtelLifecycleHandler', () => {
	describe('onWorkflowStart', () => {
		const tracer = mock<ExecutionLevelTracer>();
		const traceContextService = mock<TraceContextService>();
		const config = mock<OtelConfig>();
		let handler: OtelLifecycleHandler;

		const parentTracingContext: TracingContext = {
			traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
		};

		const generatedSpanContext: TracingContext = {
			traceparent: '00-0af7651916cd43dd8448eb211c80319c-00f067aa0ba902b7-01',
		};

		const baseCtx: WorkflowExecuteBeforeContext = {
			type: 'workflowExecuteBefore',
			workflow: {
				id: 'wf-1',
				name: 'Test',
				versionId: 'v1',
				nodes: [],
				connections: {},
				active: false,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				activeVersionId: null,
			},
			workflowInstance: undefined as never,
			executionId: 'exec-sub',
		};

		beforeEach(() => {
			jest.clearAllMocks();
			handler = new OtelLifecycleHandler(tracer, traceContextService, config);
			tracer.startWorkflow.mockReturnValue(generatedSpanContext);
		});

		it('should use own tracingContext when present (webhook case)', async () => {
			const ownContext: TracingContext = {
				traceparent: '00-aaaa651916cd43dd8448eb211c80319c-aaaa67aa0ba902b7-01',
			};
			traceContextService.get.mockResolvedValueOnce(ownContext);

			await handler.onWorkflowStart(baseCtx);

			expect(traceContextService.get).toHaveBeenCalledTimes(1);
			expect(traceContextService.get).toHaveBeenCalledWith('exec-sub');
			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ tracingContext: ownContext }),
			);
		});

		it('should inherit parent tracingContext for sub-workflows', async () => {
			traceContextService.get.mockResolvedValueOnce(parentTracingContext);

			const ctx: WorkflowExecuteBeforeContext = {
				...baseCtx,
				executionData: {
					parentExecution: { executionId: 'exec-parent', workflowId: 'wf-parent' },
				} as IRunExecutionData,
			};

			await handler.onWorkflowStart(ctx);

			expect(traceContextService.get).toHaveBeenCalledTimes(1);
			expect(traceContextService.get).toHaveBeenCalledWith('exec-parent');
			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ tracingContext: parentTracingContext }),
			);
		});

		it('should create root span when no own or parent context exists', async () => {
			traceContextService.get.mockResolvedValue(undefined);

			await handler.onWorkflowStart(baseCtx);

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ tracingContext: undefined }),
			);
		});

		it('should not look up parent when executionData has no parentExecution', async () => {
			traceContextService.get.mockResolvedValueOnce(undefined);

			await handler.onWorkflowStart(baseCtx);

			expect(traceContextService.get).toHaveBeenCalledTimes(1);
			expect(traceContextService.get).toHaveBeenCalledWith('exec-sub');
		});

		it('should always persist generated spanContext', async () => {
			traceContextService.get.mockResolvedValueOnce(parentTracingContext);

			await handler.onWorkflowStart(baseCtx);

			expect(traceContextService.persist).toHaveBeenCalledWith('exec-sub', generatedSpanContext);
		});
	});

	describe('onWorkflowResume', () => {
		const tracer = mock<ExecutionLevelTracer>();
		const traceContextService = mock<TraceContextService>();
		const config = mock<OtelConfig>();
		let handler: OtelLifecycleHandler;

		const prePauseContext: TracingContext = {
			traceparent: '00-0af7651916cd43dd8448eb211c80319c-1111111111111111-01',
		};
		const resumedSpanContext: TracingContext = {
			traceparent: '00-0af7651916cd43dd8448eb211c80319c-2222222222222222-01',
		};

		beforeEach(() => {
			jest.clearAllMocks();
			handler = new OtelLifecycleHandler(tracer, traceContextService, config);
			tracer.startWorkflow.mockReturnValue(resumedSpanContext);
		});

		it('should start a new root span linked to the pre-wait origin and not overwrite the persisted origin', async () => {
			traceContextService.get.mockResolvedValueOnce(prePauseContext);

			await handler.onWorkflowResume({
				type: 'workflowExecuteResume',
				workflow: { id: 'wf-1', name: 'Test', versionId: 'v1', nodes: [], connections: {} },
				workflowInstance: undefined as never,
				executionData: undefined as never,
				executionId: 'exec-resume',
			} as never);

			expect(traceContextService.get).toHaveBeenCalledWith('exec-resume');
			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					executionId: 'exec-resume',
					linkTo: prePauseContext,
				}),
			);
			// The post-resume call should NOT carry a parent context — it's a new root.
			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.not.objectContaining({ tracingContext: expect.anything() }),
			);
			// Origin stays authoritative; subsequent resumes should link to it too.
			expect(traceContextService.persist).not.toHaveBeenCalled();
		});
	});

	describe('onWorkflowEnd', () => {
		const tracer = mock<ExecutionLevelTracer>();
		const traceContextService = mock<TraceContextService>();
		const config = mock<OtelConfig>();
		let handler: OtelLifecycleHandler;

		beforeEach(() => {
			jest.clearAllMocks();
			handler = new OtelLifecycleHandler(tracer, traceContextService, config);
		});

		const makeCtx = (
			overrides: Partial<IRun> = {},
			retryOf?: string,
		): WorkflowExecuteAfterContext =>
			({
				type: 'workflowExecuteAfter',
				workflow: { id: 'wf-1', name: 'Test', nodes: [], connections: {} },
				executionId: 'exec-1',
				newStaticData: {},
				retryOf,
				runData: {
					status: 'success',
					mode: 'manual',
					data: { resultData: { runData: {}, pinData: {} } },
					...overrides,
				},
			}) as unknown as WorkflowExecuteAfterContext;

		it('should delegate to tracer.endWorkflow with mapped runData fields', () => {
			handler.onWorkflowEnd(makeCtx({ status: 'success', mode: 'webhook' }));

			expect(tracer.endWorkflow).toHaveBeenCalledWith({
				executionId: 'exec-1',
				status: 'success',
				mode: 'webhook',
				error: undefined,
				isRetry: false,
				retryOf: undefined,
			});
		});

		it('should forward error from runData.data.resultData', () => {
			const error = new Error('boom');
			const ctx = makeCtx({
				status: 'error',
				mode: 'manual',
				data: { resultData: { runData: {}, pinData: {}, error } },
			} as unknown as Partial<IRun>);

			handler.onWorkflowEnd(ctx);

			expect(tracer.endWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'error', error }),
			);
		});

		it('should derive isRetry from mode=retry and pass retryOf', () => {
			handler.onWorkflowEnd(makeCtx({ status: 'success', mode: 'retry' }, 'exec-original'));

			expect(tracer.endWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ isRetry: true, retryOf: 'exec-original' }),
			);
		});
	});

	describe('onNodeStart / onNodeEnd', () => {
		const tracer = mock<ExecutionLevelTracer>();
		const traceContextService = mock<TraceContextService>();
		const config = mock<OtelConfig>();
		let handler: OtelLifecycleHandler;

		const node = { id: 'n1', name: 'Node1', type: 'test', typeVersion: 1 };

		const makeStartCtx = (nodeName = 'Node1'): NodeExecuteBeforeContext =>
			({
				type: 'nodeExecuteBefore',
				workflow: { id: 'wf-1', name: 'Test', nodes: [node], connections: {} },
				nodeName,
				executionId: 'exec-1',
			}) as unknown as NodeExecuteBeforeContext;

		const makeEndCtx = (
			overrides: Partial<NodeExecuteAfterContext['taskData']> = {},
			nodeName = 'Node1',
		): NodeExecuteAfterContext =>
			({
				type: 'nodeExecuteAfter',
				workflow: { id: 'wf-1', name: 'Test', nodes: [node], connections: {} },
				nodeName,
				executionId: 'exec-1',
				taskData: {
					startTime: 0,
					executionTime: 10,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: {} }]] },
					...overrides,
				},
				executionData: emptyExecutionData,
			}) as unknown as NodeExecuteAfterContext;

		beforeEach(() => {
			jest.clearAllMocks();
			config.includeNodeSpans = true;
			handler = new OtelLifecycleHandler(tracer, traceContextService, config);
		});

		it('should skip node spans when includeNodeSpans is false', () => {
			config.includeNodeSpans = false;
			handler = new OtelLifecycleHandler(tracer, traceContextService, config);

			handler.onNodeStart(makeStartCtx());
			handler.onNodeEnd(makeEndCtx());

			expect(tracer.startNode).not.toHaveBeenCalled();
			expect(tracer.endNode).not.toHaveBeenCalled();
		});

		it('should call tracer.startNode with the resolved node', () => {
			handler.onNodeStart(makeStartCtx());

			expect(tracer.startNode).toHaveBeenCalledWith({ executionId: 'exec-1', node });
		});

		it('should not call tracer.startNode when node is not found in workflow', () => {
			handler.onNodeStart(makeStartCtx('MissingNode'));

			expect(tracer.startNode).not.toHaveBeenCalled();
		});

		it('should call tracer.endNode with counted items and coerced customAttributes', () => {
			const ctx = makeEndCtx({
				source: [{ previousNode: 'Trigger', previousNodeRun: 0 }],
				data: { main: [[{ json: {} }, { json: {} }]] },
				metadata: { tracing: { 'llm.model': 'gpt-4o', 'llm.tokens': 500 } },
			} as unknown as Partial<NodeExecuteAfterContext['taskData']>);
			(ctx.executionData as unknown as IRunExecutionData).resultData.runData = {
				Trigger: [
					{
						startTime: 0,
						executionTime: 1,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: {} }]] },
					},
				],
			};

			handler.onNodeEnd(ctx);

			expect(tracer.endNode).toHaveBeenCalledWith({
				executionId: 'exec-1',
				node,
				inputItemCount: 1,
				outputItemCount: 2,
				error: undefined,
				customAttributes: { 'llm.model': 'gpt-4o', 'llm.tokens': '500' },
			});
		});

		it('should pass undefined customAttributes when metadata.tracing is absent', () => {
			handler.onNodeEnd(makeEndCtx());

			expect(tracer.endNode).toHaveBeenCalledWith(
				expect.objectContaining({ customAttributes: undefined }),
			);
		});

		it('should forward taskData.error to tracer.endNode', () => {
			const error = new Error('node failure');
			handler.onNodeEnd(
				makeEndCtx({ error } as unknown as Partial<NodeExecuteAfterContext['taskData']>),
			);

			expect(tracer.endNode).toHaveBeenCalledWith(expect.objectContaining({ error }));
		});

		it('should not call tracer.endNode when node is not found in workflow', () => {
			handler.onNodeEnd(makeEndCtx({}, 'MissingNode'));

			expect(tracer.endNode).not.toHaveBeenCalled();
		});
	});
});

describe('countOutputItems', () => {
	it('should count items across branches', () => {
		const data = {
			main: [[{ json: { a: 1 } }, { json: { a: 2 } }], [{ json: { b: 1 } }]],
		};

		expect(countOutputItems(data)).toBe(3);
	});

	it('should return 0 when data is undefined', () => {
		expect(countOutputItems(undefined)).toBe(0);
	});

	it('should return 0 when main is empty', () => {
		expect(countOutputItems({ main: [] })).toBe(0);
	});

	it('should handle null branches', () => {
		const data = { main: [null, [{ json: {} }], null] };

		expect(countOutputItems(data)).toBe(1);
	});
});

describe('countInputItems', () => {
	function makeCtx(
		source: NodeExecuteAfterContext['taskData']['source'],
		runData: IRunExecutionData['resultData']['runData'],
	): NodeExecuteAfterContext {
		return {
			type: 'nodeExecuteAfter',
			workflow: {
				id: 'wf',
				name: 'W',
				active: false,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				activeVersionId: null,
				connections: {},
				nodes: [],
			},
			nodeName: 'TestNode',
			executionId: 'exec-1',
			taskData: {
				startTime: 0,
				executionTime: 10,
				executionIndex: 0,
				source,
			},
			executionData: {
				...emptyExecutionData,
				resultData: { ...emptyExecutionData.resultData, runData },
			},
		} as unknown as NodeExecuteAfterContext;
	}

	it('should count items from a single source', () => {
		const ctx = makeCtx([{ previousNode: 'Trigger', previousNodeRun: 0 }], {
			Trigger: [
				{
					startTime: 0,
					executionTime: 10,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: { a: 1 } }, { json: { a: 2 } }, { json: { a: 3 } }]] },
				},
			],
		});

		expect(countInputItems(ctx)).toBe(3);
	});

	it('should count items only from the referenced output branch', () => {
		const ctx = makeCtx([{ previousNode: 'IF', previousNodeRun: 0, previousNodeOutput: 1 }], {
			IF: [
				{
					startTime: 0,
					executionTime: 10,
					executionIndex: 0,
					source: [],
					data: {
						main: [
							// Branch 0 (true): 2 items
							[{ json: { matched: true } }, { json: { matched: true } }],
							// Branch 1 (false): 5 items
							[
								{ json: { matched: false } },
								{ json: { matched: false } },
								{ json: { matched: false } },
								{ json: { matched: false } },
								{ json: { matched: false } },
							],
						],
					},
				},
			],
		});

		// Should count only branch 1 (5 items), not branch 0+1 (7 items)
		expect(countInputItems(ctx)).toBe(5);
	});

	it('should sum items from multiple sources', () => {
		const ctx = makeCtx(
			[
				{ previousNode: 'NodeA', previousNodeRun: 0 },
				{ previousNode: 'NodeB', previousNodeRun: 0 },
			],
			{
				NodeA: [
					{
						startTime: 0,
						executionTime: 10,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: { a: 1 } }, { json: { a: 2 } }]] },
					},
				],
				NodeB: [
					{
						startTime: 0,
						executionTime: 10,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: { b: 1 } }]] },
					},
				],
			},
		);

		expect(countInputItems(ctx)).toBe(3);
	});

	it('should return 0 when source is empty', () => {
		const ctx = makeCtx([], {});

		expect(countInputItems(ctx)).toBe(0);
	});

	it('should skip null sources', () => {
		const ctx = makeCtx([null as never, { previousNode: 'Trigger', previousNodeRun: 0 }], {
			Trigger: [
				{
					startTime: 0,
					executionTime: 10,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: {} }]] },
				},
			],
		});

		expect(countInputItems(ctx)).toBe(1);
	});

	it('should return 0 when source node has no run data', () => {
		const ctx = makeCtx([{ previousNode: 'MissingNode', previousNodeRun: 0 }], {});

		expect(countInputItems(ctx)).toBe(0);
	});
});

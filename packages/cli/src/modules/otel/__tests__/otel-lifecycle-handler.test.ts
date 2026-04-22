import type { NodeExecuteAfterContext, WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import type { IRunExecutionData } from 'n8n-workflow';

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
			workflow: { id: 'wf-1', name: 'Test', versionId: 'v1', nodes: [], connections: {} },
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
			traceContextService.get.mockResolvedValue(null);

			await handler.onWorkflowStart(baseCtx);

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ tracingContext: undefined }),
			);
		});

		it('should not look up parent when executionData has no parentExecution', async () => {
			traceContextService.get.mockResolvedValueOnce(null);

			await handler.onWorkflowStart(baseCtx);

			expect(traceContextService.get).toHaveBeenCalledTimes(1);
			expect(traceContextService.get).toHaveBeenCalledWith('exec-sub');
		});

		it('should always persist generated spanContext', async () => {
			traceContextService.get.mockResolvedValueOnce(parentTracingContext);

			await handler.onWorkflowStart(baseCtx);

			expect(traceContextService.persist).toHaveBeenCalledWith('exec-sub', generatedSpanContext);
		});

		it('should persist spanContext for sub-workflows so nested children can inherit', async () => {
			traceContextService.get.mockResolvedValueOnce(parentTracingContext);

			const ctx: WorkflowExecuteBeforeContext = {
				...baseCtx,
				executionData: {
					parentExecution: { executionId: 'exec-parent', workflowId: 'wf-parent' },
				} as IRunExecutionData,
			};

			await handler.onWorkflowStart(ctx);

			expect(traceContextService.persist).toHaveBeenCalledWith('exec-sub', generatedSpanContext);
		});

		it('should not persist when startWorkflow returns undefined', async () => {
			tracer.startWorkflow.mockReturnValue(undefined);
			traceContextService.get.mockResolvedValueOnce(null);

			await handler.onWorkflowStart(baseCtx);

			expect(traceContextService.persist).not.toHaveBeenCalled();
		});
	});

	describe('onNodeStart / onNodeEnd', () => {
		const tracer = mock<ExecutionLevelTracer>();
		const traceContextService = mock<TraceContextService>();
		const config = mock<OtelConfig>();

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should skip node spans when includeNodeSpans is false', () => {
			config.includeNodeSpans = false;
			const handler = new OtelLifecycleHandler(tracer, traceContextService, config);

			handler.onNodeStart({
				type: 'nodeExecuteBefore',
				workflow: {
					id: 'wf-1',
					name: 'Test',
					nodes: [{ id: 'n1', name: 'Node1', type: 'test', typeVersion: 1 }],
					connections: {},
				},
				nodeName: 'Node1',
				executionId: 'exec-1',
			} as never);

			handler.onNodeEnd({
				type: 'nodeExecuteAfter',
				workflow: { id: 'wf-1', name: 'Test', nodes: [], connections: {} },
				nodeName: 'Node1',
				executionId: 'exec-1',
				taskData: {
					startTime: 0,
					executionTime: 10,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: {} }]] },
				},
				executionData: { resultData: { runData: {} } },
			} as never);

			expect(tracer.startNode).not.toHaveBeenCalled();
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

import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository } from '@n8n/db';
import type {
	NodeExecuteAfterContext,
	NodeExecuteBeforeContext,
	WorkflowExecuteAfterContext,
	WorkflowExecuteBeforeContext,
} from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import { Workflow } from 'n8n-workflow';
import type { INodeTypes, IRun, IRunExecutionData } from 'n8n-workflow';

import type { OwnershipService } from '@/services/ownership.service';

import type { ExecutionLevelTracer } from '../execution-level-tracer';
import { OtelLifecycleHandler, countInputItems, countOutputItems } from '../otel-lifecycle-handler';
import { OtelConfig } from '../otel.config';
import type { TracingContext, TraceContextService } from '../tracing-context';

const emptyExecutionData = {
	resultData: { runData: {}, pinData: {} },
	executionData: undefined,
} as unknown as IRunExecutionData;

const nodeTypes = mock<INodeTypes>();

function createWorkflowInstance() {
	return new Workflow({
		id: 'wf-1',
		name: 'Test',
		active: false,
		nodes: [],
		connections: {},
		nodeTypes,
	});
}

function makeOtelConfig(overrides: Partial<OtelConfig> = {}): OtelConfig {
	return Object.assign(new OtelConfig(), overrides);
}

describe('OtelLifecycleHandler', () => {
	describe('onWorkflowStart', () => {
		const tracer = mock<ExecutionLevelTracer>();
		const traceContextService = mock<TraceContextService>();
		let config = makeOtelConfig();
		const ownershipService = mock<OwnershipService>();
		const logger = mock<Logger>();
		const workflowRepository = mock<WorkflowRepository>();
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
			workflowInstance: createWorkflowInstance(),
			executionId: 'exec-sub',
		};

		beforeEach(() => {
			jest.clearAllMocks();
			config = makeOtelConfig({ publishedOnly: false });
			handler = new OtelLifecycleHandler(
				tracer,
				traceContextService,
				config,
				ownershipService,
				logger,
				workflowRepository,
			);
			tracer.startWorkflow.mockReturnValue(generatedSpanContext);
			ownershipService.getWorkflowProjectCached.mockResolvedValue({ id: 'proj-default' } as never);
		});

		it('should look up project via OwnershipService and pass id to the tracer', async () => {
			traceContextService.get.mockResolvedValueOnce(undefined);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce({ id: 'proj-1' } as never);

			await handler.onWorkflowStart(baseCtx);

			expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('wf-1');
			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ project: { id: 'proj-1' } }),
			);
		});

		it('should pass project customAttributes to the tracer when project has telemetry tags', async () => {
			traceContextService.get.mockResolvedValueOnce(undefined);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce({
				id: 'proj-1',
				customTelemetryTags: [
					{ key: 'env', value: 'production' },
					{ key: 'team', value: 'platform' },
				],
			} as never);

			await handler.onWorkflowStart(baseCtx);

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					project: {
						id: 'proj-1',
						customAttributes: { env: 'production', team: 'platform' },
					},
				}),
			);
		});

		it('should pass undefined customAttributes when project has no telemetry tags', async () => {
			traceContextService.get.mockResolvedValueOnce(undefined);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce({
				id: 'proj-empty',
				customTelemetryTags: [],
			} as never);

			await handler.onWorkflowStart(baseCtx);

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					project: { id: 'proj-empty', customAttributes: undefined },
				}),
			);
		});

		it('should start workflow span without project if project lookup fails', async () => {
			traceContextService.get.mockResolvedValueOnce(undefined);
			ownershipService.getWorkflowProjectCached.mockRejectedValueOnce(new Error('DB error'));

			await expect(handler.onWorkflowStart(baseCtx)).resolves.not.toThrow();

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ project: undefined }),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to fetch project for OTEL span',
				expect.objectContaining({ workflowId: 'wf-1', executionId: 'exec-sub' }),
			);
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

		it('should pass literal workflow custom telemetry tags to the tracer', async () => {
			await handler.onWorkflowStart({
				...baseCtx,
				workflow: {
					...baseCtx.workflow,
					settings: {
						customTelemetryTags: [
							{ key: ' environment ', value: 'production' },
							{ key: 'workflowName', value: 'Workflow Name' },
							{ key: 'mode', value: 'manual' },
						],
					},
				},
			});

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow: expect.objectContaining({
						customAttributes: {
							environment: 'production',
							workflowName: 'Workflow Name',
							mode: 'manual',
						},
					}),
				}),
			);
		});

		it('should skip workflow custom telemetry tags with empty keys', async () => {
			await handler.onWorkflowStart({
				...baseCtx,
				workflow: {
					...baseCtx.workflow,
					settings: {
						customTelemetryTags: [
							{ key: ' ', value: 'empty-key' },
							{ key: 'status', value: 'undefined' },
							{ key: 'objectValue', value: 'nested true' },
							{ key: 'fallback', value: 'missing value' },
						],
					},
				},
			});

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow: expect.objectContaining({
						customAttributes: {
							status: 'undefined',
							objectValue: 'nested true',
							fallback: 'missing value',
						},
					}),
				}),
			);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should omit customAttributes when workflow custom telemetry tags are absent', async () => {
			await handler.onWorkflowStart(baseCtx);

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow: expect.objectContaining({ customAttributes: undefined }),
				}),
			);
		});
	});

	describe('onWorkflowResume', () => {
		const tracer = mock<ExecutionLevelTracer>();
		const traceContextService = mock<TraceContextService>();
		let config = makeOtelConfig();
		const ownershipService = mock<OwnershipService>();
		const logger = mock<Logger>();
		const workflowRepository = mock<WorkflowRepository>();
		let handler: OtelLifecycleHandler;

		const prePauseContext: TracingContext = {
			traceparent: '00-0af7651916cd43dd8448eb211c80319c-1111111111111111-01',
		};
		const resumedSpanContext: TracingContext = {
			traceparent: '00-0af7651916cd43dd8448eb211c80319c-2222222222222222-01',
		};

		beforeEach(() => {
			jest.clearAllMocks();
			config = makeOtelConfig({ publishedOnly: false });
			handler = new OtelLifecycleHandler(
				tracer,
				traceContextService,
				config,
				ownershipService,
				logger,
				workflowRepository,
			);
			tracer.startWorkflow.mockReturnValue(resumedSpanContext);
			ownershipService.getWorkflowProjectCached.mockResolvedValue({ id: 'proj-default' } as never);
		});

		it('should look up project via OwnershipService on resume', async () => {
			traceContextService.get.mockResolvedValueOnce(undefined);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce({
				id: 'resume-proj',
			} as never);

			await handler.onWorkflowResume({
				type: 'workflowExecuteResume',
				workflow: { id: 'wf-1', name: 'Test', versionId: 'v1', nodes: [], connections: {} },
				workflowInstance: undefined as never,
				executionData: undefined as never,
				executionId: 'exec-resume',
			} as never);

			expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('wf-1');
			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ project: { id: 'resume-proj' } }),
			);
		});

		it('should pass project customAttributes on resume when project has telemetry tags', async () => {
			traceContextService.get.mockResolvedValueOnce(undefined);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce({
				id: 'resume-proj-tags',
				customTelemetryTags: [{ key: 'env', value: 'staging' }],
			} as never);

			await handler.onWorkflowResume({
				type: 'workflowExecuteResume',
				workflow: { id: 'wf-1', name: 'Test', versionId: 'v1', nodes: [], connections: {} },
				workflowInstance: undefined as never,
				executionData: undefined as never,
				executionId: 'exec-resume-tags',
			} as never);

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					project: {
						id: 'resume-proj-tags',
						customAttributes: { env: 'staging' },
					},
				}),
			);
		});

		it('should start workflow span without project if project lookup fails on resume', async () => {
			ownershipService.getWorkflowProjectCached.mockRejectedValueOnce(new Error('DB error'));

			await expect(
				handler.onWorkflowResume({
					type: 'workflowExecuteResume',
					workflow: { id: 'wf-1', name: 'Test', versionId: 'v1', nodes: [], connections: {} },
					workflowInstance: undefined as never,
					executionData: undefined as never,
					executionId: 'exec-resume',
				} as never),
			).resolves.not.toThrow();

			expect(tracer.startWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ project: undefined }),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to fetch project for OTEL span',
				expect.objectContaining({ workflowId: 'wf-1', executionId: 'exec-resume' }),
			);
		});

		it('should start a new root span linked to the pre-wait origin and not overwrite the persisted origin', async () => {
			traceContextService.get.mockResolvedValueOnce(prePauseContext);

			await handler.onWorkflowResume({
				type: 'workflowExecuteResume',
				workflow: { id: 'wf-1', name: 'Test', versionId: 'v1', nodes: [], connections: {} },
				workflowInstance: createWorkflowInstance(),
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
		let config = makeOtelConfig();
		const ownershipService = mock<OwnershipService>();
		const logger = mock<Logger>();
		const workflowRepository = mock<WorkflowRepository>();
		let handler: OtelLifecycleHandler;

		beforeEach(() => {
			jest.clearAllMocks();
			config = makeOtelConfig({ publishedOnly: false });
			handler = new OtelLifecycleHandler(
				tracer,
				traceContextService,
				config,
				ownershipService,
				logger,
				workflowRepository,
			);
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

		it('should delegate to tracer.endWorkflow with mapped runData fields', async () => {
			await handler.onWorkflowEnd(makeCtx({ status: 'success', mode: 'webhook' }));

			expect(tracer.endWorkflow).toHaveBeenCalledWith({
				executionId: 'exec-1',
				status: 'success',
				mode: 'webhook',
				error: undefined,
				isRetry: false,
				retryOf: undefined,
			});
		});

		it('should forward error from runData.data.resultData', async () => {
			const error = new Error('boom');
			const ctx = makeCtx({
				status: 'error',
				mode: 'manual',
				data: { resultData: { runData: {}, pinData: {}, error } },
			} as unknown as Partial<IRun>);

			await handler.onWorkflowEnd(ctx);

			expect(tracer.endWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'error', error }),
			);
		});

		it('should derive isRetry from mode=retry and pass retryOf', async () => {
			await handler.onWorkflowEnd(makeCtx({ status: 'success', mode: 'retry' }, 'exec-original'));

			expect(tracer.endWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ isRetry: true, retryOf: 'exec-original' }),
			);
		});
	});

	describe('onNodeStart / onNodeEnd', () => {
		const tracer = mock<ExecutionLevelTracer>();
		const traceContextService = mock<TraceContextService>();
		let config = makeOtelConfig();
		const ownershipService = mock<OwnershipService>();
		const logger = mock<Logger>();
		const workflowRepository = mock<WorkflowRepository>();
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
			config = makeOtelConfig({ publishedOnly: false, includeNodeSpans: true });
			handler = new OtelLifecycleHandler(
				tracer,
				traceContextService,
				config,
				ownershipService,
				logger,
				workflowRepository,
			);
		});

		it('should skip node spans when includeNodeSpans is false', async () => {
			config.includeNodeSpans = false;
			handler = new OtelLifecycleHandler(
				tracer,
				traceContextService,
				config,
				ownershipService,
				logger,
				workflowRepository,
			);

			await handler.onNodeStart(makeStartCtx());
			await handler.onNodeEnd(makeEndCtx());

			expect(tracer.startNode).not.toHaveBeenCalled();
			expect(tracer.endNode).not.toHaveBeenCalled();
		});

		it('should call tracer.startNode with the resolved node', async () => {
			await handler.onNodeStart(makeStartCtx());

			expect(tracer.startNode).toHaveBeenCalledWith({ executionId: 'exec-1', node });
		});

		it('should not call tracer.startNode when node is not found in workflow', async () => {
			await handler.onNodeStart(makeStartCtx('MissingNode'));

			expect(tracer.startNode).not.toHaveBeenCalled();
		});

		it('should call tracer.endNode with counted items and coerced customAttributes', async () => {
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

			await handler.onNodeEnd(ctx);

			expect(tracer.endNode).toHaveBeenCalledWith({
				executionId: 'exec-1',
				node,
				inputItemCount: 1,
				outputItemCount: 2,
				error: undefined,
				customAttributes: { 'llm.model': 'gpt-4o', 'llm.tokens': '500' },
			});
		});

		it('should pass undefined customAttributes when metadata.tracing is absent', async () => {
			await handler.onNodeEnd(makeEndCtx());

			expect(tracer.endNode).toHaveBeenCalledWith(
				expect.objectContaining({ customAttributes: undefined }),
			);
		});

		it('should forward taskData.error to tracer.endNode', async () => {
			const error = new Error('node failure');
			await handler.onNodeEnd(
				makeEndCtx({ error } as unknown as Partial<NodeExecuteAfterContext['taskData']>),
			);

			expect(tracer.endNode).toHaveBeenCalledWith(expect.objectContaining({ error }));
		});

		it('should not call tracer.endNode when node is not found in workflow', async () => {
			await handler.onNodeEnd(makeEndCtx({}, 'MissingNode'));

			expect(tracer.endNode).not.toHaveBeenCalled();
		});
	});
});

describe('publishedOnly filter', () => {
	const tracer = mock<ExecutionLevelTracer>();
	const traceContextService = mock<TraceContextService>();
	let config = makeOtelConfig();
	const ownershipService = mock<OwnershipService>();
	const logger = mock<Logger>();
	const workflowRepository = mock<WorkflowRepository>();
	let handler: OtelLifecycleHandler;

	// active and activeVersionId are zeroed by executeManually() for all manual executions
	const workflow = {
		id: 'wf-1',
		name: 'Test',
		versionId: 'v1',
		nodes: [{ id: 'n1', name: 'Node1', type: 'test', typeVersion: 1 }],
		connections: {},
		active: false,
		isArchived: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		activeVersionId: null,
	};

	const makeWorkflowStartCtx = (executionId = 'exec-1'): WorkflowExecuteBeforeContext => ({
		type: 'workflowExecuteBefore',
		workflow: workflow as never,
		workflowInstance: undefined as never,
		executionId,
	});

	const makeWorkflowEndCtx = (executionId = 'exec-1'): WorkflowExecuteAfterContext =>
		({
			type: 'workflowExecuteAfter',
			workflow,
			executionId,
			newStaticData: {},
			runData: {
				status: 'success',
				mode: 'manual',
				data: { resultData: { runData: {}, pinData: {} } },
			},
		}) as unknown as WorkflowExecuteAfterContext;

	const makeNodeStartCtx = (executionId = 'exec-1'): NodeExecuteBeforeContext =>
		({
			type: 'nodeExecuteBefore',
			workflow,
			nodeName: 'Node1',
			executionId,
		}) as unknown as NodeExecuteBeforeContext;

	const makeNodeEndCtx = (executionId = 'exec-1'): NodeExecuteAfterContext =>
		({
			type: 'nodeExecuteAfter',
			workflow,
			nodeName: 'Node1',
			executionId,
			taskData: {
				startTime: 0,
				executionTime: 10,
				executionIndex: 0,
				source: [],
				data: { main: [[{ json: {} }]] },
			},
			executionData: emptyExecutionData,
		}) as unknown as NodeExecuteAfterContext;

	beforeEach(() => {
		jest.clearAllMocks();
		config = makeOtelConfig({ publishedOnly: true, includeNodeSpans: true });
		ownershipService.getWorkflowProjectCached.mockResolvedValue({ id: 'proj-1' } as never);
		traceContextService.get.mockResolvedValue(undefined);
		tracer.startWorkflow.mockReturnValue({ traceparent: '00-abc-def-01' });
		handler = new OtelLifecycleHandler(
			tracer,
			traceContextService,
			config,
			ownershipService,
			logger,
			workflowRepository,
		);
	});

	it('should not trace a manual execution of an unpublished workflow', async () => {
		workflowRepository.isActive.mockResolvedValue(false);

		await handler.onWorkflowStart(makeWorkflowStartCtx());
		await handler.onWorkflowEnd(makeWorkflowEndCtx());
		await handler.onNodeStart(makeNodeStartCtx());
		await handler.onNodeEnd(makeNodeEndCtx());

		expect(tracer.startWorkflow).not.toHaveBeenCalled();
		expect(traceContextService.persist).not.toHaveBeenCalled();
		expect(tracer.endWorkflow).not.toHaveBeenCalled();
		expect(tracer.startNode).not.toHaveBeenCalled();
		expect(tracer.endNode).not.toHaveBeenCalled();
	});

	it('should trace a manual execution of a published workflow', async () => {
		workflowRepository.isActive.mockResolvedValue(true);

		await handler.onWorkflowStart(makeWorkflowStartCtx());
		await handler.onNodeStart(makeNodeStartCtx());
		await handler.onNodeEnd(makeNodeEndCtx());
		await handler.onWorkflowEnd(makeWorkflowEndCtx());

		expect(tracer.startWorkflow).toHaveBeenCalled();
		expect(traceContextService.persist).toHaveBeenCalled();
		expect(tracer.startNode).toHaveBeenCalled();
		expect(tracer.endNode).toHaveBeenCalled();
		expect(tracer.endWorkflow).toHaveBeenCalled();
	});

	it('should load published state once per execution, not on every node hook', async () => {
		workflowRepository.isActive.mockResolvedValue(true);

		await handler.onWorkflowStart(makeWorkflowStartCtx());
		await handler.onNodeStart(makeNodeStartCtx());
		await handler.onNodeEnd(makeNodeEndCtx());
		await handler.onNodeStart(makeNodeStartCtx());
		await handler.onNodeEnd(makeNodeEndCtx());
		await handler.onWorkflowEnd(makeWorkflowEndCtx());

		expect(workflowRepository.isActive).toHaveBeenCalledTimes(1);
	});

	it('should trace when publishedOnly is false, regardless of published state', async () => {
		config.publishedOnly = false;

		await handler.onWorkflowStart(makeWorkflowStartCtx());

		expect(workflowRepository.isActive).not.toHaveBeenCalled();
		expect(tracer.startWorkflow).toHaveBeenCalled();
	});

	it('should isolate published state per executionId', async () => {
		workflowRepository.isActive.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

		await handler.onWorkflowStart(makeWorkflowStartCtx('exec-published'));
		await handler.onWorkflowStart(makeWorkflowStartCtx('exec-unpublished'));

		await handler.onNodeStart(makeNodeStartCtx('exec-published'));
		await handler.onNodeStart(makeNodeStartCtx('exec-unpublished'));

		expect(tracer.startWorkflow).toHaveBeenCalledTimes(1);
		expect(tracer.startNode).toHaveBeenCalledTimes(1);
	});

	it('should clean up publishedExecutions entry on workflowExecuteAfter', async () => {
		workflowRepository.isActive.mockResolvedValue(true);

		await handler.onWorkflowStart(makeWorkflowStartCtx());

		const map = (handler as unknown as { publishedExecutions: Map<string, boolean> })
			.publishedExecutions;
		expect(map.has('exec-1')).toBe(true);

		await handler.onWorkflowEnd(makeWorkflowEndCtx());

		expect(map.has('exec-1')).toBe(false);
	});

	it('should load published state from DB on resume when there is no cache entry', async () => {
		workflowRepository.isActive.mockResolvedValue(true);

		await handler.onWorkflowResume({
			type: 'workflowExecuteResume',
			workflow: workflow as never,
			workflowInstance: undefined as never,
			executionData: undefined as never,
			executionId: 'exec-resumed',
		} as never);

		expect(workflowRepository.isActive).toHaveBeenCalledWith('wf-1');
		expect(tracer.startWorkflow).toHaveBeenCalled();
	});

	it('should not trace resume of an unpublished workflow when there is no cache entry', async () => {
		workflowRepository.isActive.mockResolvedValue(false);

		await handler.onWorkflowResume({
			type: 'workflowExecuteResume',
			workflow: workflow as never,
			workflowInstance: undefined as never,
			executionData: undefined as never,
			executionId: 'exec-resumed',
		} as never);

		expect(workflowRepository.isActive).toHaveBeenCalledWith('wf-1');
		expect(tracer.startWorkflow).not.toHaveBeenCalled();
	});

	it('should not call DB on resume when cache entry is already set', async () => {
		workflowRepository.isActive.mockResolvedValue(true);

		// onWorkflowStart populates the cache
		await handler.onWorkflowStart(makeWorkflowStartCtx('exec-resumed'));

		await handler.onWorkflowResume({
			type: 'workflowExecuteResume',
			workflow: workflow as never,
			workflowInstance: undefined as never,
			executionData: undefined as never,
			executionId: 'exec-resumed',
		} as never);

		// DB called once (on start), not again on resume
		expect(workflowRepository.isActive).toHaveBeenCalledTimes(1);
		expect(tracer.startWorkflow).toHaveBeenCalledTimes(2);
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

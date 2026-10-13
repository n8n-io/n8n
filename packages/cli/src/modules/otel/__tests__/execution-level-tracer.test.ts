import type { Logger } from '@n8n/backend-common';
import type { TextMapPropagator, Tracer } from '@opentelemetry/api';
import { context, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import { hrTimeToMilliseconds } from '@opentelemetry/core';
import type { ExecutionStatus } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { toExecutionIdentity } from '../execution-identity';
import { ExecutionLevelTracer } from '../execution-level-tracer';
import type { StartWorkflowParams } from '../execution-level-tracer.types';
import type { OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import type { OtelService } from '../otel.service';
import { OtelTestProvider } from './support/otel-test-provider';

describe('ExecutionLevelTracer', () => {
	let otel: OtelTestProvider;
	let tracer: ExecutionLevelTracer;
	const logger = mock<Logger>();

	const makeOtelSettingsService = (overrides: Partial<OtelConfig> = {}): OtelSettingsService => {
		const _settings = { injectOutbound: true, ...overrides } as OtelConfig;
		return {
			getSettings: () => ({ ..._settings, envManagedFields: [] }),
		} as unknown as OtelSettingsService;
	};

	beforeAll(() => {
		otel = OtelTestProvider.create({ withContextManager: true });
	});

	afterAll(async () => {
		await otel.shutdown();
	});

	beforeEach(() => {
		otel.reset();
		tracer = new ExecutionLevelTracer(otel.asOtelService(), makeOtelSettingsService(), logger);
	});

	const inboundTracingContext = {
		traceparent: '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01',
	};

	const defaultWorkflow = { id: 'wf-1', name: 'Test', versionId: 'v1', nodeCount: 2 };

	describe('startWorkflow / endWorkflow', () => {
		it('should create a workflow span with correct attributes', () => {
			tracer.startWorkflow({
				executionId: 'exec-1',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
				project: { id: 'project-1' },
			});
			tracer.endWorkflow({
				executionId: 'exec-1',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const spans = otel.getFinishedSpans();
			expect(spans).toHaveLength(1);

			const span = spans[0];
			expect(span.name).toBe('workflow.execute');
			expect(span.attributes['n8n.workflow.id']).toBe('wf-1');
			expect(span.attributes['n8n.workflow.name']).toBe('Test');
			expect(span.attributes['n8n.execution.id']).toBe('exec-1');
			expect(span.attributes['n8n.project.id']).toBe('project-1');
			expect(span.attributes['n8n.execution.mode']).toBe('manual');
			expect(span.attributes['n8n.execution.status']).toBe('success');
			expect(span.status.code).toBe(SpanStatusCode.OK);
		});

		it('should attach project custom telemetry tags to the workflow span', () => {
			tracer.startWorkflow({
				executionId: 'exec-custom-tags',
				workflow: defaultWorkflow,
				project: {
					id: 'proj-tags',
					customAttributes: { env: 'production', team: 'platform' },
				},
			});
			tracer.endWorkflow({
				executionId: 'exec-custom-tags',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const span = otel.getFinishedSpans()[0];
			expect(span.attributes['n8n.project.custom.env']).toBe('production');
			expect(span.attributes['n8n.project.custom.team']).toBe('platform');
		});

		const runSingleNodeExecution = (
			executionId: string,
			project?: { id: string; customAttributes?: Record<string, string> },
		) => {
			tracer.startWorkflow({ executionId, workflow: defaultWorkflow, project });
			const node = { id: 'n1', name: 'MyNode', type: 'test', typeVersion: 1 };
			tracer.startNode({ executionId, node });
			tracer.endNode({ executionId, node, inputItemCount: 1, outputItemCount: 1 });
			tracer.endWorkflow({ executionId, status: 'success', mode: 'manual', isRetry: false });

			const spans = otel.getFinishedSpans();
			return {
				workflowSpan: spans.find((s) => s.name === 'workflow.execute')!,
				nodeSpan: spans.find((s) => s.name === 'node.execute')!,
			};
		};

		const projectCustomKeys = (attributes: Record<string, unknown>) =>
			Object.keys(attributes).filter((k) => k.startsWith('n8n.project.custom.'));

		it('should attach project id and custom attributes to node spans', () => {
			const { workflowSpan, nodeSpan } = runSingleNodeExecution('exec-node-tags', {
				id: 'proj-tags',
				customAttributes: { env: 'staging' },
			});

			expect(nodeSpan.attributes['n8n.project.id']).toBe('proj-tags');
			expect(nodeSpan.attributes['n8n.project.custom.env']).toBe('staging');
			expect(nodeSpan.attributes['n8n.project.id']).toBe(workflowSpan.attributes['n8n.project.id']);
			expect(nodeSpan.attributes['n8n.project.custom.env']).toBe(
				workflowSpan.attributes['n8n.project.custom.env'],
			);
		});

		it('should attach only project id to node spans when the project has no custom attributes', () => {
			const { nodeSpan } = runSingleNodeExecution('exec-node-no-tags', { id: 'proj-no-tags' });

			expect(nodeSpan.attributes['n8n.project.id']).toBe('proj-no-tags');
			expect(projectCustomKeys(nodeSpan.attributes)).toHaveLength(0);
		});

		it('should omit project attributes on node spans when project is not provided', () => {
			const { nodeSpan } = runSingleNodeExecution('exec-node-no-project');

			expect(nodeSpan.attributes['n8n.project.id']).toBeUndefined();
			expect(projectCustomKeys(nodeSpan.attributes)).toHaveLength(0);
		});

		it('should omit project id attribute when project is not provided', () => {
			tracer.startWorkflow({
				executionId: 'exec-no-project',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			tracer.endWorkflow({
				executionId: 'exec-no-project',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			expect(otel.getFinishedSpans()[0].attributes['n8n.project.id']).toBeUndefined();
		});

		it('should set error status on failed executions', () => {
			tracer.startWorkflow({
				executionId: 'exec-2',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});

			const testError = new Error('workflow failed');
			tracer.endWorkflow({
				executionId: 'exec-2',
				status: 'error',
				mode: 'webhook',
				error: testError,
				isRetry: false,
			});

			const spans = otel.getFinishedSpans();
			expect(spans).toHaveLength(1);
			expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
			expect(spans[0].attributes['n8n.execution.error_type']).toBe('Error');
		});

		it('should recover execution error type from serialized task runner errors', () => {
			tracer.startWorkflow({
				executionId: 'exec-serialized-error',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});

			tracer.endWorkflow({
				executionId: 'exec-serialized-error',
				status: 'error',
				mode: 'manual',
				error: {
					message: 'unknown is not defined [line 1]',
					description: 'ReferenceError',
					constructor: { name: 'Object' },
					stack: 'ReferenceError: unknown is not defined',
				},
				isRetry: false,
			});

			const span = otel.getFinishedSpans()[0];
			expect(span.attributes['n8n.execution.error_type']).toBe('ReferenceError');
			expect(span.events[0].attributes?.['exception.type']).toBe('ReferenceError');
		});

		it('should set retry attributes', () => {
			tracer.startWorkflow({
				executionId: 'exec-3',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			tracer.endWorkflow({
				executionId: 'exec-3',
				status: 'success',
				mode: 'retry',
				isRetry: true,
				retryOf: 'exec-original',
			});

			const span = otel.getFinishedSpans()[0];
			expect(span.attributes['n8n.execution.is_retry']).toBe(true);
			expect(span.attributes['n8n.execution.retry_of']).toBe('exec-original');
		});

		it('should add custom workflow attributes as string values', () => {
			tracer.startWorkflow({
				executionId: 'exec-workflow-custom',
				tracingContext: inboundTracingContext,
				workflow: {
					...defaultWorkflow,
					customAttributes: {
						environment: 'production',
						retryCount: '3',
						isCritical: 'true',
					},
				},
			});
			tracer.endWorkflow({
				executionId: 'exec-workflow-custom',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const span = otel.getFinishedSpans()[0];
			expect(span.attributes['n8n.workflow.custom.environment']).toBe('production');
			expect(span.attributes['n8n.workflow.custom.retryCount']).toBe('3');
			expect(span.attributes['n8n.workflow.custom.isCritical']).toBe('true');
		});

		it('should use inbound traceparent as parent context', () => {
			tracer.startWorkflow({
				executionId: 'exec-4',
				tracingContext: { traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' },
				workflow: defaultWorkflow,
			});
			tracer.endWorkflow({
				executionId: 'exec-4',
				status: 'success',
				mode: 'webhook',
				isRetry: false,
			});

			const span = otel.getFinishedSpans()[0];
			// The span inherits the traceId from the inbound traceparent
			expect(span.spanContext().traceId).toBe('0af7651916cd43dd8448eb211c80319c');
		});

		it('should return a valid traceparent from startWorkflow', () => {
			const result = tracer.startWorkflow({
				executionId: 'exec-return',
				workflow: defaultWorkflow,
			});

			expect(result).toBeDefined();
			expect(result.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);

			tracer.endWorkflow({
				executionId: 'exec-return',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});
		});

		it('should return traceparent preserving inbound traceId', () => {
			const result = tracer.startWorkflow({
				executionId: 'exec-preserve',
				tracingContext: { traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' },
				workflow: defaultWorkflow,
			});

			expect(result).toBeDefined();
			expect(result.traceparent).toMatch(/^00-0af7651916cd43dd8448eb211c80319c-/);

			tracer.endWorkflow({
				executionId: 'exec-preserve',
				status: 'success',
				mode: 'webhook',
				isRetry: false,
			});
		});

		it('should clear the tracked workflow span on a waiting endWorkflow', () => {
			tracer.startWorkflow({
				executionId: 'exec-waiting',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			tracer.endWorkflow({
				executionId: 'exec-waiting',
				status: 'waiting',
				mode: 'manual',
				isRetry: false,
			});

			// A waiting end closes the pre-wait span. The post-resume span is
			// re-created by the `workflowExecuteResume` lifecycle handler
			// (which calls startWorkflow again), so nothing should remain
			// tracked for this executionId between end and resume.
			const headers: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-waiting', undefined, headers);
			expect(headers.traceparent).toBeUndefined();
		});

		it('should no-op when endWorkflow is called for an unknown executionId', () => {
			expect(() =>
				tracer.endWorkflow({
					executionId: 'never-started',
					status: 'success',
					mode: 'manual',
					isRetry: false,
				}),
			).not.toThrow();

			expect(otel.getFinishedSpans()).toHaveLength(0);
		});
	});

	describe('endCrashedWorkflow', () => {
		it('should end a tracked workflow span as crashed and stop tracking it', () => {
			tracer.startWorkflow({
				executionId: 'exec-crashed',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			tracer.startNode({
				executionId: 'exec-crashed',
				node: { id: 'n1', name: 'Node1', type: 'n8n-nodes-base.set', typeVersion: 1 },
			});

			tracer.endCrashedWorkflow({
				executionId: 'exec-crashed',
				workflowId: 'wf-1',
				workflowName: 'Test',
				mode: 'trigger',
				detector: 'stall',
				stoppedAt: new Date(),
			});

			const spans = otel.getFinishedSpans();
			expect(spans).toHaveLength(2);

			const nodeSpan = spans.find((s) => s.name === 'node.execute')!;
			expect(nodeSpan.attributes['n8n.node.termination_reason']).toBe('workflow_crashed');

			const span = spans.find((s) => s.name === 'workflow.execute')!;
			expect(span.name).toBe('workflow.execute');
			expect(span.attributes['n8n.execution.status']).toBe('crashed');
			expect(span.attributes['n8n.execution.error_type']).toBe('WorkflowCrashedError');
			expect(span.attributes['n8n.execution.crash.detector']).toBe('stall');
			expect(span.attributes['n8n.execution.reconstructed']).toBe(false);
			expect(span.status.code).toBe(SpanStatusCode.ERROR);

			const headers: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-crashed', undefined, headers);
			expect(headers.traceparent).toBeUndefined();
		});

		it('should reconstruct the workflow span for an untracked execution', () => {
			const startedAt = new Date('2025-01-01T00:00:00.000Z');
			const stoppedAt = new Date('2025-01-01T00:01:00.000Z');

			tracer.endCrashedWorkflow({
				executionId: 'exec-untracked',
				workflowId: 'wf-1',
				workflowName: 'Test',
				workflowVersionId: 'v1',
				mode: 'trigger',
				detector: 'queue-recovery',
				startedAt,
				stoppedAt,
				tracingContext: inboundTracingContext,
				workflow: { customAttributes: { workflowTag: 'checkout' } },
				project: { id: 'project-1', customAttributes: { team: 'platform' } },
			});

			const spans = otel.getFinishedSpans();
			expect(spans).toHaveLength(1);

			const span = spans[0];
			expect(span.name).toBe('workflow.execute');
			expect(span.attributes['n8n.workflow.id']).toBe('wf-1');
			expect(span.attributes['n8n.workflow.name']).toBe('Test');
			expect(span.attributes['n8n.execution.id']).toBe('exec-untracked');
			expect(span.attributes['n8n.execution.status']).toBe('crashed');
			expect(span.attributes['n8n.execution.crash.detector']).toBe('queue-recovery');
			expect(span.attributes['n8n.execution.reconstructed']).toBe(true);
			expect(span.attributes['n8n.workflow.version_id']).toBe('v1');
			expect(span.attributes['n8n.project.id']).toBe('project-1');
			expect(span.attributes['n8n.workflow.custom.workflowTag']).toBe('checkout');
			expect(span.attributes['n8n.project.custom.team']).toBe('platform');
			expect(hrTimeToMilliseconds(span.startTime)).toBe(startedAt.getTime());
			expect(hrTimeToMilliseconds(span.endTime)).toBe(stoppedAt.getTime());
			expect(span.spanContext().traceId).toBe('abcdef1234567890abcdef1234567890');
		});

		it.each([
			['tracked', true],
			['reconstructed', false],
		])('should attach the retry attributes to a %s span', (_kind, isTracked) => {
			if (isTracked) {
				tracer.startWorkflow({ executionId: 'exec-crashed-retry', workflow: defaultWorkflow });
			}

			tracer.endCrashedWorkflow({
				executionId: 'exec-crashed-retry',
				workflowId: 'wf-1',
				mode: 'retry',
				retryOf: 'exec-original',
				detector: 'stall',
				stoppedAt: new Date(),
			});

			const span = otel.getFinishedSpans()[0];
			expect(span.attributes['n8n.execution.is_retry']).toBe(true);
			expect(span.attributes['n8n.execution.retry_of']).toBe('exec-original');
		});

		it('should omit the version id, project and retry source a reconstructed span has no value for', () => {
			tracer.endCrashedWorkflow({
				executionId: 'exec-untracked-bare',
				workflowId: 'wf-1',
				mode: 'trigger',
				detector: 'queue-recovery',
				stoppedAt: new Date(),
			});

			const span = otel.getFinishedSpans()[0];
			expect(span.attributes).not.toHaveProperty('n8n.workflow.version_id');
			expect(span.attributes).not.toHaveProperty('n8n.project.id');
			expect(span.attributes).not.toHaveProperty('n8n.execution.retry_of');
			expect(span.attributes['n8n.execution.is_retry']).toBe(false);
		});
	});

	describe('startNode / endNode', () => {
		it('should create node span as child of workflow span', () => {
			tracer.startWorkflow({
				executionId: 'exec-5',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			const httpNode = {
				id: 'n1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
			};
			tracer.startNode({
				executionId: 'exec-5',
				node: httpNode,
			});
			tracer.endNode({
				executionId: 'exec-5',
				node: httpNode,
				inputItemCount: 1,
				outputItemCount: 3,
			});
			tracer.endWorkflow({
				executionId: 'exec-5',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const spans = otel.getFinishedSpans();
			expect(spans).toHaveLength(2);

			const nodeSpan = spans.find((s) => s.name === 'node.execute')!;
			const workflowSpan = spans.find((s) => s.name === 'workflow.execute')!;

			// Node span shares the same traceId as the workflow span
			expect(nodeSpan.spanContext().traceId).toBe(workflowSpan.spanContext().traceId);
			expect(nodeSpan.attributes['n8n.node.name']).toBe('HTTP Request');
			expect(nodeSpan.attributes['n8n.node.type']).toBe('n8n-nodes-base.httpRequest');
			expect(nodeSpan.attributes['n8n.node.items.input']).toBe(1);
			expect(nodeSpan.attributes['n8n.node.items.output']).toBe(3);
		});

		it('should add exception event on node error', () => {
			tracer.startWorkflow({
				executionId: 'exec-6',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			const node1 = { id: 'n1', name: 'Node1', type: 'test', typeVersion: 1 };
			tracer.startNode({
				executionId: 'exec-6',
				node: node1,
			});

			const nodeError = new TypeError('connection refused');
			tracer.endNode({
				executionId: 'exec-6',
				node: node1,
				inputItemCount: 1,
				outputItemCount: 0,
				error: nodeError,
			});
			tracer.endWorkflow({
				executionId: 'exec-6',
				status: 'error',
				mode: 'manual',
				isRetry: false,
			});

			const nodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpan.status.code).toBe(SpanStatusCode.ERROR);
			expect(nodeSpan.events).toHaveLength(1);
			expect(nodeSpan.events[0].name).toBe('exception');
			// `recordException` receives the `Error` from `toRecordableException` (not `getErrorType`).
			expect(nodeSpan.events[0].attributes?.['exception.message']).toBe('connection refused');
			expect(nodeSpan.events[0].attributes?.['exception.type']).toBe('TypeError');
		});

		it('should recover exception type from serialized JavaScript task runner errors', () => {
			tracer.startWorkflow({
				executionId: 'exec-js-error',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			const codeNode = { id: 'n1', name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 2 };
			tracer.startNode({
				executionId: 'exec-js-error',
				node: codeNode,
			});

			tracer.endNode({
				executionId: 'exec-js-error',
				node: codeNode,
				inputItemCount: 1,
				outputItemCount: 0,
				error: {
					message: 'unknown is not defined [line 1]',
					description: 'ReferenceError',
					constructor: { name: 'Object' },
					stack: 'ReferenceError: unknown is not defined',
				},
			});
			tracer.endWorkflow({
				executionId: 'exec-js-error',
				status: 'error',
				mode: 'manual',
				isRetry: false,
			});

			const nodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpan.events[0].attributes?.['exception.message']).toBe(
				'unknown is not defined [line 1]',
			);
			expect(nodeSpan.events[0].attributes?.['exception.type']).toBe('ReferenceError');
		});

		it('should not record Object as the exception type for serialized Python task runner errors', () => {
			tracer.startWorkflow({
				executionId: 'exec-python-error',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			const codeNode = { id: 'n1', name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 2 };
			tracer.startNode({
				executionId: 'exec-python-error',
				node: codeNode,
			});

			tracer.endNode({
				executionId: 'exec-python-error',
				node: codeNode,
				inputItemCount: 1,
				outputItemCount: 0,
				error: {
					message: 'Intentional error',
					description: '',
					constructor: { name: 'Object' },
					stack: 'Traceback (most recent call last):\nValueError: Intentional error',
				},
			});
			tracer.endWorkflow({
				executionId: 'exec-python-error',
				status: 'error',
				mode: 'manual',
				isRetry: false,
			});

			const nodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpan.events[0].attributes?.['exception.message']).toBe('Intentional error');
			expect(nodeSpan.events[0].attributes?.['exception.type']).toBe('UnknownError');
		});

		it('should warn and not create a span when startNode has no parent workflow span', () => {
			tracer.startNode({
				executionId: 'exec-orphan',
				node: { id: 'n1', name: 'Orphan', type: 'test', typeVersion: 1 },
			});

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('without a pre-existing parent workflow trace'),
			);
			expect(otel.getFinishedSpans()).toHaveLength(0);
		});

		it('should no-op when endNode is called for a node that was never started', () => {
			tracer.startWorkflow({
				executionId: 'exec-no-start',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});

			expect(() =>
				tracer.endNode({
					executionId: 'exec-no-start',
					node: { id: 'n-missing', name: 'Missing', type: 'test', typeVersion: 1 },
					inputItemCount: 0,
					outputItemCount: 0,
				}),
			).not.toThrow();

			tracer.endWorkflow({
				executionId: 'exec-no-start',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			// Only the workflow span should be finished.
			const spans = otel.getFinishedSpans();
			expect(spans).toHaveLength(1);
			expect(spans[0].name).toBe('workflow.execute');
		});

		it('should add custom attributes from tracing metadata', () => {
			tracer.startWorkflow({
				executionId: 'exec-7',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			const aiNode = { id: 'n1', name: 'AI', type: 'test', typeVersion: 1 };
			tracer.startNode({
				executionId: 'exec-7',
				node: aiNode,
			});
			tracer.endNode({
				executionId: 'exec-7',
				node: aiNode,
				inputItemCount: 1,
				outputItemCount: 1,
				customAttributes: { 'llm.model': 'gpt-4o', 'llm.tokens': '500' },
			});
			tracer.endWorkflow({
				executionId: 'exec-7',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const nodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpan.attributes['n8n.node.custom.llm.model']).toBe('gpt-4o');
			expect(nodeSpan.attributes['n8n.node.custom.llm.tokens']).toBe('500');
		});

		it('should not apply workflow custom attributes to node spans', () => {
			tracer.startWorkflow({
				executionId: 'exec-workflow-tags-on-node',
				tracingContext: inboundTracingContext,
				workflow: {
					...defaultWorkflow,
					customAttributes: { env: 'prod', retryCount: '3', isCritical: 'true' },
				},
			});
			const node = { id: 'n1', name: 'Node1', type: 'test', typeVersion: 1 };
			tracer.startNode({
				executionId: 'exec-workflow-tags-on-node',
				node,
			});
			tracer.endNode({
				executionId: 'exec-workflow-tags-on-node',
				node,
				inputItemCount: 1,
				outputItemCount: 1,
			});
			tracer.endWorkflow({
				executionId: 'exec-workflow-tags-on-node',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const nodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpan.attributes['n8n.workflow.custom.env']).toBeUndefined();
			expect(nodeSpan.attributes['n8n.workflow.custom.retryCount']).toBeUndefined();
			expect(nodeSpan.attributes['n8n.workflow.custom.isCritical']).toBeUndefined();
		});

		it('should keep workflow and node custom attributes under separate prefixes', () => {
			tracer.startWorkflow({
				executionId: 'exec-workflow-node-tag-collision',
				tracingContext: inboundTracingContext,
				workflow: {
					...defaultWorkflow,
					customAttributes: { env: 'workflow' },
				},
			});
			const node = { id: 'n1', name: 'Node1', type: 'test', typeVersion: 1 };
			tracer.startNode({
				executionId: 'exec-workflow-node-tag-collision',
				node,
			});
			tracer.endNode({
				executionId: 'exec-workflow-node-tag-collision',
				node,
				inputItemCount: 1,
				outputItemCount: 1,
				customAttributes: { env: 'node' },
			});
			tracer.endWorkflow({
				executionId: 'exec-workflow-node-tag-collision',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const nodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpan.attributes['n8n.workflow.custom.env']).toBeUndefined();
			expect(nodeSpan.attributes['n8n.node.custom.env']).toBe('node');
		});

		it('should preserve agent tracing custom attributes on node.execute when the node errors', () => {
			tracer.startWorkflow({
				executionId: 'exec-agent-meta-err',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			const agentNode = { id: 'n-agent', name: 'Agent', type: 'test', typeVersion: 1 };
			tracer.startNode({
				executionId: 'exec-agent-meta-err',
				node: agentNode,
			});
			tracer.endNode({
				executionId: 'exec-agent-meta-err',
				node: agentNode,
				inputItemCount: 1,
				outputItemCount: 0,
				customAttributes: {
					'ai.agent.version': 'v3',
					'ai.agent.failure.type': 'NodeOperationError',
				},
				error: {
					message: 'agent failed',
					constructor: { name: 'NodeOperationError' },
					stack: 'stack trace here',
				},
			});
			tracer.endWorkflow({
				executionId: 'exec-agent-meta-err',
				status: 'error',
				mode: 'manual',
				error: new Error('workflow failed'),
				isRetry: false,
			});

			const nodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpan.status.code).toBe(SpanStatusCode.ERROR);
			expect(nodeSpan.attributes['n8n.node.custom.ai.agent.version']).toBe('v3');
			expect(nodeSpan.attributes['n8n.node.custom.ai.agent.failure.type']).toBe(
				'NodeOperationError',
			);
		});
	});

	describe('endDanglingNodeSpans', () => {
		it('should end unfinished node spans when workflow ends', () => {
			tracer.startWorkflow({
				executionId: 'exec-9',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			tracer.startNode({
				executionId: 'exec-9',
				node: { id: 'n1', name: 'StuckNode', type: 'test', typeVersion: 1 },
			});
			// Don't call endNode — simulate a dangling span
			tracer.endWorkflow({
				executionId: 'exec-9',
				status: 'crashed',
				mode: 'manual',
				isRetry: false,
			});

			const nodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpan).toBeDefined();
			expect(nodeSpan.status.code).toBe(SpanStatusCode.ERROR);
			expect(nodeSpan.attributes['n8n.node.termination_reason']).toBe('workflow_cancelled');
		});
	});

	describe('injectTraceHeaders', () => {
		// Parse `00-<traceId>-<spanId>-<flags>` into its fields.
		const parseTraceparent = (tp: string) => {
			const [, traceId, spanId] = tp.split('-');
			return { traceId, spanId };
		};

		it('should inject traceparent from node span', () => {
			tracer.startWorkflow({
				executionId: 'exec-10',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			const httpNode = { id: 'n1', name: 'HTTP', type: 'test', typeVersion: 1 };
			tracer.startNode({
				executionId: 'exec-10',
				node: httpNode,
			});

			const headers: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-10', 'HTTP', headers);

			expect(headers.traceparent).toBeDefined();
			expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);

			tracer.endNode({
				executionId: 'exec-10',
				node: httpNode,
				inputItemCount: 1,
				outputItemCount: 1,
			});
			tracer.endWorkflow({
				executionId: 'exec-10',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});
		});

		// Regression: the injected span was silently falling back to the workflow span
		// because the internal node-span map was keyed by node.id while the lookup used
		// node.name. This test locks in the distinction.
		it('should inject the node span id when a node name is provided, not the workflow span id', () => {
			tracer.startWorkflow({
				executionId: 'exec-node-preference',
				workflow: defaultWorkflow,
			});
			const httpNode = { id: 'n1', name: 'HTTP', type: 'test', typeVersion: 1 };
			tracer.startNode({ executionId: 'exec-node-preference', node: httpNode });

			const workflowHeaders: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-node-preference', undefined, workflowHeaders);

			const nodeHeaders: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-node-preference', 'HTTP', nodeHeaders);

			const { traceId: wfTrace, spanId: wfSpan } = parseTraceparent(workflowHeaders.traceparent);
			const { traceId: nodeTrace, spanId: nodeSpan } = parseTraceparent(nodeHeaders.traceparent);

			expect(nodeTrace).toBe(wfTrace); // same trace
			expect(nodeSpan).not.toBe(wfSpan); // but distinct span — the node's, not the workflow's

			tracer.endNode({
				executionId: 'exec-node-preference',
				node: httpNode,
				inputItemCount: 0,
				outputItemCount: 0,
			});
			tracer.endWorkflow({
				executionId: 'exec-node-preference',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});
		});

		it('should fall back to workflow span when no node span exists', () => {
			tracer.startWorkflow({
				executionId: 'exec-11',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});

			const headers: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-11', 'NonExistentNode', headers);

			expect(headers.traceparent).toBeDefined();

			tracer.endWorkflow({
				executionId: 'exec-11',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});
		});

		it('should no-op when no spans exist', () => {
			const headers: Record<string, string> = {};
			tracer.injectTraceHeaders('non-existent', 'Node', headers);

			expect(headers.traceparent).toBeUndefined();
		});

		it('should no-op when injectOutbound is false', () => {
			const noInjectTracer = new ExecutionLevelTracer(
				otel.asOtelService(),
				makeOtelSettingsService({ injectOutbound: false }),
				logger,
			);

			noInjectTracer.startWorkflow({
				executionId: 'exec-12',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});

			const headers: Record<string, string> = {};
			noInjectTracer.injectTraceHeaders('exec-12', undefined, headers);

			expect(headers.traceparent).toBeUndefined();

			noInjectTracer.endWorkflow({
				executionId: 'exec-12',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});
		});

		it('should preserve same traceId between workflow and outbound', () => {
			const inboundTraceparent = '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1-bbbbbbbbbbbbbb01-01';
			tracer.startWorkflow({
				executionId: 'exec-13',
				tracingContext: { traceparent: inboundTraceparent },
				workflow: defaultWorkflow,
			});

			const headers: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-13', undefined, headers);

			// Outbound traceparent should share the same traceId
			expect(headers.traceparent).toMatch(/^00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1-/);

			tracer.endWorkflow({
				executionId: 'exec-13',
				status: 'success',
				mode: 'webhook',
				isRetry: false,
			});
		});
	});

	describe('trace context ownership', () => {
		const traceparentPattern = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

		it('should start a new trace when no tracing context is given, even inside an active foreign span', () => {
			const foreignSpan = trace.getTracer('foreign').startSpan('GET /webhook');

			context.with(trace.setSpan(context.active(), foreignSpan), () => {
				tracer.startWorkflow({ executionId: 'exec-root', workflow: defaultWorkflow });
			});
			tracer.endWorkflow({
				executionId: 'exec-root',
				status: 'success',
				mode: 'webhook',
				isRetry: false,
			});
			foreignSpan.end();

			const workflowSpan = otel.getFinishedSpans().find((s) => s.name === 'workflow.execute')!;
			expect(workflowSpan.parentSpanContext).toBeUndefined();
			expect(workflowSpan.spanContext().traceId).not.toBe(foreignSpan.spanContext().traceId);
		});

		it('should emit W3C trace context while another library owns the global propagator', () => {
			const foreignPropagator: TextMapPropagator = {
				inject: (_ctx, carrier, setter) => setter.set(carrier, 'sentry-trace', 'foreign'),
				extract: (ctx) => ctx,
				fields: () => ['sentry-trace'],
			};
			propagation.setGlobalPropagator(foreignPropagator);

			try {
				const persisted = tracer.startWorkflow({
					executionId: 'exec-w3c',
					workflow: defaultWorkflow,
				});
				const headers: Record<string, string> = {};
				tracer.injectTraceHeaders('exec-w3c', undefined, headers);
				tracer.endWorkflow({
					executionId: 'exec-w3c',
					status: 'success',
					mode: 'webhook',
					isRetry: false,
				});

				expect(persisted.traceparent).toMatch(traceparentPattern);
				expect(headers.traceparent).toMatch(traceparentPattern);
				expect(headers['sentry-trace']).toBeUndefined();
			} finally {
				propagation.disable();
			}
		});
	});

	describe('getActiveContext', () => {
		it('returns a context carrying the node span when one is active', () => {
			tracer.startWorkflow({ executionId: 'exec-ctx-node', workflow: defaultWorkflow });
			const node = { id: 'n1', name: 'HTTP', type: 'test', typeVersion: 1 };
			tracer.startNode({ executionId: 'exec-ctx-node', node });

			const activeContext = tracer.getActiveContext('exec-ctx-node', 'HTTP');
			expect(activeContext).toBeDefined();
			const nodeSpanId = trace.getSpan(activeContext!)?.spanContext().spanId;

			tracer.endNode({ executionId: 'exec-ctx-node', node, inputItemCount: 1, outputItemCount: 1 });
			tracer.endWorkflow({
				executionId: 'exec-ctx-node',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const finishedNodeSpan = otel.getFinishedSpans().find((s) => s.name === 'node.execute')!;
			expect(nodeSpanId).toBe(finishedNodeSpan.spanContext().spanId);
		});

		it('falls back to the workflow span when no node name is given, or when the given node name is not found', () => {
			tracer.startWorkflow({ executionId: 'exec-ctx-wf', workflow: defaultWorkflow });

			const activeContext = tracer.getActiveContext('exec-ctx-wf');
			expect(activeContext).toBeDefined();
			const spanId = trace.getSpan(activeContext!)?.spanContext().spanId;

			const fallbackContext = tracer.getActiveContext('exec-ctx-wf', 'UnknownNode');
			expect(trace.getSpan(fallbackContext!)?.spanContext().spanId).toBe(spanId);

			tracer.endWorkflow({
				executionId: 'exec-ctx-wf',
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const finishedWorkflowSpan = otel
				.getFinishedSpans()
				.find((s) => s.name === 'workflow.execute')!;
			expect(spanId).toBe(finishedWorkflowSpan.spanContext().spanId);
		});

		it('returns undefined when no spans are tracked for the execution', () => {
			expect(tracer.getActiveContext('non-existent')).toBeUndefined();
			expect(tracer.getActiveContext('non-existent', 'SomeNode')).toBeUndefined();
		});
	});
	describe('execution identity', () => {
		const identityKeys = [
			'n8n.execution.id',
			'n8n.workflow.id',
			'n8n.workflow.name',
			'n8n.project.id',
			'n8n.project.name',
		];
		const identityOf = (attributes: Record<string, unknown>) =>
			Object.fromEntries(
				identityKeys.filter((k) => k in attributes).map((k) => [k, attributes[k]]),
			);

		const node = { id: 'n1', name: 'MyNode', type: 'test', typeVersion: 1 };

		const runSegment = (params: StartWorkflowParams, status: ExecutionStatus = 'success') => {
			const saved = tracer.startWorkflow(params);
			tracer.startNode({ executionId: params.executionId, node });
			tracer.endNode({
				executionId: params.executionId,
				node,
				inputItemCount: 1,
				outputItemCount: 1,
			});
			tracer.endWorkflow({
				executionId: params.executionId,
				status,
				mode: 'manual',
				isRetry: false,
			});

			const spans = otel
				.getFinishedSpans()
				.filter((s) => s.attributes['n8n.execution.id'] === params.executionId);
			return {
				saved,
				workflowSpan: spans.find((s) => s.name === 'workflow.execute')!,
				nodeSpan: spans.find((s) => s.name === 'node.execute')!,
			};
		};

		it('should add the same five identity attributes to workflow and node spans', () => {
			const { workflowSpan, nodeSpan } = runSegment({
				executionId: 'exec-id',
				workflow: defaultWorkflow,
				project: { id: 'proj-1', name: 'Finance' },
			});

			const expected = {
				'n8n.execution.id': 'exec-id',
				'n8n.workflow.id': 'wf-1',
				'n8n.workflow.name': 'Test',
				'n8n.project.id': 'proj-1',
				'n8n.project.name': 'Finance',
			};
			expect(identityOf(workflowSpan.attributes)).toEqual(expected);
			expect(identityOf(nodeSpan.attributes)).toEqual(expected);
		});

		it('should not add a project name when the project has none', () => {
			const { nodeSpan } = runSegment({
				executionId: 'exec-no-name',
				workflow: defaultWorkflow,
				project: { id: 'proj-1' },
			});

			expect(nodeSpan.attributes['n8n.project.id']).toBe('proj-1');
			expect(nodeSpan.attributes).not.toHaveProperty('n8n.project.name');
		});

		it('should give a sub-workflow its own identity, not the identity of its parent', () => {
			const parent = runSegment({
				executionId: 'exec-parent',
				workflow: defaultWorkflow,
				project: { id: 'proj-1', name: 'Finance' },
			});

			const child = runSegment({
				executionId: 'exec-child',
				tracingContext: parent.saved,
				workflow: { id: 'wf-child', name: 'Child', nodeCount: 1 },
				project: { id: 'proj-2', name: 'Operations' },
			});

			const expected = {
				'n8n.execution.id': 'exec-child',
				'n8n.workflow.id': 'wf-child',
				'n8n.workflow.name': 'Child',
				'n8n.project.id': 'proj-2',
				'n8n.project.name': 'Operations',
			};
			expect(identityOf(child.workflowSpan.attributes)).toEqual(expected);
			expect(identityOf(child.nodeSpan.attributes)).toEqual(expected);
			expect(child.workflowSpan.parentSpanContext?.spanId).toBe(
				parent.workflowSpan.spanContext().spanId,
			);
		});

		it('should take the current workflow name and project on a resume', () => {
			const parked = runSegment(
				{
					executionId: 'exec-resume',
					workflow: { ...defaultWorkflow, name: 'Before' },
					project: { id: 'proj-1', name: 'Finance' },
				},
				'waiting',
			);
			otel.reset();

			const resumed = runSegment({
				executionId: 'exec-resume',
				tracingContext: parked.saved,
				linkTo: parked.saved,
				savedIdentity: toExecutionIdentity(parked.saved.identity),
				workflow: { ...defaultWorkflow, name: 'After' },
				project: { id: 'proj-2', name: 'Operations' },
			});

			const expected = {
				'n8n.execution.id': 'exec-resume',
				'n8n.workflow.id': 'wf-1',
				'n8n.workflow.name': 'After',
				'n8n.project.id': 'proj-2',
				'n8n.project.name': 'Operations',
			};
			expect(identityOf(resumed.workflowSpan.attributes)).toEqual(expected);
			expect(identityOf(resumed.nodeSpan.attributes)).toEqual(expected);
			expect(resumed.saved.identity).toEqual(expected);
		});

		it('should keep the saved project on a resume when the project lookup fails', () => {
			const parked = runSegment(
				{
					executionId: 'exec-resume-lookup',
					workflow: defaultWorkflow,
					project: { id: 'proj-1', name: 'Finance' },
				},
				'waiting',
			);
			otel.reset();

			const { nodeSpan } = runSegment({
				executionId: 'exec-resume-lookup',
				tracingContext: parked.saved,
				linkTo: parked.saved,
				savedIdentity: toExecutionIdentity(parked.saved.identity),
				workflow: defaultWorkflow,
			});

			expect(nodeSpan.attributes['n8n.project.id']).toBe('proj-1');
			expect(nodeSpan.attributes['n8n.project.name']).toBe('Finance');
		});

		it('should take the project from the resume when the saved identity has no project', () => {
			const parked = runSegment(
				{ executionId: 'exec-resume-project', workflow: { ...defaultWorkflow, name: 'Before' } },
				'waiting',
			);
			otel.reset();

			const { nodeSpan } = runSegment({
				executionId: 'exec-resume-project',
				tracingContext: parked.saved,
				linkTo: parked.saved,
				savedIdentity: toExecutionIdentity(parked.saved.identity),
				workflow: { ...defaultWorkflow, name: 'After' },
				project: { id: 'proj-1', name: 'Finance' },
			});

			expect(identityOf(nodeSpan.attributes)).toEqual({
				'n8n.execution.id': 'exec-resume-project',
				'n8n.workflow.id': 'wf-1',
				'n8n.workflow.name': 'After',
				'n8n.project.id': 'proj-1',
				'n8n.project.name': 'Finance',
			});
		});

		it('should build the identity again on a resume without a saved identity', () => {
			const { workflowSpan, nodeSpan } = runSegment({
				executionId: 'exec-resume-legacy',
				tracingContext: inboundTracingContext,
				linkTo: inboundTracingContext,
				workflow: { ...defaultWorkflow, name: 'After' },
				project: { id: 'proj-1', name: 'Finance' },
			});

			expect(workflowSpan.attributes['n8n.workflow.name']).toBe('After');
			expect(nodeSpan.attributes['n8n.workflow.name']).toBe('After');
			expect(nodeSpan.attributes['n8n.project.name']).toBe('Finance');
		});

		const crashParams = {
			executionId: 'exec-crash',
			workflowId: 'wf-1',
			workflowName: 'Renamed',
			mode: 'trigger',
			detector: 'queue-recovery',
			stoppedAt: new Date(),
			project: { id: 'proj-1' },
		} as const;

		it('should take the identity of a reconstructed crash span from the saved identity', () => {
			const otherProcess = new ExecutionLevelTracer(
				otel.asOtelService(),
				makeOtelSettingsService(),
				logger,
			);
			const saved = otherProcess.startWorkflow({
				executionId: 'exec-crash',
				workflow: { ...defaultWorkflow, name: 'Before' },
				project: { id: 'proj-1', name: 'Finance' },
			});

			tracer.endCrashedWorkflow({ ...crashParams, tracingContext: saved });

			const span = otel.getFinishedSpans()[0];
			expect(span.attributes['n8n.execution.reconstructed']).toBe(true);
			expect(identityOf(span.attributes)).toEqual({
				'n8n.execution.id': 'exec-crash',
				'n8n.workflow.id': 'wf-1',
				'n8n.workflow.name': 'Before',
				'n8n.project.id': 'proj-1',
				'n8n.project.name': 'Finance',
			});
		});

		it('should build a crash span identity from the event without a project name when no identity is saved', () => {
			tracer.endCrashedWorkflow({ ...crashParams, tracingContext: inboundTracingContext });

			expect(identityOf(otel.getFinishedSpans()[0].attributes)).toEqual({
				'n8n.execution.id': 'exec-crash',
				'n8n.workflow.id': 'wf-1',
				'n8n.workflow.name': 'Renamed',
				'n8n.project.id': 'proj-1',
			});
		});

		it('should not send the execution identity on outbound requests', () => {
			tracer.startWorkflow({
				executionId: 'exec-outbound',
				workflow: defaultWorkflow,
				project: { id: 'proj-1', name: 'Finance' },
			});
			tracer.startNode({ executionId: 'exec-outbound', node });

			const headers: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-outbound', node.name, headers);

			expect(headers.traceparent).toBeDefined();
			expect(headers).not.toHaveProperty('baggage');
		});
	});

	describe('start marker spans', () => {
		const node = { id: 'n1', name: 'MyNode', type: 'test', typeVersion: 1 };
		const project = { id: 'proj-1', name: 'Finance', customAttributes: { env: 'prod' } };
		const workflow = { ...defaultWorkflow, customAttributes: { team: 'ops' } };
		const identity = {
			'n8n.execution.id': 'exec-marker',
			'n8n.workflow.id': 'wf-1',
			'n8n.workflow.name': 'Test',
			'n8n.project.id': 'proj-1',
			'n8n.project.name': 'Finance',
		};

		const runSegment = (emitStartSpan: boolean, params: Partial<StartWorkflowParams> = {}) => {
			tracer.startWorkflow({
				executionId: 'exec-marker',
				workflow,
				project,
				emitStartSpan,
				...params,
			});
			tracer.startNode({ executionId: 'exec-marker', node, emitStartSpan });
			tracer.endNode({ executionId: 'exec-marker', node, inputItemCount: 1, outputItemCount: 1 });
			tracer.endWorkflow({
				executionId: 'exec-marker',
				status: 'success',
				mode: 'trigger',
				isRetry: false,
			});
		};

		const spansNamed = (name: string) => otel.getFinishedSpans().filter((s) => s.name === name);

		it('should emit no marker when the flags are off', () => {
			runSegment(false);

			expect(otel.getFinishedSpans().map((s) => s.name)).toEqual([
				'node.execute',
				'workflow.execute',
			]);
		});

		it('should emit one zero-duration workflow marker as a child of the workflow span', () => {
			runSegment(true);

			const [workflowSpan] = spansNamed('workflow.execute');
			const markers = spansNamed('workflow.execute.started');
			expect(markers).toHaveLength(1);

			const [marker] = markers;
			expect(marker.parentSpanContext?.spanId).toBe(workflowSpan.spanContext().spanId);
			expect(marker.spanContext().traceId).toBe(workflowSpan.spanContext().traceId);
			expect(marker.duration).toEqual([0, 0]);
			expect(marker.startTime).toEqual(workflowSpan.startTime);
			expect(marker.endTime).toEqual(workflowSpan.startTime);
		});

		it('should give the workflow marker the start attributes and identity of the workflow span', () => {
			runSegment(true);

			const [marker] = spansNamed('workflow.execute.started');
			expect(marker.attributes).toEqual({
				'n8n.workflow.version_id': 'v1',
				'n8n.workflow.node_count': 2,
				'n8n.workflow.custom.team': 'ops',
				'n8n.project.custom.env': 'prod',
				...identity,
			});
		});

		it('should emit one zero-duration node marker as a child of each node span', () => {
			runSegment(true);

			const [nodeSpan] = spansNamed('node.execute');
			const markers = spansNamed('node.execute.started');
			expect(markers).toHaveLength(1);

			const [marker] = markers;
			expect(marker.parentSpanContext?.spanId).toBe(nodeSpan.spanContext().spanId);
			expect(marker.duration).toEqual([0, 0]);
			expect(marker.startTime).toEqual(nodeSpan.startTime);
			expect(marker.endTime).toEqual(nodeSpan.startTime);
		});

		it('should give the node marker the node attributes and identity, without node custom tags', () => {
			runSegment(true);

			const [marker] = spansNamed('node.execute.started');
			expect(marker.attributes).toEqual({
				'n8n.node.id': 'n1',
				'n8n.node.name': 'MyNode',
				'n8n.node.type': 'test',
				'n8n.node.type_version': 1,
				'n8n.project.custom.env': 'prod',
				...identity,
			});
		});

		it('should emit one workflow marker for each segment', () => {
			runSegment(true);
			runSegment(true, { workflow: { ...workflow, name: 'Renamed' } });

			const workflowSpans = spansNamed('workflow.execute');
			const markers = spansNamed('workflow.execute.started');
			expect(markers).toHaveLength(2);
			expect(markers.map((m) => m.parentSpanContext?.spanId)).toEqual(
				workflowSpans.map((s) => s.spanContext().spanId),
			);
			expect(markers.map((m) => m.attributes['n8n.workflow.name'])).toEqual(['Test', 'Renamed']);
		});

		it('should keep the real spans and only warn when a marker fails', () => {
			const failingMarkers = mock<OtelService>({
				getTracer: (name: string) => {
					const real = otel.provider.getTracer(name);
					return {
						startSpan: (spanName, options, ctx) => {
							if (spanName.endsWith('.started')) throw new Error('marker failed');
							return real.startSpan(spanName, options, ctx);
						},
					} as Tracer;
				},
			});
			tracer = new ExecutionLevelTracer(failingMarkers, makeOtelSettingsService(), logger);

			expect(() => runSegment(true)).not.toThrow();

			expect(otel.getFinishedSpans().map((s) => s.name)).toEqual([
				'node.execute',
				'workflow.execute',
			]);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to emit start marker span',
				expect.objectContaining({ spanName: 'workflow.execute.started', error: 'marker failed' }),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to emit start marker span',
				expect.objectContaining({ spanName: 'node.execute.started', error: 'marker failed' }),
			);
		});
	});
});

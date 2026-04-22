import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import { SpanStatusCode } from '@opentelemetry/api';

import { OtelTestProvider } from './support/otel-test-provider';
import { ExecutionLevelTracer } from '../execution-level-tracer';
import { OtelConfig } from '../otel.config';

describe('ExecutionLevelTracer', () => {
	let otel: OtelTestProvider;
	let tracer: ExecutionLevelTracer;
	const logger = mock<Logger>();

	const makeConfig = (overrides: Partial<OtelConfig> = {}): OtelConfig =>
		Object.assign(new OtelConfig(), { includeNodeSpans: true, injectOutbound: true }, overrides);

	beforeAll(() => {
		otel = OtelTestProvider.create();
	});

	afterAll(async () => {
		await otel.shutdown();
	});

	beforeEach(() => {
		otel.reset();
		tracer = new ExecutionLevelTracer(makeConfig(), logger);
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
			expect(span.attributes['n8n.execution.mode']).toBe('manual');
			expect(span.attributes['n8n.execution.status']).toBe('success');
			expect(span.status.code).toBe(SpanStatusCode.OK);
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
			expect(result!.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);

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
			expect(result!.traceparent).toMatch(/^00-0af7651916cd43dd8448eb211c80319c-/);

			tracer.endWorkflow({
				executionId: 'exec-preserve',
				status: 'success',
				mode: 'webhook',
				isRetry: false,
			});
		});
	});

	describe('startNode / endNode', () => {
		it('should create node span as child of workflow span', () => {
			tracer.startWorkflow({
				executionId: 'exec-5',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			tracer.startNode({
				executionId: 'exec-5',
				node: {
					id: 'n1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
				},
			});
			tracer.endNode({
				executionId: 'exec-5',
				nodeName: 'HTTP Request',
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
			tracer.startNode({
				executionId: 'exec-6',
				node: { id: 'n1', name: 'Node1', type: 'test', typeVersion: 1 },
			});

			const nodeError = new TypeError('connection refused');
			tracer.endNode({
				executionId: 'exec-6',
				nodeName: 'Node1',
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
			expect(nodeSpan.events[0].attributes?.['exception.message']).toBe('connection refused');
			expect(nodeSpan.events[0].attributes?.['exception.type']).toBe('TypeError');
		});

		it('should add custom attributes from tracing metadata', () => {
			tracer.startWorkflow({
				executionId: 'exec-7',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			tracer.startNode({
				executionId: 'exec-7',
				node: { id: 'n1', name: 'AI', type: 'test', typeVersion: 1 },
			});
			tracer.endNode({
				executionId: 'exec-7',
				nodeName: 'AI',
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
		it('should inject traceparent from node span', () => {
			tracer.startWorkflow({
				executionId: 'exec-10',
				tracingContext: inboundTracingContext,
				workflow: defaultWorkflow,
			});
			tracer.startNode({
				executionId: 'exec-10',
				node: { id: 'n1', name: 'HTTP', type: 'test', typeVersion: 1 },
			});

			const headers: Record<string, string> = {};
			tracer.injectTraceHeaders('exec-10', 'HTTP', headers);

			expect(headers.traceparent).toBeDefined();
			expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);

			tracer.endNode({
				executionId: 'exec-10',
				nodeName: 'HTTP',
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
				makeConfig({ injectOutbound: false }),
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
});

import type { WorkflowExecuteAfterContext, WorkflowExecuteBeforeContext } from '@n8n/decorators';
import type { Span, Tracer } from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';
import { mock } from 'jest-mock-extended';

import { WorkflowEndHandler } from '../handlers/workflow-end.handler';
import { WorkflowStartHandler } from '../handlers/workflow-start.handler';
import { ATTR } from '../otel.constants';
import type { SpanRegistry } from '../span-registry';

describe('WorkflowStartHandler', () => {
	it('creates workflow span with expected initial attributes', () => {
		const handler = new WorkflowStartHandler();
		const span = mock<Span>();
		const tracer = mock<Tracer>({
			startSpan: jest.fn().mockReturnValue(span),
		});
		const spans = mock<SpanRegistry>();
		const ctx = {
			workflow: {
				id: 'workflow-1',
				name: 'Test Workflow',
				nodes: [{ id: 'node-1' }, { id: 'node-2' }],
			},
			executionId: 'exec-1',
		} as unknown as WorkflowExecuteBeforeContext;

		handler.handle(ctx, spans, tracer);

		expect(tracer.startSpan).toHaveBeenCalledWith('workflow.execute', {
			attributes: {
				[ATTR.WORKFLOW_ID]: 'workflow-1',
				[ATTR.WORKFLOW_NAME]: 'Test Workflow',
				[ATTR.WORKFLOW_NODE_COUNT]: 2,
				[ATTR.EXECUTION_ID]: 'exec-1',
			},
		});
		expect(spans.addWorkflow).toHaveBeenCalledWith('exec-1', span);
	});
});

describe('WorkflowEndHandler', () => {
	it('does nothing when workflow span is missing', () => {
		const handler = new WorkflowEndHandler();
		const spans = mock<SpanRegistry>({
			removeWorkflow: jest.fn().mockReturnValue(undefined),
		});
		const ctx = {
			executionId: 'exec-1',
			runData: {
				mode: 'webhook',
				status: 'success',
				data: { resultData: {} },
			},
		} as unknown as WorkflowExecuteAfterContext;

		handler.handle(ctx, spans);

		expect(spans.removeWorkflow).toHaveBeenCalledWith('exec-1');
		expect(spans.cleanup).not.toHaveBeenCalled();
	});

	it('marks successful execution as OK and finalizes span', () => {
		const handler = new WorkflowEndHandler();
		const span = mock<Span>();
		const spans = mock<SpanRegistry>({
			removeWorkflow: jest.fn().mockReturnValue(span),
		});
		const ctx = {
			executionId: 'exec-2',
			runData: {
				mode: 'manual',
				status: 'success',
				data: { resultData: {} },
			},
		} as unknown as WorkflowExecuteAfterContext;

		handler.handle(ctx, spans);

		expect(span.setAttributes).toHaveBeenCalledWith({
			[ATTR.EXECUTION_MODE]: 'manual',
			[ATTR.EXECUTION_STATUS]: 'success',
			[ATTR.EXECUTION_IS_RETRY]: false,
		});
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
		expect(span.end).toHaveBeenCalledTimes(1);
		expect(spans.cleanup).toHaveBeenCalledWith('exec-2');
	});

	it('sets retry attributes for retry execution', () => {
		const handler = new WorkflowEndHandler();
		const span = mock<Span>();
		const spans = mock<SpanRegistry>({
			removeWorkflow: jest.fn().mockReturnValue(span),
		});
		const ctx = {
			executionId: 'exec-3',
			retryOf: 'exec-original',
			runData: {
				mode: 'retry',
				status: 'success',
				data: { resultData: {} },
			},
		} as unknown as WorkflowExecuteAfterContext;

		handler.handle(ctx, spans);

		expect(span.setAttributes).toHaveBeenCalledWith({
			[ATTR.EXECUTION_MODE]: 'retry',
			[ATTR.EXECUTION_STATUS]: 'success',
			[ATTR.EXECUTION_IS_RETRY]: true,
			[ATTR.EXECUTION_RETRY_OF]: 'exec-original',
		});
	});

	it('marks error status as ERROR and sets error type from name', () => {
		const handler = new WorkflowEndHandler();
		const span = mock<Span>();
		const spans = mock<SpanRegistry>({
			removeWorkflow: jest.fn().mockReturnValue(span),
		});
		const ctx = {
			executionId: 'exec-4',
			runData: {
				mode: 'webhook',
				status: 'error',
				data: {
					resultData: {
						error: { name: 'WorkflowExecutionError' },
					},
				},
			},
		} as unknown as WorkflowExecuteAfterContext;

		handler.handle(ctx, spans);

		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
		expect(span.setAttribute).toHaveBeenCalledWith(
			ATTR.EXECUTION_ERROR_TYPE,
			'WorkflowExecutionError',
		);
	});

	it('marks crashed status as ERROR and falls back to UnknownError', () => {
		const handler = new WorkflowEndHandler();
		const span = mock<Span>();
		const spans = mock<SpanRegistry>({
			removeWorkflow: jest.fn().mockReturnValue(span),
		});
		const ctx = {
			executionId: 'exec-5',
			runData: {
				mode: 'trigger',
				status: 'crashed',
				data: {
					resultData: {
						error: { detail: 'unknown failure' },
					},
				},
			},
		} as unknown as WorkflowExecuteAfterContext;

		handler.handle(ctx, spans);

		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
		expect(span.setAttribute).toHaveBeenCalledWith(ATTR.EXECUTION_ERROR_TYPE, 'UnknownError');
	});
});

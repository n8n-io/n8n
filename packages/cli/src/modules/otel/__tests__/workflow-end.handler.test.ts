import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import type { Span } from '@opentelemetry/api';
import { mock } from 'jest-mock-extended';

import { WorkflowEndHandler } from '../handlers/workflow-end.handler';
import { ATTR } from '../otel.constants';
import { SpanRegistry } from '../span-registry';

describe('WorkflowEndHandler', () => {
	it('should set retry attributes for retried executions', () => {
		const handler = new WorkflowEndHandler();
		const spans = new SpanRegistry();
		const setAttributes = jest.fn();
		const span = mock<Span>({ setAttributes });
		spans.addWorkflow('exec-201', span);

		const context = {
			type: 'workflowExecuteAfter',
			executionId: 'exec-201',
			retryOf: 'exec-200',
			runData: {
				mode: 'retry',
				status: 'error',
				data: { resultData: { error: new Error('boom') } },
			},
		} as WorkflowExecuteAfterContext;

		handler.handle(context, spans);

		expect(setAttributes).toHaveBeenCalledWith(
			expect.objectContaining({
				[ATTR.EXECUTION_IS_RETRY]: true,
				[ATTR.EXECUTION_RETRY_OF]: 'exec-200',
			}),
		);
	});
});

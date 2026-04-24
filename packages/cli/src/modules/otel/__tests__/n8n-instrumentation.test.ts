import type { Logger } from '@n8n/backend-common';
import type { WorkflowExecuteAfterContext, WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';

import type { NodeEndHandler } from '../handlers/node-end.handler';
import type { NodeStartHandler } from '../handlers/node-start.handler';
import type { WorkflowEndHandler } from '../handlers/workflow-end.handler';
import type { WorkflowStartHandler } from '../handlers/workflow-start.handler';
import { N8nInstrumentation } from '../n8n-instrumentation';
import type { OtelConfig } from '../otel.config';

describe('N8nInstrumentation', () => {
	const workflowStartContext = { type: 'workflowExecuteBefore' } as WorkflowExecuteBeforeContext;
	const workflowEndContext = { type: 'workflowExecuteAfter' } as WorkflowExecuteAfterContext;

	it('should log a span-processing failure once per event type', () => {
		const workflowStartHandler = mock<WorkflowStartHandler>({
			handle: jest.fn(() => {
				throw new Error('start failure');
			}),
		});
		const workflowEndHandler = mock<WorkflowEndHandler>({
			handle: jest.fn(() => {
				throw new Error('end failure');
			}),
		});
		const nodeStartHandler = mock<NodeStartHandler>();
		const nodeEndHandler = mock<NodeEndHandler>();
		const config = mock<OtelConfig>({ includeNodeSpans: true });
		const logError = jest.fn();
		const logger = mock<Logger>({
			error: logError,
		});
		const instrumentation = new N8nInstrumentation(
			workflowStartHandler,
			workflowEndHandler,
			nodeStartHandler,
			nodeEndHandler,
			config,
			logger,
		);

		// Two start failures — only one log for that event
		instrumentation.onWorkflowStart(workflowStartContext);
		instrumentation.onWorkflowStart(workflowStartContext);
		// One end failure — logged separately
		instrumentation.onWorkflowEnd(workflowEndContext);

		expect(logError).toHaveBeenCalledTimes(2);
		expect(logError).toHaveBeenCalledWith('Failed to process OpenTelemetry span data', {
			event: 'workflowExecuteBefore',
			error: 'start failure',
		});
		expect(logError).toHaveBeenCalledWith('Failed to process OpenTelemetry span data', {
			event: 'workflowExecuteAfter',
			error: 'end failure',
		});
	});
});

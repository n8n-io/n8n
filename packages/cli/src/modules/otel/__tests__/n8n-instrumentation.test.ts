import type { Logger } from '@n8n/backend-common';
import type { WorkflowExecuteAfterContext, WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';

import type { WorkflowEndHandler } from '../handlers/workflow-end.handler';
import type { WorkflowStartHandler } from '../handlers/workflow-start.handler';
import { N8nInstrumentation } from '../n8n-instrumentation';

describe('N8nInstrumentation', () => {
	it('should log span-processing failures only once', async () => {
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
		const logger = mock<Logger>();
		const instrumentation = new N8nInstrumentation(
			workflowStartHandler,
			workflowEndHandler,
			logger,
		);

		const workflowStartContext = {
			type: 'workflowExecuteBefore',
		} as WorkflowExecuteBeforeContext;
		const workflowEndContext = {
			type: 'workflowExecuteAfter',
		} as WorkflowExecuteAfterContext;

		await instrumentation.onWorkflowStart(workflowStartContext);
		await instrumentation.onWorkflowEnd(workflowEndContext);

		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to process OpenTelemetry span data',
			expect.any(Object),
		);
	});
});

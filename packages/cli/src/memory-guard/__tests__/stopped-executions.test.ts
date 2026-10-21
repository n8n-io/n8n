import type { IRun } from 'n8n-workflow';
import { createRunExecutionData, WorkflowOperationError } from 'n8n-workflow';

import { StoppedExecutions } from '../stopped-executions';

describe('StoppedExecutions', () => {
	let stoppedExecutions: StoppedExecutions;

	const createRun = (): IRun => ({
		status: 'canceled',
		mode: 'webhook',
		startedAt: new Date(),
		storedAt: 'db',
		data: createRunExecutionData({
			resultData: { runData: { Big: [] }, lastNodeExecuted: 'Big' },
			parentExecution: { executionId: 'parent', workflowId: 'parent-workflow' },
		}),
	});

	beforeEach(() => {
		stoppedExecutions = new StoppedExecutions();
		stoppedExecutions.enabled = true;
	});

	it('should fail a stopped execution with the stop error and drop its run data', () => {
		const error = new WorkflowOperationError('Execution stopped');
		stoppedExecutions.markStopped('1', { error, runningNode: 'Fetch' });
		const run = createRun();

		stoppedExecutions.onWorkflowExecuteAfter('1', run);

		expect(run.status).toBe('error');
		expect(run.data.resultData).toEqual({
			runData: {},
			lastNodeExecuted: 'Fetch',
			error,
		});
		expect(run.data.executionData).toBeUndefined();
		expect(run.data.parentExecution).toEqual({
			executionId: 'parent',
			workflowId: 'parent-workflow',
		});
		expect(stoppedExecutions.isFinishing('1')).toBe(false);
	});

	it('should mark an execution that was not stopped as finishing, and keep its run', () => {
		const run = createRun();

		stoppedExecutions.onWorkflowExecuteAfter('1', run);

		expect(run.status).toBe('canceled');
		expect(run.data.resultData.runData).toEqual({ Big: [] });
		expect(stoppedExecutions.isFinishing('1')).toBe(true);
	});

	it('should record nothing while disabled', () => {
		stoppedExecutions.enabled = false;
		const run = createRun();

		stoppedExecutions.onWorkflowExecuteAfter('1', run);

		expect(run.status).toBe('canceled');
		expect(stoppedExecutions.isFinishing('1')).toBe(false);
	});

	it('should clear the finishing mark when the execution starts again', () => {
		stoppedExecutions.onWorkflowExecuteAfter('1', createRun());

		stoppedExecutions.onWorkflowExecuteStart('1');

		expect(stoppedExecutions.isFinishing('1')).toBe(false);
	});

	it('should forget stopped executions and prune finishing executions that ended', () => {
		stoppedExecutions.markStopped('1', {
			error: new WorkflowOperationError('Execution stopped'),
			runningNode: undefined,
		});
		stoppedExecutions.onWorkflowExecuteAfter('2', createRun());
		stoppedExecutions.onWorkflowExecuteAfter('3', createRun());

		stoppedExecutions.forget('1');
		stoppedExecutions.pruneFinishing((executionId) => executionId === '3');

		expect(stoppedExecutions.isStopped('1')).toBe(false);
		expect(stoppedExecutions.isFinishing('2')).toBe(false);
		expect(stoppedExecutions.isFinishing('3')).toBe(true);
	});
});

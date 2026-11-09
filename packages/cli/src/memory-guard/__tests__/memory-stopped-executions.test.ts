import type { IRun } from 'n8n-workflow';
import { createRunExecutionData, WorkflowOperationError } from 'n8n-workflow';

import { MemoryStoppedExecutions } from '../memory-stopped-executions';

describe('MemoryStoppedExecutions', () => {
	let memoryStoppedExecutions: MemoryStoppedExecutions;

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
		memoryStoppedExecutions = new MemoryStoppedExecutions();
		memoryStoppedExecutions.enabled = true;
	});

	it('should fail a stopped execution with the stop error and drop its run data', () => {
		const error = new WorkflowOperationError('Execution stopped');
		memoryStoppedExecutions.markStopped('1', { error, runningNode: 'Fetch' });
		const run = createRun();

		memoryStoppedExecutions.onWorkflowExecuteAfter('1', run);

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
		expect(memoryStoppedExecutions.isFinishing('1')).toBe(false);
	});

	it('should record nothing while disabled', () => {
		memoryStoppedExecutions.enabled = false;
		const run = createRun();

		memoryStoppedExecutions.onWorkflowExecuteAfter('1', run);

		expect(run.status).toBe('canceled');
		expect(memoryStoppedExecutions.isFinishing('1')).toBe(false);
	});

	it('should forget stopped executions and prune finishing executions that ended', () => {
		memoryStoppedExecutions.markStopped('1', {
			error: new WorkflowOperationError('Execution stopped'),
			runningNode: undefined,
		});
		memoryStoppedExecutions.onWorkflowExecuteAfter('2', createRun());
		memoryStoppedExecutions.onWorkflowExecuteAfter('3', createRun());

		memoryStoppedExecutions.forget('1');
		memoryStoppedExecutions.pruneFinishing((executionId) => executionId === '3');

		expect(memoryStoppedExecutions.isStopped('1')).toBe(false);
		expect(memoryStoppedExecutions.isFinishing('2')).toBe(false);
		expect(memoryStoppedExecutions.isFinishing('3')).toBe(true);
	});
});

import { mockInstance } from '@n8n/backend-test-utils';
import type { User, WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ExecutionError, IRun } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { engineAdapter } from '../engine-adapter';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowRunner } from '@/workflow-runner';

const workflowRepository = mockInstance(WorkflowRepository);
const workflowRunner = mockInstance(WorkflowRunner);
const activeExecutions = mockInstance(ActiveExecutions);
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

const owner = mock<User>({ id: 'owner-123' });

const validWorkflow = mock<WorkflowEntity>({
	id: 'wf-1',
	name: 'Test Workflow',
	nodes: [
		{
			id: 'node-1',
			name: 'When clicking Test Workflow',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
});

const workflowWithoutStart = mock<WorkflowEntity>({
	id: 'wf-2',
	name: 'No Start Workflow',
	nodes: [
		{
			id: 'node-1',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
});

beforeEach(() => {
	jest.clearAllMocks();
});

describe('engineAdapter.runOnce', () => {
	it('returns { status: "success" } when execution completes without errors', async () => {
		workflowRepository.findOneBy.mockResolvedValue(validWorkflow);
		workflowRunner.run.mockResolvedValue('exec-1');
		activeExecutions.getPostExecutePromise.mockResolvedValue(
			mock<IRun>({ data: { resultData: { error: undefined } } }),
		);

		const result = await engineAdapter.runOnce(owner, 'wf-1');

		expect(result).toEqual({ status: 'success' });
	});

	it('returns { status: "error", errorMessage } when resultData.error is present, without throwing', async () => {
		workflowRepository.findOneBy.mockResolvedValue(validWorkflow);
		workflowRunner.run.mockResolvedValue('exec-1');
		activeExecutions.getPostExecutePromise.mockResolvedValue(
			mock<IRun>({
				data: {
					resultData: {
						error: { message: 'Node "Set" failed: missing value' } as ExecutionError,
					},
				},
			}),
		);

		const result = await engineAdapter.runOnce(owner, 'wf-1');

		expect(result).toEqual({
			status: 'error',
			errorMessage: 'Node "Set" failed: missing value',
		});
	});

	it('throws UnexpectedError when the workflow id is not found in the DB', async () => {
		workflowRepository.findOneBy.mockResolvedValue(null);

		await expect(engineAdapter.runOnce(owner, 'missing-id')).rejects.toBeInstanceOf(
			UnexpectedError,
		);

		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	it('throws UnexpectedError when the workflow has no valid CLI starting node', async () => {
		workflowRepository.findOneBy.mockResolvedValue(workflowWithoutStart);

		await expect(engineAdapter.runOnce(owner, 'wf-2')).rejects.toBeInstanceOf(UnexpectedError);

		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	it('calls WorkflowRunner.run exactly once per invocation', async () => {
		workflowRepository.findOneBy.mockResolvedValue(validWorkflow);
		workflowRunner.run.mockResolvedValue('exec-1');
		activeExecutions.getPostExecutePromise.mockResolvedValue(
			mock<IRun>({ data: { resultData: { error: undefined } } }),
		);

		await engineAdapter.runOnce(owner, 'wf-1');

		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
	});
});

describe('engineAdapter.waitWhileActive', () => {
	it('resolves immediately if the signal is already aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(engineAdapter.waitWhileActive(controller.signal)).resolves.toBeUndefined();
	});

	it('resolves the moment the signal aborts', async () => {
		const controller = new AbortController();
		const start = Date.now();

		const pending = engineAdapter.waitWhileActive(controller.signal);
		setTimeout(() => controller.abort(), 25);
		await pending;

		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(20);
		expect(elapsed).toBeLessThan(1000);
	});

	it('does not resolve while the signal remains unaborted', async () => {
		const controller = new AbortController();
		let resolved = false;

		void engineAdapter.waitWhileActive(controller.signal).then(() => {
			resolved = true;
		});

		await new Promise((r) => setTimeout(r, 20));
		expect(resolved).toBe(false);

		controller.abort();
		await new Promise((r) => setImmediate(r));
		expect(resolved).toBe(true);
	});
});

describe('engineAdapter.deactivateAll', () => {
	it('delegates to ActiveWorkflowManager.removeAll', async () => {
		activeWorkflowManager.removeAll.mockResolvedValue(undefined);

		await engineAdapter.deactivateAll();

		expect(activeWorkflowManager.removeAll).toHaveBeenCalledTimes(1);
	});

	it('propagates errors from removeAll so callers can decide how to handle them', async () => {
		activeWorkflowManager.removeAll.mockRejectedValue(new Error('teardown failed'));

		await expect(engineAdapter.deactivateAll()).rejects.toThrow('teardown failed');
	});
});

import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { ExecutionRepository } from '@n8n/db';
import type { Response } from 'express';
import { captor, mock } from 'jest-mock-extended';
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	IWorkflowExecutionDataProcess,
	StructuredChunk,
} from 'n8n-workflow';
import {
	ManualExecutionCancelledError,
	randomInt,
	sleep,
	SystemShutdownExecutionCancelledError,
} from 'n8n-workflow';
import PCancelable from 'p-cancelable';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import config from '@/config';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	sleep: jest.fn(),
}));

const FAKE_EXECUTION_ID = '15';
const FAKE_SECOND_EXECUTION_ID = '20';

const executionRepository = mock<ExecutionRepository>();

const concurrencyControl = mockInstance(ConcurrencyControlService, {
	// @ts-expect-error Private property
	isEnabled: false,
});

describe('ActiveExecutions', () => {
	let activeExecutions: ActiveExecutions;
	let responsePromise: IDeferredPromise<IExecuteResponsePromiseData>;
	let workflowExecution: PCancelable<IRun>;
	let postExecutePromise: Promise<IRun | undefined>;

	const fullRunData: IRun = {
		data: {
			resultData: {
				runData: {},
			},
		},
		mode: 'manual',
		startedAt: new Date(),
		status: 'new',
	};

	const executionData: IWorkflowExecutionDataProcess = {
		executionMode: 'manual',
		workflowData: {
			id: '123',
			name: 'Test workflow 1',
			active: false,
			isArchived: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			nodes: [],
			connections: {},
		},
		userId: uuid(),
	};

	beforeEach(() => {
		activeExecutions = new ActiveExecutions(
			mock(),
			executionRepository,
			concurrencyControl,
			mock(),
		);

		executionRepository.createNewExecution.mockResolvedValue(FAKE_EXECUTION_ID);

		workflowExecution = new PCancelable<IRun>((resolve) => resolve());
		workflowExecution.cancel = jest.fn();
		responsePromise = mock<IDeferredPromise<IExecuteResponsePromiseData>>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('Should initialize activeExecutions with empty list', () => {
		expect(activeExecutions.getActiveExecutions()).toHaveLength(0);
	});

	test('Should add execution to active execution list', async () => {
		const executionId = await activeExecutions.add(executionData);

		expect(executionId).toBe(FAKE_EXECUTION_ID);
		expect(activeExecutions.getActiveExecutions()).toHaveLength(1);
		expect(executionRepository.createNewExecution).toHaveBeenCalledTimes(1);
		expect(executionRepository.updateExistingExecution).toHaveBeenCalledTimes(0);
	});

	test('Should update execution if add is called with execution ID', async () => {
		const executionId = await activeExecutions.add(executionData, FAKE_SECOND_EXECUTION_ID);

		expect(executionId).toBe(FAKE_SECOND_EXECUTION_ID);
		expect(activeExecutions.getActiveExecutions()).toHaveLength(1);
		expect(executionRepository.createNewExecution).toHaveBeenCalledTimes(0);
		expect(executionRepository.updateExistingExecution).toHaveBeenCalledTimes(1);
	});

	describe('attachWorkflowExecution', () => {
		test('Should fail attaching execution to invalid executionId', async () => {
			expect(() => {
				activeExecutions.attachWorkflowExecution(FAKE_EXECUTION_ID, workflowExecution);
			}).toThrow();
		});

		test('Should successfully attach execution to valid executionId', async () => {
			await activeExecutions.add(executionData, FAKE_EXECUTION_ID);

			expect(() =>
				activeExecutions.attachWorkflowExecution(FAKE_EXECUTION_ID, workflowExecution),
			).not.toThrow();
		});
	});

	test('Should attach and resolve response promise to existing execution', async () => {
		await activeExecutions.add(executionData, FAKE_EXECUTION_ID);
		activeExecutions.attachResponsePromise(FAKE_EXECUTION_ID, responsePromise);
		const fakeResponse = { data: { resultData: { runData: {} } } };
		activeExecutions.resolveResponsePromise(FAKE_EXECUTION_ID, fakeResponse);

		expect(responsePromise.resolve).toHaveBeenCalledWith(fakeResponse);
	});

	test('Should copy over startedAt and responsePromise when resuming a waiting execution', async () => {
		const executionId = await activeExecutions.add(executionData);
		activeExecutions.setStatus(executionId, 'waiting');
		activeExecutions.attachResponsePromise(executionId, responsePromise);

		const waitingExecution = activeExecutions.getExecutionOrFail(executionId);
		expect(waitingExecution.responsePromise).toBeDefined();

		// Resume the execution
		await activeExecutions.add(executionData, executionId);

		const resumedExecution = activeExecutions.getExecutionOrFail(executionId);
		expect(resumedExecution.startedAt).toBe(waitingExecution.startedAt);
		expect(resumedExecution.responsePromise).toBe(responsePromise);
	});

	describe('finalizeExecution', () => {
		test('Should not remove a waiting execution', async () => {
			const executionId = await activeExecutions.add(executionData);
			activeExecutions.setStatus(executionId, 'waiting');
			activeExecutions.finalizeExecution(executionId);

			// Wait until the next tick to ensure that the post-execution promise has settled
			await new Promise(setImmediate);

			// Execution should still be in activeExecutions
			expect(activeExecutions.getActiveExecutions()).toHaveLength(1);
			expect(activeExecutions.getStatus(executionId)).toBe('waiting');
		});

		test('Should remove an existing execution', async () => {
			const executionId = await activeExecutions.add(executionData);

			activeExecutions.finalizeExecution(executionId);

			await new Promise(setImmediate);
			expect(activeExecutions.getActiveExecutions()).toHaveLength(0);
		});

		test('Should not try to resolve a post-execute promise for an inactive execution', async () => {
			const getExecutionSpy = jest.spyOn(activeExecutions, 'getExecutionOrFail');

			activeExecutions.finalizeExecution('inactive-execution-id', fullRunData);

			expect(getExecutionSpy).not.toHaveBeenCalled();
		});

		test('Should resolve post execute promise on removal', async () => {
			const executionId = await activeExecutions.add(executionData);
			const postExecutePromise = activeExecutions.getPostExecutePromise(executionId);

			await new Promise(setImmediate);
			activeExecutions.finalizeExecution(executionId, fullRunData);

			await expect(postExecutePromise).resolves.toEqual(fullRunData);
		});

		test('Should close response if it exists', async () => {
			executionData.httpResponse = mock<Response>();
			const executionId = await activeExecutions.add(executionData);
			activeExecutions.finalizeExecution(executionId, fullRunData);
			expect(executionData.httpResponse.end).toHaveBeenCalled();
		});

		test('Should handle error when closing response', async () => {
			const logger = mockInstance(Logger);
			activeExecutions = new ActiveExecutions(
				logger,
				executionRepository,
				concurrencyControl,
				mock(),
			);

			executionData.httpResponse = mock<Response>();
			jest.mocked(executionData.httpResponse.end).mockImplementation(() => {
				throw new Error('Connection closed');
			});

			const executionId = await activeExecutions.add(executionData);
			activeExecutions.finalizeExecution(executionId, fullRunData);

			expect(logger.error).toHaveBeenCalledWith('Error closing streaming response', {
				executionId,
				error: 'Connection closed',
			});
		});
	});

	describe('getPostExecutePromise', () => {
		test('Should throw error when trying to create a promise with invalid execution', async () => {
			await expect(activeExecutions.getPostExecutePromise(FAKE_EXECUTION_ID)).rejects.toThrow();
		});
	});

	describe('sendChunk', () => {
		test('should send chunk to response', async () => {
			executionData.httpResponse = mock<Response>();
			const executionId = await activeExecutions.add(executionData);
			const testChunk: StructuredChunk = {
				content: 'test chunk',
				type: 'item',
				metadata: {
					nodeName: 'testNode',
					nodeId: uuid(),
					runIndex: 0,
					itemIndex: 0,
					timestamp: Date.now(),
				},
			};
			activeExecutions.sendChunk(executionId, testChunk);
			expect(executionData.httpResponse.write).toHaveBeenCalledWith(
				JSON.stringify(testChunk) + '\n',
			);
		});

		test('should skip sending chunk to response if response is not set', async () => {
			const executionId = await activeExecutions.add(executionData);
			const testChunk: StructuredChunk = {
				content: 'test chunk',
				type: 'item',
				metadata: {
					nodeName: 'testNode',
					nodeId: uuid(),
					runIndex: 0,
					itemIndex: 0,
					timestamp: Date.now(),
				},
			};
			expect(() => activeExecutions.sendChunk(executionId, testChunk)).not.toThrow();
		});
	});

	describe('stopExecution', () => {
		let executionId: string;

		beforeEach(async () => {
			executionId = await activeExecutions.add(executionData);
			postExecutePromise = activeExecutions.getPostExecutePromise(executionId);

			activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
			activeExecutions.attachResponsePromise(executionId, responsePromise);
		});

		test('Should cancel ongoing executions', async () => {
			activeExecutions.stopExecution(executionId, new ManualExecutionCancelledError(executionId));

			expect(responsePromise.reject).toHaveBeenCalledWith(
				expect.any(ManualExecutionCancelledError),
			);
			expect(workflowExecution.cancel).toHaveBeenCalledTimes(1);
			await expect(postExecutePromise).rejects.toThrow(ManualExecutionCancelledError);
		});

		test('Should cancel waiting executions', async () => {
			activeExecutions.setStatus(executionId, 'waiting');
			activeExecutions.stopExecution(executionId, new ManualExecutionCancelledError(executionId));

			expect(responsePromise.reject).toHaveBeenCalledWith(
				expect.any(ManualExecutionCancelledError),
			);
			expect(workflowExecution.cancel).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		let newExecutionId1: string, newExecutionId2: string;
		let waitingExecutionId1: string, waitingExecutionId2: string;

		beforeEach(async () => {
			config.set('executions.mode', 'regular');

			executionRepository.createNewExecution.mockImplementation(async () =>
				randomInt(1000, 2000).toString(),
			);

			(sleep as jest.Mock).mockImplementation(() => {
				// @ts-expect-error private property
				activeExecutions.activeExecutions = {};
			});

			newExecutionId1 = await activeExecutions.add(executionData);
			activeExecutions.setStatus(newExecutionId1, 'new');
			activeExecutions.attachResponsePromise(newExecutionId1, responsePromise);

			newExecutionId2 = await activeExecutions.add(executionData);
			activeExecutions.setStatus(newExecutionId2, 'new');

			waitingExecutionId1 = await activeExecutions.add(executionData);
			activeExecutions.setStatus(waitingExecutionId1, 'waiting');
			activeExecutions.attachResponsePromise(waitingExecutionId1, responsePromise);

			waitingExecutionId2 = await activeExecutions.add(executionData);
			activeExecutions.setStatus(waitingExecutionId2, 'waiting');
		});

		test('Should cancel only executions with response-promises by default', async () => {
			const stopExecutionSpy = jest.spyOn(activeExecutions, 'stopExecution');

			expect(activeExecutions.getActiveExecutions()).toHaveLength(4);

			await activeExecutions.shutdown();

			expect(concurrencyControl.disable).toHaveBeenCalled();

			const removeAllCaptor = captor<string[]>();
			expect(concurrencyControl.removeAll).toHaveBeenCalledWith(removeAllCaptor);
			expect(removeAllCaptor.value.sort()).toEqual([newExecutionId1, waitingExecutionId1].sort());

			expect(stopExecutionSpy).toHaveBeenCalledTimes(2);
			expect(stopExecutionSpy).toHaveBeenCalledWith(
				newExecutionId1,
				expect.any(SystemShutdownExecutionCancelledError),
			);
			expect(stopExecutionSpy).toHaveBeenCalledWith(
				waitingExecutionId1,
				expect.any(SystemShutdownExecutionCancelledError),
			);
			expect(stopExecutionSpy).not.toHaveBeenCalledWith(newExecutionId2);
			expect(stopExecutionSpy).not.toHaveBeenCalledWith(waitingExecutionId2);

			await new Promise(setImmediate);
			// the other two executions aren't cancelled, but still removed from memory
			expect(activeExecutions.getActiveExecutions()).toHaveLength(0);
		});

		test('Should cancel all executions when cancelAll is true', async () => {
			const stopExecutionSpy = jest.spyOn(activeExecutions, 'stopExecution');

			expect(activeExecutions.getActiveExecutions()).toHaveLength(4);

			await activeExecutions.shutdown(true);

			expect(concurrencyControl.disable).toHaveBeenCalled();

			const removeAllCaptor = captor<string[]>();
			expect(concurrencyControl.removeAll).toHaveBeenCalledWith(removeAllCaptor);
			expect(removeAllCaptor.value.sort()).toEqual(
				[newExecutionId1, newExecutionId2, waitingExecutionId1, waitingExecutionId2].sort(),
			);

			expect(stopExecutionSpy).toHaveBeenCalledTimes(4);
			expect(stopExecutionSpy).toHaveBeenCalledWith(
				newExecutionId1,
				expect.any(SystemShutdownExecutionCancelledError),
			);
			expect(stopExecutionSpy).toHaveBeenCalledWith(
				waitingExecutionId1,
				expect.any(SystemShutdownExecutionCancelledError),
			);
			expect(stopExecutionSpy).toHaveBeenCalledWith(
				newExecutionId2,
				expect.any(SystemShutdownExecutionCancelledError),
			);
			expect(stopExecutionSpy).toHaveBeenCalledWith(
				waitingExecutionId2,
				expect.any(SystemShutdownExecutionCancelledError),
			);
		});
	});
});

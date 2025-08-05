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
import { ExecutionCancelledError, randomInt, sleep } from 'n8n-workflow';
import PCancelable from 'p-cancelable';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import config from '@/config';

jest.mock('n8n-workflow', () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return {
		...jest.requireActual('n8n-workflow'),
		sleep: jest.fn(),
	};
});

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
		activeExecutions = new ActiveExecutions(mock(), executionRepository, concurrencyControl);

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
		test('Should fail attaching execution to invalid executionId', () => {
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

		test('Should not try to resolve a post-execute promise for an inactive execution', () => {
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
			activeExecutions = new ActiveExecutions(logger, executionRepository, concurrencyControl);

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
			activeExecutions.stopExecution(executionId);

			expect(responsePromise.reject).toHaveBeenCalledWith(expect.any(ExecutionCancelledError));
			expect(workflowExecution.cancel).toHaveBeenCalledTimes(1);
			await expect(postExecutePromise).rejects.toThrow(ExecutionCancelledError);
		});

		test('Should cancel waiting executions', () => {
			activeExecutions.setStatus(executionId, 'waiting');
			activeExecutions.stopExecution(executionId);

			expect(responsePromise.reject).toHaveBeenCalledWith(expect.any(ExecutionCancelledError));
			expect(workflowExecution.cancel).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		let newExecutionId1: string, newExecutionId2: string;
		let waitingExecutionId1: string, waitingExecutionId2: string;

		beforeEach(async () => {
			config.set('executions.mode', 'regular');

			executionRepository.createNewExecution.mockResolvedValue(randomInt(1000, 2000).toString());

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
			expect(stopExecutionSpy).toHaveBeenCalledWith(newExecutionId1);
			expect(stopExecutionSpy).toHaveBeenCalledWith(waitingExecutionId1);
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
			expect(stopExecutionSpy).toHaveBeenCalledWith(newExecutionId1);
			expect(stopExecutionSpy).toHaveBeenCalledWith(waitingExecutionId1);
			expect(stopExecutionSpy).toHaveBeenCalledWith(newExecutionId2);
			expect(stopExecutionSpy).toHaveBeenCalledWith(waitingExecutionId2);
		});
	});

	describe('pause/resume execution control', () => {
		beforeEach(async () => {
			const executionData: IWorkflowExecutionDataProcess = {
				executionMode: 'manual',
				workflowData: {
					id: '123',
					name: 'Test Workflow',
					nodes: [
						{ name: 'node1', type: 'test', parameters: {}, position: [0, 0] },
						{ name: 'node2', type: 'test', parameters: {}, position: [100, 0] },
					],
					connections: {
						node1: { main: [[{ node: 'node2', type: 'main', index: 0 }]] },
					},
					active: true,
					settings: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
					resultData: {
						runData: {},
						lastNodeExecuted: 'node1',
					},
				},
			};

			await activeExecutions.add(executionData, FAKE_EXECUTION_ID);
		});

		describe('pauseExecution', () => {
			it('should pause a running execution', () => {
				// Set execution status to running
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'running');

				const result = activeExecutions.pauseExecution(FAKE_EXECUTION_ID);

				expect(result).toBe(true);
				expect(activeExecutions.getStatus(FAKE_EXECUTION_ID)).toBe('waiting');
			});

			it('should not pause an execution that is not running', () => {
				// Set execution status to something other than running
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'success');

				const result = activeExecutions.pauseExecution(FAKE_EXECUTION_ID);

				expect(result).toBe(false);
				expect(activeExecutions.getStatus(FAKE_EXECUTION_ID)).toBe('success');
			});

			it('should return false for non-existent execution', () => {
				const result = activeExecutions.pauseExecution('non-existent');

				expect(result).toBe(false);
			});
		});

		describe('resumeExecution', () => {
			it('should resume a paused execution', () => {
				// Set execution status to waiting (paused)
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'waiting');

				const result = activeExecutions.resumeExecution(FAKE_EXECUTION_ID);

				expect(result).toBe(true);
				expect(activeExecutions.getStatus(FAKE_EXECUTION_ID)).toBe('running');
			});

			it('should not resume an execution that is not waiting', () => {
				// Set execution status to running
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'running');

				const result = activeExecutions.resumeExecution(FAKE_EXECUTION_ID);

				expect(result).toBe(false);
				expect(activeExecutions.getStatus(FAKE_EXECUTION_ID)).toBe('running');
			});

			it('should return false for non-existent execution', () => {
				const result = activeExecutions.resumeExecution('non-existent');

				expect(result).toBe(false);
			});
		});

		describe('getExecutionStatus', () => {
			it('should return execution status and current node', () => {
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'running');

				const result = activeExecutions.getExecutionStatus(FAKE_EXECUTION_ID);

				expect(result).toEqual({
					status: 'running',
					currentNode: 'node1',
				});
			});

			it('should return null for non-existent execution', () => {
				const result = activeExecutions.getExecutionStatus('non-existent');

				expect(result).toBe(null);
			});
		});

		describe('canPause/canResume', () => {
			it('should return true for canPause when execution is running', () => {
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'running');

				expect(activeExecutions.canPause(FAKE_EXECUTION_ID)).toBe(true);
				expect(activeExecutions.canResume(FAKE_EXECUTION_ID)).toBe(false);
			});

			it('should return true for canResume when execution is waiting', () => {
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'waiting');

				expect(activeExecutions.canPause(FAKE_EXECUTION_ID)).toBe(false);
				expect(activeExecutions.canResume(FAKE_EXECUTION_ID)).toBe(true);
			});

			it('should return false for non-existent execution', () => {
				expect(activeExecutions.canPause('non-existent')).toBe(false);
				expect(activeExecutions.canResume('non-existent')).toBe(false);
			});
		});
	});

	describe('step execution control', () => {
		beforeEach(async () => {
			const executionData: IWorkflowExecutionDataProcess = {
				executionMode: 'manual',
				workflowData: {
					id: '123',
					name: 'Test Workflow',
					nodes: [
						{ name: 'start', type: 'start', parameters: {}, position: [0, 0] },
						{ name: 'middle', type: 'process', parameters: {}, position: [100, 0] },
						{ name: 'end', type: 'end', parameters: {}, position: [200, 0] },
					],
					connections: {
						start: { main: [[{ node: 'middle', type: 'main', index: 0 }]] },
						middle: { main: [[{ node: 'end', type: 'main', index: 0 }]] },
					},
					active: true,
					settings: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
					resultData: {
						runData: {},
						lastNodeExecuted: 'start',
					},
				},
			};

			await activeExecutions.add(executionData, FAKE_EXECUTION_ID);
		});

		describe('stepExecution', () => {
			it('should step through execution successfully', () => {
				const result = activeExecutions.stepExecution(FAKE_EXECUTION_ID, 1);

				expect(result.stepsExecuted).toBe(1);
				expect(result.currentNode).toBe('start');
				expect(result.nextNodes).toContain('middle');
			});

			it('should step with specific node names', () => {
				const result = activeExecutions.stepExecution(FAKE_EXECUTION_ID, 1, ['end']);

				expect(result.stepsExecuted).toBe(1);
				expect(result.nextNodes).toEqual(['end']);
			});

			it('should limit steps to available nodes', () => {
				const result = activeExecutions.stepExecution(FAKE_EXECUTION_ID, 10);

				expect(result.stepsExecuted).toBeLessThanOrEqual(2); // Only 2 nodes after start
			});

			it('should return empty result for non-existent execution', () => {
				const result = activeExecutions.stepExecution('non-existent');

				expect(result).toEqual({ stepsExecuted: 0, nextNodes: [] });
			});
		});

		describe('canStep', () => {
			it('should return true for running execution', () => {
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'running');

				expect(activeExecutions.canStep(FAKE_EXECUTION_ID)).toBe(true);
			});

			it('should return true for waiting execution', () => {
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'waiting');

				expect(activeExecutions.canStep(FAKE_EXECUTION_ID)).toBe(true);
			});

			it('should return false for finished execution', () => {
				activeExecutions.setStatus(FAKE_EXECUTION_ID, 'success');

				expect(activeExecutions.canStep(FAKE_EXECUTION_ID)).toBe(false);
			});

			it('should return false for non-existent execution', () => {
				expect(activeExecutions.canStep('non-existent')).toBe(false);
			});
		});
	});

	describe('node-level execution control', () => {
		beforeEach(async () => {
			const executionData: IWorkflowExecutionDataProcess = {
				executionMode: 'manual',
				workflowData: {
					id: '123',
					name: 'Test Workflow',
					nodes: [
						{ name: 'testNode', type: 'test', parameters: { param1: 'value1' }, position: [0, 0] },
					],
					connections: {},
					active: true,
					settings: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
					resultData: {
						runData: {
							testNode: [
								{
									startTime: Date.now(),
									executionIndex: 0,
									executionTime: 100,
									data: { main: [[{ json: { result: 'success' } }]] },
									source: [],
								},
							],
						},
					},
				},
			};

			await activeExecutions.add(executionData, FAKE_EXECUTION_ID);
		});

		describe('cancelNodeExecution', () => {
			it('should cancel node execution successfully', () => {
				const result = activeExecutions.cancelNodeExecution(FAKE_EXECUTION_ID, 'testNode');

				expect(result).toBe(true);

				const execution = activeExecutions.getExecutionOrFail(FAKE_EXECUTION_ID);
				const runData = execution.executionData.executionData.resultData.runData;
				expect(runData.testNode[0].error).toBeDefined();
				expect(runData.testNode[0].error.message).toBe('Node execution cancelled');
			});

			it('should return false for non-existent execution', () => {
				const result = activeExecutions.cancelNodeExecution('non-existent', 'testNode');

				expect(result).toBe(false);
			});
		});

		describe('skipNodeExecution', () => {
			it('should skip node execution with mock output', () => {
				const mockOutput = { result: 'mocked' };
				const result = activeExecutions.skipNodeExecution(FAKE_EXECUTION_ID, 'newNode', mockOutput);

				expect(result).toBe(true);

				const execution = activeExecutions.getExecutionOrFail(FAKE_EXECUTION_ID);
				const runData = execution.executionData.executionData.resultData.runData;
				expect(runData.newNode).toBeDefined();
				expect(runData.newNode[0].data.main[0][0].json).toEqual(mockOutput);
			});

			it('should skip node execution without mock output', () => {
				const result = activeExecutions.skipNodeExecution(FAKE_EXECUTION_ID, 'newNode');

				expect(result).toBe(true);

				const execution = activeExecutions.getExecutionOrFail(FAKE_EXECUTION_ID);
				const runData = execution.executionData.executionData.resultData.runData;
				expect(runData.newNode[0].data.main[0]).toEqual([]);
			});

			it('should return false for non-existent execution', () => {
				const result = activeExecutions.skipNodeExecution('non-existent', 'testNode');

				expect(result).toBe(false);
			});
		});

		describe('retryNodeExecution', () => {
			it('should retry node execution with modified parameters', () => {
				const modifiedParams = { param1: 'newValue' };
				const result = activeExecutions.retryNodeExecution(
					FAKE_EXECUTION_ID,
					'testNode',
					modifiedParams,
					true,
				);

				expect(result).toBe(true);

				const execution = activeExecutions.getExecutionOrFail(FAKE_EXECUTION_ID);
				const node = execution.executionData.workflowData.nodes.find((n) => n.name === 'testNode');
				expect(node?.parameters).toEqual({ param1: 'newValue' });

				// Should reset state when resetState is true
				const runData = execution.executionData.executionData.resultData.runData;
				expect(runData.testNode).toBeUndefined();
			});

			it('should retry node execution without resetting state', () => {
				const result = activeExecutions.retryNodeExecution(
					FAKE_EXECUTION_ID,
					'testNode',
					undefined,
					false,
				);

				expect(result).toBe(true);

				const execution = activeExecutions.getExecutionOrFail(FAKE_EXECUTION_ID);
				const runData = execution.executionData.executionData.resultData.runData;
				// Should not reset state when resetState is false
				expect(runData.testNode).toBeDefined();
			});

			it('should return false for non-existent execution', () => {
				const result = activeExecutions.retryNodeExecution('non-existent', 'testNode');

				expect(result).toBe(false);
			});
		});

		describe('getNodeExecutionStatus', () => {
			it('should return success status for completed node', () => {
				const result = activeExecutions.getNodeExecutionStatus(FAKE_EXECUTION_ID, 'testNode');

				expect(result).toEqual({
					status: 'success',
					executionTime: 100,
				});
			});

			it('should return error status for failed node', () => {
				// Add error to the node run data
				const execution = activeExecutions.getExecutionOrFail(FAKE_EXECUTION_ID);
				execution.executionData.executionData.resultData.runData.testNode[0].error = {
					message: 'Test error',
					name: 'TestError',
				};

				const result = activeExecutions.getNodeExecutionStatus(FAKE_EXECUTION_ID, 'testNode');

				expect(result).toEqual({
					status: 'error',
					executionTime: 100,
					error: {
						message: 'Test error',
						name: 'TestError',
					},
				});
			});

			it('should return pending status for unexecuted node', () => {
				const result = activeExecutions.getNodeExecutionStatus(
					FAKE_EXECUTION_ID,
					'nonExistentNode',
				);

				expect(result).toEqual({
					status: 'pending',
				});
			});

			it('should return null for non-existent execution', () => {
				const result = activeExecutions.getNodeExecutionStatus('non-existent', 'testNode');

				expect(result).toBe(null);
			});
		});
	});
});

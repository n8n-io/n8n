import { ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse } from '@n8n/db';

import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';
import { mockInstance } from '@n8n/backend-test-utils';

import { NodeTypes } from '../../node-types';
import { OwnershipService } from '../../services/ownership.service';
import { ChatExecutionManager } from '../chat-execution-manager';
import type { ChatMessage } from '../chat-service.types';

describe('ChatExecutionManager', () => {
	const executionRepository = mockInstance(ExecutionRepository);
	const workflowRunner = mockInstance(WorkflowRunner);
	const ownershipService = mockInstance(OwnershipService);
	const nodeTypes = mockInstance(NodeTypes);
	const chatExecutionManager = new ChatExecutionManager(
		executionRepository,
		workflowRunner,
		ownershipService,
		nodeTypes,
	);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it('should handle errors from getRunData gracefully', async () => {
		const execution = { id: '1', workflowData: {}, data: {} } as IExecutionResponse;
		const message = { sessionId: '123', action: 'sendMessage', chatInput: 'input' } as ChatMessage;

		jest
			.spyOn(chatExecutionManager as any, 'getRunData')
			.mockRejectedValue(new Error('Test error'));

		await expect(chatExecutionManager.runWorkflow(execution, message)).rejects.toThrow(
			'Test error',
		);
	});

	describe('runWorkflow', () => {
		it('should call WorkflowRunner.run with correct parameters', async () => {
			const execution = { id: '1', workflowData: {}, data: {} } as IExecutionResponse;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;
			const runData = { executionMode: 'manual', executionData: {}, workflowData: {} } as any;

			jest.spyOn(chatExecutionManager as any, 'getRunData').mockResolvedValue(runData);

			await chatExecutionManager.runWorkflow(execution, message);

			expect(workflowRunner.run).toHaveBeenCalledWith(runData, true, true, '1');
		});
	});

	describe('cancelExecution', () => {
		it('should update execution status to canceled if it is running', async () => {
			const executionId = '1';
			const execution = { id: executionId, status: 'running' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});

		it('should update execution status to canceled if it is waiting', async () => {
			const executionId = '2';
			const execution = { id: executionId, status: 'waiting' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});

		it('should update execution status to canceled if it is unknown', async () => {
			const executionId = '3';
			const execution = { id: executionId, status: 'unknown' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});

		it('should not update execution status if it is not running', async () => {
			const executionId = '1';
			const execution = { id: executionId, status: 'completed' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('findExecution', () => {
		it('should return undefined if execution does not exist', async () => {
			const executionId = 'non-existent';

			executionRepository.findSingleExecution.mockResolvedValue(undefined);

			const result = await chatExecutionManager.findExecution(executionId);

			expect(result).toBeUndefined;
		});

		it('should return execution data', async () => {
			const executionId = '1';
			const execution = { id: executionId } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			const result = await chatExecutionManager.findExecution(executionId);

			expect(result).toEqual(execution);
		});
	});

	describe('getRunData', () => {
		it('should call runNode with correct parameters and return runData', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { pinData: {} },
					executionData: { nodeExecutionStack: [{ data: { main: [[]] } }] },
					pushRef: 'pushRef',
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;
			const project = { id: 'projectId' };
			const nodeExecutionData = [[{ json: message }]];

			const getRunDataSpy = jest
				.spyOn(chatExecutionManager as any, 'runNode')
				.mockResolvedValue(nodeExecutionData);
			const getWorkflowProjectCachedSpy = jest
				.spyOn(ownershipService, 'getWorkflowProjectCached')
				.mockResolvedValue(project as any);

			const runData = await (chatExecutionManager as any).getRunData(execution, message);

			expect(getRunDataSpy).toHaveBeenCalledWith(execution, message);
			expect(getWorkflowProjectCachedSpy).toHaveBeenCalledWith('workflowId');
			expect(runData).toEqual({
				executionMode: 'manual',
				executionData: execution.data,
				pushRef: execution.data.pushRef,
				workflowData: execution.workflowData,
				pinData: execution.data.resultData.pinData,
				projectId: 'projectId',
			});
		});
	});

	describe('runNode', () => {
		it('should return null if node is not found', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: { nodeExecutionStack: [{ data: { main: [[]] } }] },
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;

			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			const workflow = { getNode: jest.fn().mockReturnValue(null) };
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);

			const result = await (chatExecutionManager as any).runNode(execution, message);

			expect(result).toBeNull();
		});

		it('should return null if executionData is undefined', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: { nodeExecutionStack: [] },
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;

			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			const workflow = { getNode: jest.fn().mockReturnValue({}) };
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);

			const result = await (chatExecutionManager as any).runNode(execution, message);

			expect(result).toBeNull();
		});

		it('should call nodeType.onMessage with correct parameters and return the result', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: { nodeExecutionStack: [{ data: { main: [[{}]] } }] },
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
				files: [],
			} as ChatMessage;
			const node = { type: 'testType', typeVersion: 1 };
			const nodeType = { onMessage: jest.fn().mockResolvedValue([[{ json: message }]]) };
			const workflow = {
				getNode: jest.fn().mockReturnValue(node),
				nodeTypes: { getByNameAndVersion: jest.fn().mockReturnValue(nodeType) },
			};
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			const result = await (chatExecutionManager as any).runNode(execution, message);

			expect(workflow.nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('testType', 1);
			expect(nodeType.onMessage).toHaveBeenCalled();
			expect(result).toEqual([[{ json: message }]]);
		});

		it('should return nodeExecutionData with sessionId, action and chatInput', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: { nodeExecutionStack: [{ data: { main: [[{}]] } }] },
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;
			const node = { type: 'testType', typeVersion: 1 };
			const nodeType = { onMessage: jest.fn().mockResolvedValue([[{ json: message }]]) };
			const workflow = {
				getNode: jest.fn().mockReturnValue(node),
				nodeTypes: { getByNameAndVersion: jest.fn().mockReturnValue(nodeType) },
			};
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			const result = await (chatExecutionManager as any).runNode(execution, message);

			expect(result).toEqual([[{ json: message }]]);
		});
	});
});

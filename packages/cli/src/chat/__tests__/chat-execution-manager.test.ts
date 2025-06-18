import { ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse } from '@n8n/db';

import { WorkflowRunner } from '@/workflow-runner';
import { mockInstance } from '@test/mocking';

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
		const message = { sessionId: '123', action: 'test', chatInput: 'input' } as ChatMessage;

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
			const message = { sessionId: '123', action: 'test', chatInput: 'input' } as ChatMessage;
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
});

import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { IExecutionDb } from '@n8n/db';
import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

import {
	ExecutionRedactionService,
	type ExecutionRedactionOptions,
} from '../execution-redaction.service';

describe('ExecutionRedactionService', () => {
	const logger = mockInstance(Logger);
	let service: ExecutionRedactionService;

	beforeEach(() => {
		service = new ExecutionRedactionService(logger);
	});

	describe('processExecution', () => {
		const createMockExecution = (): IExecutionDb => {
			// @ts-expect-error - Partial mock data for testing
			return {
				id: 'execution-123',
				mode: 'manual' as WorkflowExecuteMode,
				createdAt: new Date('2024-01-01'),
				startedAt: new Date('2024-01-01'),
				stoppedAt: new Date('2024-01-01'),
				workflowId: 'workflow-123',
				finished: true,
				retryOf: undefined,
				retrySuccessId: undefined,
				status: 'success' as ExecutionStatus,
				waitTill: null,
				storedAt: 'db',
				data: {
					version: 1,
					resultData: {
						runData: {},
					},
					executionData: {
						contextData: {},
						nodeExecutionStack: [],
						metadata: {},
						waitingExecution: {},
						waitingExecutionSource: null,
					},
				},
				workflowData: {
					id: 'workflow-123',
					name: 'Test Workflow',
					active: false,
					isArchived: false,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
					nodes: [],
					connections: {},
					settings: {},
					staticData: {},
					activeVersionId: null,
				},
			} as IExecutionDb;
		};

		it('should return unmodified execution when no options provided', async () => {
			const execution = createMockExecution();

			const result = await service.processExecution(execution);

			expect(result).toBe(execution);
			expect(result).toEqual(execution);
		});

		it('should return unmodified execution when applyRedaction is false', async () => {
			const execution = createMockExecution();
			const options: ExecutionRedactionOptions = {
				applyRedaction: false,
			};

			const result = await service.processExecution(execution, options);

			expect(result).toBe(execution);
			expect(result).toEqual(execution);
		});

		it('should return unmodified execution when applyRedaction is true (stub behavior)', async () => {
			const execution = createMockExecution();
			const options: ExecutionRedactionOptions = {
				applyRedaction: true,
			};

			const result = await service.processExecution(execution, options);

			// Stub implementation should return unmodified execution
			expect(result).toBe(execution);
			expect(result).toEqual(execution);
		});

		it('should return unmodified execution with context options', async () => {
			const execution = createMockExecution();
			const options: ExecutionRedactionOptions = {
				applyRedaction: true,
				context: {
					userId: 'user-123',
					projectId: 'project-123',
				},
			};

			const result = await service.processExecution(execution, options);

			expect(result).toBe(execution);
			expect(result).toEqual(execution);
		});

		it('should log debug message when processing execution', async () => {
			const execution = createMockExecution();
			const options: ExecutionRedactionOptions = {
				applyRedaction: true,
			};

			await service.processExecution(execution, options);

			expect(logger.debug).toHaveBeenCalledWith('Processing execution for redaction', {
				executionId: execution.id,
				options,
			});
		});
	});

	describe('canUserReveal', () => {
		it('should return false (stub behavior)', async () => {
			const userId = 'user-123';
			const executionId = 'execution-123';

			const result = await service.canUserReveal(userId, executionId);

			expect(result).toBe(false);
		});

		it('should log debug message when checking reveal permissions', async () => {
			const userId = 'user-123';
			const executionId = 'execution-123';

			await service.canUserReveal(userId, executionId);

			expect(logger.debug).toHaveBeenCalledWith('Checking reveal permissions', {
				userId,
				executionId,
			});
		});

		it('should return false for different user and execution combinations', async () => {
			const result1 = await service.canUserReveal('user-1', 'execution-1');
			const result2 = await service.canUserReveal('user-2', 'execution-2');

			expect(result1).toBe(false);
			expect(result2).toBe(false);
		});
	});
});

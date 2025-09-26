import { ActiveExecutions } from './active-executions';
import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { ConcurrencyControlService } from './concurrency/concurrency-control.service';
import { EventService } from './events/event.service';
import { ExecutionCancelledError } from 'n8n-workflow';

describe('ActiveExecutions', () => {
	let activeExecutions: ActiveExecutions;
	let mockLogger: jest.Mocked<Logger>;
	let mockExecutionRepository: jest.Mocked<ExecutionRepository>;
	let mockConcurrencyControl: jest.Mocked<ConcurrencyControlService>;
	let mockEventService: jest.Mocked<EventService>;

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as any;

		mockExecutionRepository = {
			createNewExecution: jest.fn(),
			setRunning: jest.fn(),
			updateExistingExecution: jest.fn(),
		} as any;

		mockConcurrencyControl = {
			throttle: jest.fn(),
			release: jest.fn(),
			disable: jest.fn(),
			removeAll: jest.fn(),
		} as any;

		mockEventService = {
			emit: jest.fn(),
		} as any;

		activeExecutions = new ActiveExecutions(
			mockLogger,
			mockExecutionRepository,
			mockConcurrencyControl,
			mockEventService,
		);
	});

	describe('stopExecution', () => {
		it('should prevent duplicate cancellations', () => {
			const executionId = 'test-execution-id';
			const mockExecution = {
				status: 'cancelled' as const,
				executionData: { workflowData: { id: 'workflow-1' } },
				startedAt: new Date(),
			};

			// @ts-ignore - accessing private property for testing
			activeExecutions['activeExecutions'][executionId] = mockExecution;

			activeExecutions.stopExecution(executionId, 'Test reason', 'Test');

			expect(mockLogger.debug).toHaveBeenCalledWith('Execution already terminated', {
				executionId,
				status: 'cancelled',
			});
		});

		it('should log cancellation with source tracking', () => {
			const executionId = 'test-execution-id';
			const mockExecution = {
				status: 'running' as const,
				executionData: { workflowData: { id: 'workflow-1' } },
				startedAt: new Date(Date.now() - 5000),
				responsePromise: { reject: jest.fn() },
				postExecutePromise: { reject: jest.fn() },
			};

			// @ts-ignore - accessing private property for testing
			activeExecutions['activeExecutions'][executionId] = mockExecution;

			activeExecutions.stopExecution(executionId, 'Test cancellation', 'Manual');

			expect(mockLogger.warn).toHaveBeenCalledWith('Stopping execution', {
				executionId,
				reason: 'Test cancellation',
				source: 'Manual',
				workflowId: 'workflow-1',
				durationMs: expect.any(Number),
			});

			expect(mockEventService.emit).toHaveBeenCalledWith('execution-cancelled', {
				executionId,
				reason: 'Test cancellation',
				source: 'Manual',
			});
		});

		it('should handle non-existent execution gracefully', () => {
			const executionId = 'non-existent-id';

			activeExecutions.stopExecution(executionId, 'Test reason', 'Test');

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Attempted to stop execution that does not exist',
				{
					executionId,
					reason: 'Test reason',
					source: 'Test',
				},
			);
		});
	});

	describe('has', () => {
		it('should use "in" operator for performance', () => {
			const executionId = 'test-execution-id';
			const mockExecution = { status: 'running' } as any;

			// @ts-ignore - accessing private property for testing
			activeExecutions['activeExecutions'][executionId] = mockExecution;

			expect(activeExecutions.has(executionId)).toBe(true);
			expect(activeExecutions.has('non-existent')).toBe(false);
		});
	});
});

import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

import { ExecutionEntity } from '../execution-entity';
import { WorkflowEntity } from '../workflow-entity';

describe('ExecutionEntity', () => {
	describe('Execution Status Management', () => {
		it('should handle all valid execution statuses', () => {
			const validStatuses: ExecutionStatus[] = [
				'new',
				'running',
				'success',
				'error',
				'canceled',
				'crashed',
				'waiting',
			];

			validStatuses.forEach((status) => {
				const execution = new ExecutionEntity();
				execution.status = status;
				execution.mode = 'manual';
				execution.finished = status === 'success';
				execution.createdAt = new Date();

				expect(execution.status).toBe(status);
			});
		});

		it('should handle status transitions correctly', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.createdAt = new Date();

			// New execution
			execution.status = 'new';
			execution.finished = false;
			expect(execution.status).toBe('new');
			expect(execution.finished).toBe(false);

			// Running execution
			execution.status = 'running';
			execution.finished = false;
			execution.startedAt = new Date();
			expect(execution.status).toBe('running');
			expect(execution.finished).toBe(false);
			expect(execution.startedAt).toBeInstanceOf(Date);

			// Successful completion
			execution.status = 'success';
			execution.finished = true;
			execution.stoppedAt = new Date();
			expect(execution.status).toBe('success');
			expect(execution.finished).toBe(true);
			expect(execution.stoppedAt).toBeInstanceOf(Date);
		});

		it('should handle error status correctly', () => {
			const execution = new ExecutionEntity();
			execution.status = 'error';
			execution.mode = 'manual';
			execution.finished = false; // Error executions are not considered "finished" in the old sense
			execution.createdAt = new Date();
			execution.startedAt = new Date();
			execution.stoppedAt = new Date();

			expect(execution.status).toBe('error');
			expect(execution.finished).toBe(false);
			expect(execution.stoppedAt).toBeInstanceOf(Date);
		});
	});

	describe('Execution Mode Handling', () => {
		it('should handle all valid execution modes', () => {
			const validModes: WorkflowExecuteMode[] = [
				'manual',
				'trigger',
				'webhook',
				'retry',
				'cli',
				'error',
			];

			validModes.forEach((mode) => {
				const execution = new ExecutionEntity();
				execution.mode = mode;
				execution.status = 'new';
				execution.finished = false;
				execution.createdAt = new Date();

				expect(execution.mode).toBe(mode);
			});
		});

		it('should handle manual execution mode', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();
			execution.startedAt = new Date();
			execution.stoppedAt = new Date();

			expect(execution.mode).toBe('manual');
		});

		it('should handle trigger execution mode', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'trigger';
			execution.status = 'running';
			execution.finished = false;
			execution.createdAt = new Date();
			execution.startedAt = new Date();

			expect(execution.mode).toBe('trigger');
		});

		it('should handle webhook execution mode', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'webhook';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();
			execution.startedAt = new Date();
			execution.stoppedAt = new Date();

			expect(execution.mode).toBe('webhook');
		});
	});

	describe('Execution Timing Columns', () => {
		it('should handle createdAt timestamp correctly', () => {
			const now = new Date();
			const execution = new ExecutionEntity();
			execution.createdAt = now;
			execution.mode = 'manual';
			execution.status = 'new';
			execution.finished = false;

			expect(execution.createdAt).toBe(now);
			expect(execution.createdAt).toBeInstanceOf(Date);
		});

		it('should handle startedAt being null for queued executions', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'trigger';
			execution.status = 'new';
			execution.finished = false;
			execution.createdAt = new Date();
			execution.startedAt = null;

			expect(execution.startedAt).toBeNull();
		});

		it('should handle startedAt when execution begins', () => {
			const now = new Date();
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'running';
			execution.finished = false;
			execution.createdAt = new Date(now.getTime() - 1000); // 1 second ago
			execution.startedAt = now;

			expect(execution.startedAt).toBe(now);
			expect(execution.startedAt).toBeInstanceOf(Date);
			expect(execution.startedAt?.getTime()).toBeGreaterThan(execution.createdAt.getTime());
		});

		it('should handle stoppedAt when execution completes', () => {
			const createdAt = new Date();
			const startedAt = new Date(createdAt.getTime() + 1000);
			const stoppedAt = new Date(startedAt.getTime() + 5000);

			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = createdAt;
			execution.startedAt = startedAt;
			execution.stoppedAt = stoppedAt;

			expect(execution.stoppedAt).toBe(stoppedAt);
			expect(execution.stoppedAt.getTime()).toBeGreaterThan(execution.startedAt?.getTime() ?? 0);
			expect(execution.stoppedAt.getTime()).toBeGreaterThan(execution.createdAt.getTime());
		});

		it('should handle timing sequence for full execution lifecycle', () => {
			const execution = new ExecutionEntity();
			const baseTime = new Date('2023-12-01T10:00:00Z');

			// Execution created
			execution.createdAt = baseTime;
			execution.mode = 'trigger';
			execution.status = 'new';
			execution.finished = false;
			execution.startedAt = null;

			// Execution starts
			execution.status = 'running';
			execution.startedAt = new Date(baseTime.getTime() + 5000); // 5 seconds later

			// Execution completes
			execution.status = 'success';
			execution.finished = true;
			execution.stoppedAt = new Date(baseTime.getTime() + 15000); // 15 seconds after creation

			expect(execution.createdAt.getTime()).toBeLessThan(
				execution.startedAt?.getTime() ?? Infinity,
			);
			expect(execution.startedAt?.getTime() ?? 0).toBeLessThan(execution.stoppedAt.getTime());
		});
	});

	describe('Retry Mechanism', () => {
		it('should handle null retry fields for non-retry executions', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();
			// retryOf and retrySuccessId are nullable fields

			expect(execution.retryOf).toBeUndefined();
			expect(execution.retrySuccessId).toBeUndefined();
		});

		it('should handle retry relationships correctly', () => {
			const originalExecutionId = 'execution-123';
			const retryExecutionId = 'execution-456';
			const successfulRetryId = 'execution-789';

			// Original failed execution
			const originalExecution = new ExecutionEntity();
			originalExecution.id = originalExecutionId;
			originalExecution.mode = 'trigger';
			originalExecution.status = 'error';
			originalExecution.finished = false;
			originalExecution.createdAt = new Date();
			originalExecution.retrySuccessId = successfulRetryId;

			// Failed retry attempt
			const retryExecution = new ExecutionEntity();
			retryExecution.id = retryExecutionId;
			retryExecution.mode = 'retry';
			retryExecution.status = 'error';
			retryExecution.finished = false;
			retryExecution.createdAt = new Date();
			retryExecution.retryOf = originalExecutionId;

			// Successful retry
			const successfulRetry = new ExecutionEntity();
			successfulRetry.id = successfulRetryId;
			successfulRetry.mode = 'retry';
			successfulRetry.status = 'success';
			successfulRetry.finished = true;
			successfulRetry.createdAt = new Date();
			successfulRetry.retryOf = originalExecutionId;

			expect(originalExecution.retrySuccessId).toBe(successfulRetryId);
			expect(retryExecution.retryOf).toBe(originalExecutionId);
			expect(successfulRetry.retryOf).toBe(originalExecutionId);
		});

		it('should handle multiple retry attempts', () => {
			const originalId = 'original-123';
			const retryIds = ['retry-1', 'retry-2', 'retry-3'];

			retryIds.forEach((retryId, index) => {
				const execution = new ExecutionEntity();
				execution.id = retryId;
				execution.mode = 'retry';
				execution.status = index === retryIds.length - 1 ? 'success' : 'error';
				execution.finished = index === retryIds.length - 1;
				execution.createdAt = new Date();
				execution.retryOf = originalId;

				expect(execution.retryOf).toBe(originalId);
				expect(execution.mode).toBe('retry');
			});
		});
	});

	describe('Wait Till Functionality', () => {
		it('should handle null waitTill for immediate executions', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();
			execution.waitTill = null;

			expect(execution.waitTill).toBeNull();
		});

		it('should handle scheduled executions with waitTill', () => {
			const waitTime = new Date('2024-01-01T10:00:00Z');
			const execution = new ExecutionEntity();
			execution.mode = 'trigger';
			execution.status = 'waiting';
			execution.finished = false;
			execution.createdAt = new Date();
			execution.waitTill = waitTime;

			expect(execution.waitTill).toBe(waitTime);
			expect(execution.status).toBe('waiting');
		});

		it('should handle waitTill in the past for delayed executions', () => {
			const pastTime = new Date('2023-01-01T10:00:00Z');
			const execution = new ExecutionEntity();
			execution.mode = 'trigger';
			execution.status = 'running';
			execution.finished = false;
			execution.createdAt = new Date();
			execution.waitTill = pastTime;

			expect(execution.waitTill).toBe(pastTime);
			expect(execution.waitTill.getTime()).toBeLessThan(Date.now());
		});
	});

	describe('Workflow Association', () => {
		it('should handle workflowId correctly', () => {
			const workflowId = 'workflow-abc-123';
			const execution = new ExecutionEntity();
			execution.workflowId = workflowId;
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();

			expect(execution.workflowId).toBe(workflowId);
		});

		it('should handle null workflowId for orphaned executions', () => {
			const execution = new ExecutionEntity();
			// workflowId is nullable
			execution.mode = 'manual';
			execution.status = 'error';
			execution.finished = false;
			execution.createdAt = new Date();

			expect(execution.workflowId).toBeUndefined();
		});

		it('should associate with WorkflowEntity correctly', () => {
			const workflow = new WorkflowEntity();
			workflow.id = 'workflow-123';
			workflow.name = 'Test Workflow';
			workflow.active = true;
			workflow.nodes = [];
			workflow.connections = {};

			const execution = new ExecutionEntity();
			execution.workflowId = workflow.id;
			execution.workflow = workflow;
			execution.mode = 'trigger';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();

			expect(execution.workflowId).toBe(workflow.id);
			expect(execution.workflow).toBe(workflow);
			expect(execution.workflow.name).toBe('Test Workflow');
		});
	});

	describe('Soft Delete Functionality', () => {
		it('should handle null deletedAt for active executions', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();
			// deletedAt is nullable

			expect(execution.deletedAt).toBeUndefined();
		});

		it('should handle deletedAt for soft-deleted executions', () => {
			const deletedTime = new Date();
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();
			execution.deletedAt = deletedTime;

			expect(execution.deletedAt).toBe(deletedTime);
			expect(execution.deletedAt).toBeInstanceOf(Date);
		});
	});

	describe('Database Relationships', () => {
		it('should initialize relationship fields correctly', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'new';
			execution.finished = false;
			execution.createdAt = new Date();
			execution.metadata = [];

			expect(execution.metadata).toEqual([]);
		});

		it('should handle executionData relationship', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();

			// ExecutionData would be loaded separately via relationship
			expect(execution.executionData).toBeUndefined();
		});

		it('should handle optional annotation relationship', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();

			expect(execution.annotation).toBeUndefined();
		});
	});

	describe('Business Logic Validation', () => {
		it('should validate execution lifecycle states', () => {
			const execution = new ExecutionEntity();

			// New execution state
			execution.status = 'new';
			execution.finished = false;
			execution.mode = 'trigger';
			execution.createdAt = new Date();
			execution.startedAt = null;
			// stoppedAt is initially null/undefined for new executions

			expect(execution.status).toBe('new');
			expect(execution.finished).toBe(false);
			expect(execution.startedAt).toBeNull();

			// Running execution state
			execution.status = 'running';
			execution.startedAt = new Date();

			expect(execution.status).toBe('running');
			expect(execution.startedAt).toBeInstanceOf(Date);

			// Completed execution state
			execution.status = 'success';
			execution.finished = true;
			execution.stoppedAt = new Date();

			expect(execution.status).toBe('success');
			expect(execution.finished).toBe(true);
			expect(execution.stoppedAt).toBeInstanceOf(Date);
		});

		it('should handle deprecated finished field correctly', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.createdAt = new Date();

			// For success status
			execution.status = 'success';
			execution.finished = true;
			expect(execution.finished).toBe(true);

			// For error status (not considered "finished" in old sense)
			execution.status = 'error';
			execution.finished = false;
			expect(execution.finished).toBe(false);

			// For canceled status
			execution.status = 'canceled';
			execution.finished = false;
			expect(execution.finished).toBe(false);
		});

		it('should handle execution cancellation correctly', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'running';
			execution.finished = false;
			execution.createdAt = new Date();
			execution.startedAt = new Date();

			// Cancel the execution
			execution.status = 'canceled';
			execution.stoppedAt = new Date();

			expect(execution.status).toBe('canceled');
			expect(execution.finished).toBe(false);
			expect(execution.stoppedAt).toBeInstanceOf(Date);
		});

		it('should handle crashed execution state', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'trigger';
			execution.status = 'running';
			execution.finished = false;
			execution.createdAt = new Date();
			execution.startedAt = new Date();

			// Execution crashes
			execution.status = 'crashed';
			execution.stoppedAt = new Date();

			expect(execution.status).toBe('crashed');
			expect(execution.finished).toBe(false);
			expect(execution.stoppedAt).toBeInstanceOf(Date);
		});
	});

	describe('ID String Transformer', () => {
		it('should handle string ID conversion', () => {
			const execution = new ExecutionEntity();
			execution.id = '12345';
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();

			expect(execution.id).toBe('12345');
			expect(typeof execution.id).toBe('string');
		});

		it('should handle numeric ID values through transformer', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'manual';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();

			// The idStringifier transformer would handle this conversion
			// In practice, the database would provide a number that gets stringified
			execution.id = '999999';
			expect(execution.id).toBe('999999');
		});
	});

	describe('Real-world Execution Scenarios', () => {
		it('should handle webhook execution with timing', () => {
			const execution = new ExecutionEntity();
			const baseTime = new Date('2023-12-01T14:30:00Z');

			execution.mode = 'webhook';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = baseTime;
			execution.startedAt = new Date(baseTime.getTime() + 100); // 100ms later
			execution.stoppedAt = new Date(baseTime.getTime() + 2500); // 2.5 seconds total
			execution.workflowId = 'webhook-workflow-123';

			expect(execution.mode).toBe('webhook');
			expect(execution.status).toBe('success');
			expect(execution.stoppedAt.getTime() - execution.createdAt.getTime()).toBe(2500);
		});

		it('should handle scheduled execution with wait time', () => {
			const execution = new ExecutionEntity();
			const createdTime = new Date('2023-12-01T14:30:00Z');
			const scheduledTime = new Date('2023-12-01T15:00:00Z');

			execution.mode = 'trigger';
			execution.status = 'waiting';
			execution.finished = false;
			execution.createdAt = createdTime;
			execution.startedAt = null;
			execution.waitTill = scheduledTime;
			execution.workflowId = 'scheduled-workflow-456';

			expect(execution.status).toBe('waiting');
			expect(execution.waitTill?.getTime()).toBeGreaterThan(execution.createdAt.getTime());
			expect(execution.startedAt).toBeNull();
		});

		it('should handle failed execution with retry success', () => {
			const originalExecution = new ExecutionEntity();
			originalExecution.id = 'original-exec-123';
			originalExecution.mode = 'trigger';
			originalExecution.status = 'error';
			originalExecution.finished = false;
			originalExecution.createdAt = new Date('2023-12-01T14:30:00Z');
			originalExecution.startedAt = new Date('2023-12-01T14:30:01Z');
			originalExecution.stoppedAt = new Date('2023-12-01T14:30:05Z');
			originalExecution.retrySuccessId = 'retry-exec-456';

			const retryExecution = new ExecutionEntity();
			retryExecution.id = 'retry-exec-456';
			retryExecution.mode = 'retry';
			retryExecution.status = 'success';
			retryExecution.finished = true;
			retryExecution.createdAt = new Date('2023-12-01T14:35:00Z');
			retryExecution.startedAt = new Date('2023-12-01T14:35:01Z');
			retryExecution.stoppedAt = new Date('2023-12-01T14:35:03Z');
			retryExecution.retryOf = 'original-exec-123';

			expect(originalExecution.retrySuccessId).toBe(retryExecution.id);
			expect(retryExecution.retryOf).toBe(originalExecution.id);
			expect(retryExecution.status).toBe('success');
			expect(originalExecution.status).toBe('error');
		});
	});

	describe('Edge Cases and Data Integrity', () => {
		it('should handle execution without workflow association', () => {
			const execution = new ExecutionEntity();
			execution.mode = 'cli';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = new Date();
			// workflowId can be null for CLI executions

			expect(execution.workflowId).toBeUndefined();
			expect(execution.mode).toBe('cli');
		});

		it('should handle long-running execution scenarios', () => {
			const execution = new ExecutionEntity();
			const startTime = new Date('2023-12-01T10:00:00Z');
			const endTime = new Date('2023-12-01T18:00:00Z'); // 8 hours later

			execution.mode = 'trigger';
			execution.status = 'success';
			execution.finished = true;
			execution.createdAt = startTime;
			execution.startedAt = new Date(startTime.getTime() + 1000);
			execution.stoppedAt = endTime;

			const duration = execution.stoppedAt.getTime() - (execution.startedAt?.getTime() ?? 0);
			expect(duration).toBe(8 * 60 * 60 * 1000 - 1000); // 8 hours minus 1 second
		});

		it('should handle execution status without explicit finished flag management', () => {
			const statuses: Array<{ status: ExecutionStatus; expectedFinished: boolean }> = [
				{ status: 'new', expectedFinished: false },
				{ status: 'running', expectedFinished: false },
				{ status: 'waiting', expectedFinished: false },
				{ status: 'success', expectedFinished: true },
				{ status: 'error', expectedFinished: false },
				{ status: 'canceled', expectedFinished: false },
				{ status: 'crashed', expectedFinished: false },
			];

			statuses.forEach(({ status, expectedFinished }) => {
				const execution = new ExecutionEntity();
				execution.mode = 'manual';
				execution.status = status;
				execution.finished = expectedFinished;
				execution.createdAt = new Date();

				expect(execution.status).toBe(status);
				expect(execution.finished).toBe(expectedFinished);
			});
		});
	});
});

import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest, IExecutionResponse } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { WorkflowsController } from '../workflows.controller';

import type { ExecutionService } from '@/executions/execution.service';
import type { ProjectService } from '@/services/project.service.ee';

describe('WorkflowsController', () => {
	const controller = Object.create(WorkflowsController.prototype);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();
	const projectService = mock<ProjectService>();
	const logger = mock<Logger>();

	beforeEach(() => {
		controller.projectService = projectService;
		controller.logger = logger;
		vi.clearAllMocks();
	});

	describe('getLastSuccessfulExecution', () => {
		it('should return the last successful execution', async () => {
			/**
			 * Arrange
			 */
			const workflowId = 'workflow-123';
			const mockExecution = mock<IExecutionResponse>({
				id: 'execution-456',
				workflowId,
				mode: 'trigger',
				startedAt: new Date('2025-01-15T10:00:00Z'),
				stoppedAt: new Date('2025-01-15T10:05:00Z'),
				status: 'success',
			});
			const executionService = mock<ExecutionService>();
			executionService.getLastSuccessfulExecution.mockResolvedValue(mockExecution);
			controller.executionService = executionService;

			/**
			 * Act
			 */
			const result = await controller.getLastSuccessfulExecution(req, res, workflowId);

			/**
			 * Assert
			 */
			expect(result).toEqual(mockExecution);
			expect(executionService.getLastSuccessfulExecution).toHaveBeenCalledWith(
				workflowId,
				req.user,
				undefined,
			);
		});

		it('should return null when no successful execution exists', async () => {
			/**
			 * Arrange
			 */
			const workflowId = 'workflow-no-success';
			const executionService = mock<ExecutionService>();
			executionService.getLastSuccessfulExecution.mockResolvedValue(undefined);
			controller.executionService = executionService;

			/**
			 * Act
			 */
			const result = await controller.getLastSuccessfulExecution(req, res, workflowId);

			/**
			 * Assert
			 */
			expect(result).toBeNull();
			expect(executionService.getLastSuccessfulExecution).toHaveBeenCalledWith(
				workflowId,
				req.user,
				undefined,
			);
		});
	});
});

import type { Mock } from 'vitest';
import type { ImportWorkflowFromUrlDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfBlockedIpError } from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import type { AuthenticatedRequest, IExecutionResponse } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { WorkflowsController } from '../workflows.controller';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { ExecutionService } from '@/executions/execution.service';
import type { ProjectService } from '@/services/project.service.ee';

describe('WorkflowsController', () => {
	const controller = Object.create(WorkflowsController.prototype);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();
	const projectService = mock<ProjectService>();
	const logger = mock<Logger>();
	const ssrfConfig = { enabled: false } as SsrfProtectionConfig;
	const ssrfProtectionService = mock<SsrfProtectionService>();
	const httpClient = mock<HttpRequestClient>();
	const outboundHttp = mock<OutboundHttp>();
	const requestMock = httpClient.request as Mock;

	beforeEach(() => {
		controller.projectService = projectService;
		controller.logger = logger;
		controller.ssrfConfig = ssrfConfig;
		controller.ssrfProtectionService = ssrfProtectionService;
		controller.outboundHttp = outboundHttp;
		ssrfConfig.enabled = false;
		vi.clearAllMocks();
		outboundHttp.requests.mockReturnValue(httpClient);
	});

	describe('getFromUrl', () => {
		const projectId = 'project-123';

		describe('should return workflow data', () => {
			it('when the URL points to a valid JSON file and user has permissions', async () => {
				const mockWorkflowData = {
					nodes: [],
					connections: {},
				};

				projectService.getProjectWithScope.mockResolvedValue({} as any);
				requestMock.mockResolvedValue(mockWorkflowData);

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};
				const result = await controller.getFromUrl(req, res, query);

				expect(result).toEqual(mockWorkflowData);
				expect(projectService.getProjectWithScope).toHaveBeenCalledWith(req.user, projectId, [
					'workflow:create',
				]);
				expect(requestMock).toHaveBeenCalledWith({ method: 'GET', url: query.url });
			});
		});

		describe('should throw a ForbiddenError', () => {
			it('when the user does not have permissions to create workflows in the project', async () => {
				projectService.getProjectWithScope.mockResolvedValue(null);

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(ForbiddenError);
				expect(projectService.getProjectWithScope).toHaveBeenCalledWith(req.user, projectId, [
					'workflow:create',
				]);
				expect(requestMock).not.toHaveBeenCalled();
			});
		});

		describe('should throw a BadRequestError', () => {
			beforeEach(() => {
				projectService.getProjectWithScope.mockResolvedValue({} as any);
			});

			it('when the URL does not point to a valid JSON file', async () => {
				requestMock.mockRejectedValue(new Error('Network Error'));

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/invalid.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(BadRequestError);
				expect(requestMock).toHaveBeenCalledWith({ method: 'GET', url: query.url });
			});

			it('when the data is not a valid n8n workflow JSON', async () => {
				const invalidWorkflowData = {
					nodes: 'not an array',
					connections: 'not an object',
				};

				requestMock.mockResolvedValue(invalidWorkflowData);

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/invalid.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(BadRequestError);
				expect(requestMock).toHaveBeenCalledWith({ method: 'GET', url: query.url });
			});

			it('when the data is missing required fields', async () => {
				const incompleteWorkflowData = {
					nodes: [],
					// Missing connections field
				};

				requestMock.mockResolvedValue(incompleteWorkflowData);

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(BadRequestError);
				expect(requestMock).toHaveBeenCalledWith({ method: 'GET', url: query.url });
			});
		});

		describe('when URL protection is enabled', () => {
			beforeEach(() => {
				ssrfConfig.enabled = true;
				projectService.getProjectWithScope.mockResolvedValue({} as any);
			});

			it('should create the client with the SSRF protection service', async () => {
				const mockWorkflowData = { nodes: [], connections: {} };
				requestMock.mockResolvedValue(mockWorkflowData);

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};
				await controller.getFromUrl(req, res, query);

				expect(outboundHttp.requests).toHaveBeenCalledWith({ ssrf: ssrfProtectionService });
				expect(requestMock).toHaveBeenCalledWith({ method: 'GET', url: query.url });
			});

			it('should propagate blocked errors surfaced by the client', async () => {
				requestMock.mockRejectedValue(new SsrfBlockedIpError('127.0.0.1'));

				const query: ImportWorkflowFromUrlDto = {
					url: 'http://127.0.0.1/workflow.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(SsrfBlockedIpError);
			});

			it('should propagate blocked errors buried in a redirect cause chain', async () => {
				const ssrfError = new SsrfBlockedIpError('10.0.0.1');
				const axiosError = new Error('Request failed', {
					cause: new Error('Redirected request failed', { cause: ssrfError }),
				});
				requestMock.mockRejectedValue(axiosError);

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(SsrfBlockedIpError);
			});
		});

		describe('when URL protection is disabled', () => {
			it('should create the client with SSRF disabled', async () => {
				ssrfConfig.enabled = false;
				projectService.getProjectWithScope.mockResolvedValue({} as any);
				const mockWorkflowData = { nodes: [], connections: {} };
				requestMock.mockResolvedValue(mockWorkflowData);

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};
				await controller.getFromUrl(req, res, query);

				expect(outboundHttp.requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
			});
		});
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

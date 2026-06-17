import type { ImportWorkflowFromUrlDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { SsrfProtectionService } from '@n8n/backend-network';
import { SsrfBlockedIpError } from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import type {
	AuthenticatedRequest,
	IExecutionResponse,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import axios from 'axios';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { createResultError, createResultOk } from 'n8n-workflow';

import { WorkflowsController } from '../workflows.controller';
import type { WorkflowExecutionService } from '../workflow-execution.service';
import type { WorkflowRequest } from '../workflow.request';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { AuthService } from '@/auth/auth.service';
import type { EventService } from '@/events/event.service';
import type { ExecutionService } from '@/executions/execution.service';
import type { ProjectService } from '@/services/project.service.ee';

jest.mock('axios');

describe('WorkflowsController', () => {
	const controller = Object.create(WorkflowsController.prototype);
	const axiosMock = axios.get as jest.Mock;
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();
	const projectService = mock<ProjectService>();
	const logger = mock<Logger>();
	const ssrfConfig = { enabled: false } as SsrfProtectionConfig;
	const ssrfProtectionService = mock<SsrfProtectionService>();

	beforeEach(() => {
		controller.projectService = projectService;
		controller.logger = logger;
		controller.ssrfConfig = ssrfConfig;
		controller.ssrfProtectionService = ssrfProtectionService;
		ssrfConfig.enabled = false;
		jest.clearAllMocks();
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
				axiosMock.mockResolvedValue({ data: mockWorkflowData });

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};
				const result = await controller.getFromUrl(req, res, query);

				expect(result).toEqual(mockWorkflowData);
				expect(projectService.getProjectWithScope).toHaveBeenCalledWith(req.user, projectId, [
					'workflow:create',
				]);
				expect(axiosMock).toHaveBeenCalledWith(query.url);
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
				expect(axiosMock).not.toHaveBeenCalled();
			});
		});

		describe('should throw a BadRequestError', () => {
			beforeEach(() => {
				projectService.getProjectWithScope.mockResolvedValue({} as any);
			});

			it('when the URL does not point to a valid JSON file', async () => {
				axiosMock.mockRejectedValue(new Error('Network Error'));

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/invalid.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(BadRequestError);
				expect(axiosMock).toHaveBeenCalledWith(query.url);
			});

			it('when the data is not a valid n8n workflow JSON', async () => {
				const invalidWorkflowData = {
					nodes: 'not an array',
					connections: 'not an object',
				};

				axiosMock.mockResolvedValue({ data: invalidWorkflowData });

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/invalid.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(BadRequestError);
				expect(axiosMock).toHaveBeenCalledWith(query.url);
			});

			it('when the data is missing required fields', async () => {
				const incompleteWorkflowData = {
					nodes: [],
					// Missing connections field
				};

				axiosMock.mockResolvedValue({ data: incompleteWorkflowData });

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(BadRequestError);
				expect(axiosMock).toHaveBeenCalledWith(query.url);
			});
		});

		describe('when URL protection is enabled', () => {
			const mockLookup = jest.fn();

			beforeEach(() => {
				ssrfConfig.enabled = true;
				projectService.getProjectWithScope.mockResolvedValue({} as any);
				ssrfProtectionService.validateUrl.mockResolvedValue(createResultOk(undefined));
				ssrfProtectionService.createSecureLookup.mockReturnValue(mockLookup);
			});

			it('should validate URL before fetching', async () => {
				const mockWorkflowData = { nodes: [], connections: {} };
				axiosMock.mockResolvedValue({ data: mockWorkflowData });

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};
				await controller.getFromUrl(req, res, query);

				expect(ssrfProtectionService.validateUrl).toHaveBeenCalledWith(query.url);
				expect(ssrfProtectionService.createSecureLookup).toHaveBeenCalled();
				expect(axiosMock).toHaveBeenCalledWith(
					query.url,
					expect.objectContaining({
						lookup: mockLookup,
						beforeRedirect: expect.any(Function),
					}),
				);
			});

			it('should reject requests to restricted addresses', async () => {
				ssrfProtectionService.validateUrl.mockResolvedValue(
					createResultError(new SsrfBlockedIpError('127.0.0.1')),
				);

				const query: ImportWorkflowFromUrlDto = {
					url: 'http://127.0.0.1/workflow.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(SsrfBlockedIpError);
				expect(axiosMock).not.toHaveBeenCalled();
			});

			it('should propagate blocked errors from redirects', async () => {
				const ssrfError = new SsrfBlockedIpError('10.0.0.1');
				const axiosError = new Error('Request failed', {
					cause: new Error('Redirected request failed', { cause: ssrfError }),
				});
				axiosMock.mockRejectedValue(axiosError);

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};

				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(SsrfBlockedIpError);
			});
		});

		describe('when URL protection is disabled', () => {
			it('should not validate URL', async () => {
				ssrfConfig.enabled = false;
				projectService.getProjectWithScope.mockResolvedValue({} as any);
				const mockWorkflowData = { nodes: [], connections: {} };
				axiosMock.mockResolvedValue({ data: mockWorkflowData });

				const query: ImportWorkflowFromUrlDto = {
					url: 'https://example.com/workflow.json',
					projectId,
				};
				await controller.getFromUrl(req, res, query);

				expect(ssrfProtectionService.validateUrl).not.toHaveBeenCalled();
				expect(ssrfProtectionService.createSecureLookup).not.toHaveBeenCalled();
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

	describe('runManually', () => {
		// Reproduces ADO-5328: with N8N_WORKFLOWS_AUTOSAVE_DISABLED=true, the editor
		// no longer force-saves before executing, so the canvas can hold nodes that
		// were never persisted. The endpoint executes the DB workflow only, so a
		// destination node that exists only on the canvas is never seen.
		it('should execute the canvas workflow when the destination node was added after the last save (ADO-5328)', async () => {
			/**
			 * Arrange
			 */
			const workflowId = 'workflow-autosave-off';

			const triggerNode = {
				id: 'trigger-1',
				name: 'When clicking "Execute workflow"',
				type: 'n8n-nodes-base.manualTrigger',
				parameters: {},
				typeVersion: 1,
				position: [0, 0] as [number, number],
			};
			const unsavedNode = {
				id: 'unsaved-1',
				name: 'NewNode',
				type: 'n8n-nodes-base.noOp',
				parameters: {},
				typeVersion: 1,
				position: [200, 0] as [number, number],
			};

			// DB copy reflects the last save — NewNode is NOT here.
			const dbWorkflow = {
				id: workflowId,
				nodes: [triggerNode],
				connections: {},
			} as unknown as WorkflowEntity;

			const workflowRepository = mock<WorkflowRepository>();
			workflowRepository.get.mockResolvedValue(dbWorkflow);
			controller.workflowRepository = workflowRepository;

			const workflowExecutionService = mock<WorkflowExecutionService>();
			workflowExecutionService.executeManually.mockResolvedValue({
				executionId: 'execution-1',
			});
			controller.workflowExecutionService = workflowExecutionService;

			const authService = mock<AuthService>();
			authService.getCookieToken.mockReturnValue('n8n-auth-cookie');
			controller.authService = authService;

			const eventService = mock<EventService>();
			controller.eventService = eventService;

			// The editor sends the live canvas state — including the unsaved node
			// and a destinationNode pointing to it (the user clicked "Execute step").
			const canvasWorkflow = {
				id: workflowId,
				nodes: [triggerNode, unsavedNode],
				connections: {
					[triggerNode.name]: {
						main: [[{ node: unsavedNode.name, type: 'main', index: 0 }]],
					},
				},
			};

			// `workflowData` is sent by the editor (see useRunWorkflow.ts) even
			// though it's not part of `ManualRunPayload` — cast loosely to keep
			// this test honest about the real wire payload.
			const runReq = mock<WorkflowRequest.ManualRun>({
				params: { workflowId },
				headers: {},
			});
			runReq.body = {
				workflowData: canvasWorkflow,
				destinationNode: { nodeName: unsavedNode.name, mode: 'inclusive' },
			} as unknown as WorkflowRequest.ManualRun['body'];

			/**
			 * Act
			 */
			await controller.runManually(runReq, undefined);

			/**
			 * Assert — executeManually should receive a workflow definition that
			 * actually contains the destination node from the canvas. Without that,
			 * the execution downstream throws "Could not find a node named ...".
			 */
			expect(workflowExecutionService.executeManually).toHaveBeenCalledTimes(1);
			const [workflowPassedToExecute] = workflowExecutionService.executeManually.mock.calls[0];
			expect(workflowPassedToExecute.nodes).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: unsavedNode.name })]),
			);
		});
	});
});

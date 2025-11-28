import type { ImportWorkflowFromUrlDto } from '@n8n/api-types';
import type { AuthenticatedRequest, IExecutionResponse, CredentialsEntity, User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import axios from 'axios';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ExecutionService } from '@/executions/execution.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import type { License } from '@/license';
import type { WorkflowRequest } from '../workflow.request';
import type { ProjectService } from '@/services/project.service.ee';

import { WorkflowsController } from '../workflows.controller';

jest.mock('axios');

describe('WorkflowsController', () => {
	const controller = Object.create(WorkflowsController.prototype);
	const axiosMock = axios.get as jest.Mock;
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();
	const projectService = mock<ProjectService>();

	beforeEach(() => {
		controller.projectService = projectService;
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
			expect(executionService.getLastSuccessfulExecution).toHaveBeenCalledWith(workflowId);
		});

		it('should throw NotFoundError when no successful execution exists', async () => {
			/**
			 * Arrange
			 */
			const workflowId = 'workflow-no-success';
			const executionService = mock<ExecutionService>();
			executionService.getLastSuccessfulExecution.mockResolvedValue(undefined);
			controller.executionService = executionService;

			/**
			 * Act & Assert
			 */
			await expect(controller.getLastSuccessfulExecution(req, res, workflowId)).rejects.toThrow(
				NotFoundError,
			);
			expect(executionService.getLastSuccessfulExecution).toHaveBeenCalledWith(workflowId);
		});
	});

	describe('create', () => {
		describe('credential retrieval for workflow creation', () => {
			it('should include global credentials when checking credential permissions', async () => {
				/**
				 * Arrange
				 */
				const mockUser = mock<User>({ id: 'user-123' });
				const mockRequest = mock<WorkflowRequest.Create>({
					user: mockUser,
					body: {
						name: 'Test Workflow',
						nodes: [],
						connections: {},
					},
				});

				const mockGlobalCredential = mock<CredentialsEntity>({
					id: 'global-cred-123',
					name: 'Global Credential',
					type: 'httpBasicAuth',
					isGlobal: true,
				});

				const mockPersonalCredential = mock<CredentialsEntity>({
					id: 'personal-cred-456',
					name: 'Personal Credential',
					type: 'httpBasicAuth',
					isGlobal: false,
				});

				const credentialsService = mock<CredentialsService>();
				const enterpriseWorkflowService = mock<EnterpriseWorkflowService>();
				const license = mock<License>();

				credentialsService.getMany.mockResolvedValue([
					mockGlobalCredential,
					mockPersonalCredential,
				]);
				license.isSharingEnabled.mockReturnValue(true);

				// Stop execution after credential validation
				enterpriseWorkflowService.validateCredentialPermissionsToUser.mockImplementation(() => {
					throw new BadRequestError('Stopping execution for test');
				});

				controller.credentialsService = credentialsService;
				controller.enterpriseWorkflowService = enterpriseWorkflowService;
				controller.license = license;
				controller.externalHooks = mock();
				controller.externalHooks.run = jest.fn().mockResolvedValue(undefined);
				controller.tagRepository = mock();
				controller.globalConfig = { tags: { disabled: true } };

				/**
				 * Act & Assert
				 */
				await expect(controller.create(mockRequest)).rejects.toThrow(BadRequestError);

				/**
				 * Assert - Verify credentials were fetched with includeGlobal: true
				 */
				expect(credentialsService.getMany).toHaveBeenCalledWith(mockUser, {
					includeGlobal: true,
				});
				expect(enterpriseWorkflowService.validateCredentialPermissionsToUser).toHaveBeenCalledWith(
					expect.any(WorkflowEntity),
					[mockGlobalCredential, mockPersonalCredential],
				);
			});

			it('should throw BadRequestError when user lacks access to credentials in workflow', async () => {
				/**
				 * Arrange
				 */
				const mockUser = mock<User>({ id: 'user-123' });
				const mockRequest = mock<WorkflowRequest.Create>({
					user: mockUser,
					body: {
						name: 'Test Workflow',
						nodes: [],
						connections: {},
					},
				});

				const mockGlobalCredential = mock<CredentialsEntity>({
					id: 'global-cred-123',
					name: 'Global Credential',
					type: 'httpBasicAuth',
					isGlobal: true,
				});

				const credentialsService = mock<CredentialsService>();
				const enterpriseWorkflowService = mock<EnterpriseWorkflowService>();
				const license = mock<License>();

				credentialsService.getMany.mockResolvedValue([mockGlobalCredential]);
				license.isSharingEnabled.mockReturnValue(true);
				enterpriseWorkflowService.validateCredentialPermissionsToUser.mockImplementation(() => {
					throw new Error('User does not have access');
				});

				controller.credentialsService = credentialsService;
				controller.enterpriseWorkflowService = enterpriseWorkflowService;
				controller.license = license;
				controller.externalHooks = mock();
				controller.externalHooks.run = jest.fn().mockResolvedValue(undefined);
				controller.tagRepository = mock();
				controller.globalConfig = { tags: { disabled: true } };

				/**
				 * Act & Assert
				 */
				await expect(controller.create(mockRequest)).rejects.toThrow(BadRequestError);
				await expect(controller.create(mockRequest)).rejects.toThrow(
					'The workflow you are trying to save contains credentials that are not shared with you',
				);

				expect(credentialsService.getMany).toHaveBeenCalledWith(mockUser, {
					includeGlobal: true,
				});
			});
		});
	});
});

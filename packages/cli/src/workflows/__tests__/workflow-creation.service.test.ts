import type { LicenseState } from '@n8n/backend-common';
import type { User, ProjectRepository } from '@n8n/db';
import { Project, WorkflowEntity } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { ProjectService } from '@/services/project.service.ee';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { NodeTypes } from '@/node-types';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

jest.mock('@/permissions.ee/check-access');
jest.mock('@/workflow-helpers');
jest.mock('@/generic-helpers');

describe('WorkflowCreationService', () => {
	const userHasScopesMock = jest.mocked(userHasScopes);

	let workflowCreationService: WorkflowCreationService;
	let credentialsServiceMock: MockProxy<CredentialsService>;
	let enterpriseWorkflowServiceMock: MockProxy<EnterpriseWorkflowService>;
	let licenseStateMock: MockProxy<LicenseState>;
	let projectServiceMock: MockProxy<ProjectService>;
	let projectRepositoryMock: MockProxy<ProjectRepository>;

	beforeEach(() => {
		jest.clearAllMocks();

		credentialsServiceMock = mock<CredentialsService>();
		enterpriseWorkflowServiceMock = mock<EnterpriseWorkflowService>();
		licenseStateMock = mock<LicenseState>();
		projectServiceMock = mock<ProjectService>();
		projectRepositoryMock = mock<ProjectRepository>();

		workflowCreationService = new WorkflowCreationService(
			mock(), // logger
			mock(), // sharedWorkflowRepository
			mock(), // tagService
			mock(), // workflowHistoryService
			mock(), // externalHooks
			projectServiceMock,
			mock(), // eventService
			mock(), // globalConfig
			mock(), // workflowFinderService
			licenseStateMock,
			projectRepositoryMock,
			mock(), // tagRepository
			credentialsServiceMock,
			mock(), // folderService
			enterpriseWorkflowServiceMock,
			mock<NodeTypes>(),
		);
	});

	function setupTransactionMocks(
		options: {
			personalProjectId?: string;
		} = {},
	) {
		const transactionManager = {
			save: jest.fn().mockRejectedValue(new Error('Stopping for test')),
			exists: jest.fn().mockResolvedValue(true),
		};

		const nestedTransaction = jest.fn(
			async (cb: (em: unknown) => Promise<void>) => await cb(transactionManager),
		);
		const managerExists = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);

		Object.defineProperty(projectRepositoryMock, 'manager', {
			value: {
				transaction: nestedTransaction,
				exists: managerExists,
			},
			writable: true,
		});

		if (options.personalProjectId) {
			projectRepositoryMock.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: options.personalProjectId,
			} as never);
		}

		return { transactionManager, nestedTransaction, managerExists };
	}

	describe('createWorkflow()', () => {
		it('should throw BadRequestError for invalid workflow structure', async () => {
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			jest.mocked(WorkflowHelpers.validateWorkflowStructure).mockImplementationOnce(() => {
				throw new BadRequestError('Workflow structure is invalid. nodes[0].type: Required');
			});

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [{ name: 'Start', position: [0, 0], parameters: {} }] as never;
			newWorkflow.connections = {};

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
			).rejects.toThrow('Workflow structure is invalid.');
		});

		describe('credential retrieval', () => {
			it('should include global credentials when checking credential permissions', async () => {
				/**
				 * Arrange
				 */
				credentialsServiceMock.getMany.mockResolvedValue([]);
				licenseStateMock.isSharingLicensed.mockReturnValue(true);
				enterpriseWorkflowServiceMock.validateCredentialPermissionsToUser.mockImplementation(() => {
					throw new Error('Stopping for test');
				});
				projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);

				const user = mock<User>();
				const newWorkflow = new WorkflowEntity();

				/**
				 * Act
				 */
				await expect(
					workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
				).rejects.toThrow();

				/**
				 * Assert
				 */
				expect(credentialsServiceMock.getMany).toHaveBeenCalledWith(user, {
					includeGlobal: true,
				});
			});
		});

		it('should throw BadRequestError when user lacks access to credentials in workflow', async () => {
			/**
			 * Arrange
			 */
			credentialsServiceMock.getMany.mockResolvedValue([]);
			licenseStateMock.isSharingLicensed.mockReturnValue(true);
			enterpriseWorkflowServiceMock.validateCredentialPermissionsToUser.mockImplementation(() => {
				throw new Error('User does not have access');
			});
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			/**
			 * Act & Assert
			 */
			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
			).rejects.toThrow(
				'The workflow you are trying to save contains credentials that are not shared with you',
			);
		});
	});

	describe('redaction policy scope enforcement on create', () => {
		it('should strip redactionPolicy when user lacks scope', async () => {
			/**
			 * Arrange
			 */
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(true);
			userHasScopesMock.mockResolvedValue(false);
			const { transactionManager } = setupTransactionMocks();

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { redactionPolicy: 'all' };

			/**
			 * Act
			 */
			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
			).rejects.toThrow('Stopping for test');

			/**
			 * Assert
			 */
			expect(userHasScopesMock).toHaveBeenCalledWith(
				user,
				['workflow:updateRedactionSetting'],
				false,
				{ projectId: 'project-1' },
			);

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBeUndefined();
		});

		it('should preserve redactionPolicy when user has scope', async () => {
			/**
			 * Arrange
			 */
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(true);
			userHasScopesMock.mockResolvedValue(true);
			const { transactionManager } = setupTransactionMocks();

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { redactionPolicy: 'all' };

			/**
			 * Act
			 */
			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
			).rejects.toThrow('Stopping for test');

			/**
			 * Assert
			 */
			expect(userHasScopesMock).toHaveBeenCalledWith(
				user,
				['workflow:updateRedactionSetting'],
				false,
				{ projectId: 'project-1' },
			);

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('all');
		});

		it('should resolve projectId from personal project when projectId not provided', async () => {
			/**
			 * Arrange
			 */
			projectServiceMock.getProjectWithScope.mockResolvedValue({
				id: 'personal-project-789',
			} as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(true);
			userHasScopesMock.mockResolvedValue(false);
			setupTransactionMocks({ personalProjectId: 'personal-project-789' });

			const user = mock<User>({ id: 'user-456' });
			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { redactionPolicy: 'all' };

			/**
			 * Act
			 */
			await expect(workflowCreationService.createWorkflow(user, newWorkflow, {})).rejects.toThrow(
				'Stopping for test',
			);

			/**
			 * Assert
			 */
			expect(projectRepositoryMock.getPersonalProjectForUserOrFail).toHaveBeenCalledWith(
				'user-456',
				undefined,
			);
			expect(userHasScopesMock).toHaveBeenCalledWith(
				user,
				['workflow:updateRedactionSetting'],
				false,
				{ projectId: 'personal-project-789' },
			);
		});

		it('should not check scope when settings has no redactionPolicy', async () => {
			/**
			 * Arrange
			 */
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			setupTransactionMocks();

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { executionOrder: 'v1' }; // No redactionPolicy

			/**
			 * Act
			 */
			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, { projectId: 'project-1' }),
			).rejects.toThrow('Stopping for test');

			/**
			 * Assert
			 */
			expect(userHasScopesMock).not.toHaveBeenCalled();
		});
	});

	describe('when transactionManager is supplied', () => {
		it('uses it for scope checks and persist without opening a nested transaction', async () => {
			const { transactionManager, nestedTransaction } = setupTransactionMocks();
			projectServiceMock.getProjectWithScope.mockResolvedValue({
				id: 'project-1',
				type: 'personal',
			} as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, {
					projectId: 'project-1',
					transactionManager: transactionManager as never,
				}),
			).rejects.toThrow('Stopping for test');

			expect(projectServiceMock.getProjectWithScope).toHaveBeenCalledWith(
				user,
				'project-1',
				['workflow:create'],
				transactionManager,
			);
			expect(nestedTransaction).not.toHaveBeenCalled();
			expect(transactionManager.save).toHaveBeenCalled();
		});
	});

	describe('when user cannot create in the target project', () => {
		it('throws NotFoundError when the target project does not exist', async () => {
			projectServiceMock.getProjectWithScope.mockResolvedValue(null);
			const { nestedTransaction: nestedTransactionSpy, managerExists } = setupTransactionMocks();
			managerExists.mockResolvedValue(false);

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, {
					projectId: 'missing-project',
				}),
			).rejects.toBeInstanceOf(NotFoundError);

			expect(managerExists).toHaveBeenCalledWith(Project, {
				where: { id: 'missing-project' },
			});
			expect(nestedTransactionSpy).not.toHaveBeenCalled();
		});

		it('throws BadRequestError when the project exists but user lacks workflow:create there', async () => {
			projectServiceMock.getProjectWithScope.mockResolvedValue(null);
			setupTransactionMocks();

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, {
					projectId: 'other-project',
				}),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('throws ForbiddenError for the same case when publicApi is true', async () => {
			projectServiceMock.getProjectWithScope.mockResolvedValue(null);
			setupTransactionMocks();

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, {
					projectId: 'other-project',
					publicApi: true,
				}),
			).rejects.toBeInstanceOf(ForbiddenError);
		});
	});
});

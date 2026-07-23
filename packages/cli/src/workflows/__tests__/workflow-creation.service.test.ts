import type { LicenseState } from '@n8n/backend-common';
import type { ProjectRepository, User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import type { NodeTypes } from '@/node-types';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { ProjectService } from '@/services/project.service.ee';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

vi.mock('@/permissions.ee/check-access');
vi.mock('@/workflow-helpers');
vi.mock('@/generic-helpers');

describe('WorkflowCreationService', () => {
	const userHasScopesMock = vi.mocked(userHasScopes);

	let workflowCreationService: WorkflowCreationService;
	let credentialsServiceMock: MockProxy<CredentialsService>;
	let enterpriseWorkflowServiceMock: MockProxy<EnterpriseWorkflowService>;
	let licenseStateMock: MockProxy<LicenseState>;
	let projectServiceMock: MockProxy<ProjectService>;
	let projectRepositoryMock: MockProxy<ProjectRepository>;
	let workflowValidationServiceMock: MockProxy<WorkflowValidationService>;
	let instanceRedactionEnforcementServiceMock: MockProxy<InstanceRedactionEnforcementService>;
	let workflowHistoryServiceMock: MockProxy<WorkflowHistoryService>;

	beforeEach(() => {
		vi.clearAllMocks();

		credentialsServiceMock = mock<CredentialsService>();
		enterpriseWorkflowServiceMock = mock<EnterpriseWorkflowService>();
		licenseStateMock = mock<LicenseState>();
		projectServiceMock = mock<ProjectService>();
		projectRepositoryMock = mock<ProjectRepository>();
		workflowValidationServiceMock = mock<WorkflowValidationService>();
		instanceRedactionEnforcementServiceMock = mock<InstanceRedactionEnforcementService>();
		workflowHistoryServiceMock = mock<WorkflowHistoryService>();
		workflowValidationServiceMock.validateCredentialNodeRestrictions.mockReturnValue({
			isValid: true,
		});

		// Default: no active floor. Tests opt into a floor explicitly.
		instanceRedactionEnforcementServiceMock.get.mockResolvedValue('off');

		workflowCreationService = new WorkflowCreationService(
			mock(), // logger
			mock(), // sharedWorkflowRepository
			mock(), // tagService
			workflowHistoryServiceMock,
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
			workflowValidationServiceMock,
			instanceRedactionEnforcementServiceMock,
		);
	});

	function setupTransactionMocks(
		options: {
			personalProjectId?: string;
		} = {},
	) {
		const transactionManager = {
			save: vi.fn().mockRejectedValue(new Error('Stopping for test')),
		};

		Object.defineProperty(projectRepositoryMock, 'manager', {
			value: {
				transaction: vi.fn(
					async (cb: (em: unknown) => Promise<void>) => await cb(transactionManager),
				),
			},
			writable: true,
		});

		if (options.personalProjectId) {
			projectRepositoryMock.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: options.personalProjectId,
			} as never);
		}

		return { transactionManager };
	}

	describe('createWorkflow()', () => {
		it('should throw BadRequestError for invalid workflow structure', async () => {
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			vi.mocked(WorkflowHelpers.validateWorkflowStructure).mockImplementationOnce(() => {
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

		it('passes source and version metadata to the initial history version', async () => {
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(false);
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			const { transactionManager } = setupTransactionMocks();
			transactionManager.save.mockImplementation(async (entity: unknown) => entity);
			workflowHistoryServiceMock.saveVersion.mockRejectedValue(new Error('Stopping for test'));

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.name = 'Test';
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, {
					projectId: 'project-1',
					source: 'n8n-mcp',
					versionName: 'Initial Slack alert workflow',
					versionDescription: 'Posts to #ops when the webhook fires',
				}),
			).rejects.toThrow('Stopping for test');

			expect(workflowHistoryServiceMock.saveVersion).toHaveBeenCalledWith(
				user,
				newWorkflow,
				newWorkflow.id,
				false,
				'n8n-mcp',
				transactionManager,
				{
					name: 'Initial Slack alert workflow',
					description: 'Posts to #ops when the webhook fires',
				},
			);
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
		it('should check enableRedaction and strip redactionPolicy when user lacks it', async () => {
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
				['workflow:enableRedaction'],
				false,
				{ projectId: 'project-1' },
				transactionManager,
			);

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBeUndefined();
		});

		it('should check enableRedaction and preserve redactionPolicy when user has it', async () => {
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
				['workflow:enableRedaction'],
				false,
				{ projectId: 'project-1' },
				transactionManager,
			);

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('all');
		});

		it('should not check scope when redactionPolicy is none (default, harmless)', async () => {
			/**
			 * Arrange
			 */
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(true);
			const { transactionManager } = setupTransactionMocks();

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { redactionPolicy: 'none' };

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

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('none');
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
			const { transactionManager } = setupTransactionMocks({
				personalProjectId: 'personal-project-789',
			});

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
			);
			expect(userHasScopesMock).toHaveBeenCalledWith(
				user,
				['workflow:enableRedaction'],
				false,
				{ projectId: 'personal-project-789' },
				transactionManager,
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

	describe('redaction policy floor enforcement on create', () => {
		beforeEach(() => {
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(true);
		});

		it('seeds non-manual when floor is production-only and no policy is provided', async () => {
			userHasScopesMock.mockResolvedValue(true);
			instanceRedactionEnforcementServiceMock.get.mockResolvedValue('production');
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { executionOrder: 'v1' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('non-manual');
			expect(savedEntity.settings?.executionOrder).toBe('v1');
		});

		it('seeds all when floor is production+manual and no policy is provided', async () => {
			userHasScopesMock.mockResolvedValue(true);
			instanceRedactionEnforcementServiceMock.get.mockResolvedValue('all');
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { executionOrder: 'v1' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('all');
			expect(savedEntity.settings?.executionOrder).toBe('v1');
		});

		it('does not seed when floor is not enforced', async () => {
			userHasScopesMock.mockResolvedValue(true);
			instanceRedactionEnforcementServiceMock.get.mockResolvedValue('off');
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { executionOrder: 'v1' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBeUndefined();
			expect(savedEntity.settings?.executionOrder).toBe('v1');
		});

		it('does not seed when user lacks workflow:enableRedaction', async () => {
			userHasScopesMock.mockResolvedValue(false);
			instanceRedactionEnforcementServiceMock.get.mockResolvedValue('production');
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { executionOrder: 'v1' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBeUndefined();
			expect(savedEntity.settings?.executionOrder).toBe('v1');
		});

		it('does not seed when the effective floor is off', async () => {
			userHasScopesMock.mockResolvedValue(true);
			instanceRedactionEnforcementServiceMock.get.mockResolvedValue('off');
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { executionOrder: 'v1' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBeUndefined();
			expect(savedEntity.settings?.executionOrder).toBe('v1');
		});

		it('clamps a none policy up to non-manual when the floor requires production redaction', async () => {
			userHasScopesMock.mockResolvedValue(true);
			instanceRedactionEnforcementServiceMock.get.mockResolvedValue('production');
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { redactionPolicy: 'none' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('non-manual');
		});

		it('replaces a manual-only policy with the floor seed when the floor requires production redaction', async () => {
			userHasScopesMock.mockResolvedValue(true);
			instanceRedactionEnforcementServiceMock.get.mockResolvedValue('production');
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { redactionPolicy: 'manual-only' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('non-manual');
		});

		it('accepts a stricter-than-floor policy unchanged', async () => {
			userHasScopesMock.mockResolvedValue(true);
			instanceRedactionEnforcementServiceMock.get.mockResolvedValue('production');
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { redactionPolicy: 'all' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBe('all');
		});

		it('drops redactionPolicy when the instance lacks the data-redaction license', async () => {
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(false);
			const { transactionManager } = setupTransactionMocks();

			const newWorkflow = new WorkflowEntity();
			newWorkflow.settings = { redactionPolicy: 'all' };

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
					projectId: 'project-1',
				}),
			).rejects.toThrow('Stopping for test');

			expect(instanceRedactionEnforcementServiceMock.get).not.toHaveBeenCalled();
			const savedEntity = transactionManager.save.mock.calls[0][0] as WorkflowEntity;
			expect(savedEntity.settings?.redactionPolicy).toBeUndefined();
		});
	});

	describe('when user cannot create in the target project', () => {
		it('throws NotFoundError when the target project does not exist', async () => {
			projectServiceMock.getProjectWithScope.mockResolvedValue(null);
			projectRepositoryMock.exists.mockResolvedValue(false);
			setupTransactionMocks();

			const user = mock<User>();
			const newWorkflow = new WorkflowEntity();
			newWorkflow.nodes = [];
			newWorkflow.connections = {};

			await expect(
				workflowCreationService.createWorkflow(user, newWorkflow, {
					projectId: 'missing-project',
				}),
			).rejects.toBeInstanceOf(NotFoundError);

			expect(projectRepositoryMock.exists).toHaveBeenCalledWith({
				where: { id: 'missing-project' },
			});
		});

		it('throws BadRequestError when the project exists but user lacks workflow:create there', async () => {
			projectServiceMock.getProjectWithScope.mockResolvedValue(null);
			projectRepositoryMock.exists.mockResolvedValue(true);
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
			projectRepositoryMock.exists.mockResolvedValue(true);
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

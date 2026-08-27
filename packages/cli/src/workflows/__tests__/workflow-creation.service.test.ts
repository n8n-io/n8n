import type { Logger, LicenseState } from '@n8n/backend-common';
import type { Folder, Project, ProjectRepository, Role, User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ExternalHooks, WorkflowLifecycleHookActor } from '@/external-hooks';
import type { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import type { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import type { NodeTypes } from '@/node-types';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { FolderService } from '@/services/folder.service';
import * as WorkflowHelpers from '@/workflow-helpers';
import type { WorkflowHookContextService } from '@/workflow-hook-context.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

vi.mock('@/permissions.ee/check-access');
vi.mock('@/workflow-helpers');
vi.mock('@/generic-helpers');

describe('WorkflowCreationService', () => {
	const userHasScopesMock = vi.mocked(userHasScopes);

	let workflowCreationService: WorkflowCreationService;
	let credentialsFinderServiceMock: MockProxy<CredentialsFinderService>;
	let enterpriseWorkflowServiceMock: MockProxy<EnterpriseWorkflowService>;
	let licenseStateMock: MockProxy<LicenseState>;
	let projectServiceMock: MockProxy<ProjectService>;
	let projectRepositoryMock: MockProxy<ProjectRepository>;
	let folderServiceMock: MockProxy<FolderService>;
	let workflowValidationServiceMock: MockProxy<WorkflowValidationService>;
	let instanceRedactionEnforcementServiceMock: MockProxy<InstanceRedactionEnforcementService>;
	let workflowHistoryServiceMock: MockProxy<WorkflowHistoryService>;
	let externalHooksMock: MockProxy<ExternalHooks>;
	let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
	let workflowHookContextServiceMock: MockProxy<WorkflowHookContextService>;
	let mcpSettingsService: MockProxy<McpSettingsService>;
	let policyEnforcementServiceMock: MockProxy<PolicyEnforcementService>;
	let loggerMock: MockProxy<Logger>;

	beforeEach(() => {
		vi.clearAllMocks();

		loggerMock = mock<Logger>();
		credentialsFinderServiceMock = mock<CredentialsFinderService>();
		enterpriseWorkflowServiceMock = mock<EnterpriseWorkflowService>();
		licenseStateMock = mock<LicenseState>();
		projectServiceMock = mock<ProjectService>();
		projectRepositoryMock = mock<ProjectRepository>();
		folderServiceMock = mock<FolderService>();
		workflowValidationServiceMock = mock<WorkflowValidationService>();
		instanceRedactionEnforcementServiceMock = mock<InstanceRedactionEnforcementService>();
		workflowHistoryServiceMock = mock<WorkflowHistoryService>();
		externalHooksMock = mock<ExternalHooks>();
		workflowFinderServiceMock = mock<WorkflowFinderService>();
		workflowHookContextServiceMock = mock<WorkflowHookContextService>();
		workflowValidationServiceMock.validateCredentialNodeRestrictions.mockReturnValue({
			isValid: true,
		});
		enterpriseWorkflowServiceMock.collectCredentialReferences.mockReturnValue({
			ids: new Set(),
			hasUnresolved: false,
		});

		// Default: no active floor. Tests opt into a floor explicitly.
		instanceRedactionEnforcementServiceMock.get.mockResolvedValue('off');

		mcpSettingsService = mock<McpSettingsService>();

		// Stands in for the dummy always-allow check: with no policy backend registered the
		// real service clears every save, so this is what production does by default.
		policyEnforcementServiceMock = mock<PolicyEnforcementService>();
		policyEnforcementServiceMock.enforceWorkflowSave.mockResolvedValue(mock());

		workflowCreationService = new WorkflowCreationService(
			loggerMock,
			mock(), // sharedWorkflowRepository
			mock(), // tagService
			workflowHistoryServiceMock,
			externalHooksMock, // externalHooks
			projectServiceMock,
			mock(), // eventService
			mock(), // globalConfig
			workflowFinderServiceMock, // workflowFinderService
			licenseStateMock,
			projectRepositoryMock,
			mock(), // tagRepository
			credentialsFinderServiceMock,
			folderServiceMock,
			enterpriseWorkflowServiceMock,
			mock<NodeTypes>(),
			workflowValidationServiceMock,
			instanceRedactionEnforcementServiceMock,
			workflowHookContextServiceMock,
			mcpSettingsService,
			policyEnforcementServiceMock,
		);
	});

	describe('prepareBatchContext()', () => {
		it('resolves import-wide reads once and folders by unique id', async () => {
			const user = mock<User>();
			const project = { id: 'project-1' } as Project;
			const folder = { id: 'folder-1', homeProject: project } as Folder;
			projectServiceMock.getProjectWithScope.mockResolvedValue(project);
			folderServiceMock.getFoldersByIds.mockResolvedValue([folder]);
			credentialsFinderServiceMock.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());
			mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(false);
			enterpriseWorkflowServiceMock.collectCredentialReferences.mockReturnValue({
				ids: new Set(['source-credential']),
				hasUnresolved: false,
			});

			const context = await workflowCreationService.prepareBatchContext(
				user,
				project.id,
				['folder-1', 'folder-1'],
				[makeWorkflow(), makeWorkflow()],
				new Map([['source-credential', 'target-credential']]),
			);

			expect(projectServiceMock.getProjectWithScope).toHaveBeenCalledTimes(1);
			expect(folderServiceMock.getFoldersByIds).toHaveBeenCalledWith(['folder-1']);
			expect(mcpSettingsService.getAutoExposeNewWorkflows).toHaveBeenCalledTimes(1);
			expect(credentialsFinderServiceMock.findCredentialIdsWithScopeForUser).toHaveBeenCalledTimes(
				1,
			);
			expect(credentialsFinderServiceMock.findCredentialIdsWithScopeForUser).toHaveBeenCalledWith(
				[],
				user,
				['credential:read'],
			);
			expect(context.allowedCredentialIds).toEqual(new Set(['target-credential']));
		});
	});

	function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
		const workflow = new WorkflowEntity();
		workflow.name = 'Test';
		workflow.nodes = [];
		workflow.connections = {};
		Object.assign(workflow, overrides);
		return workflow;
	}

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
			it('should fetch only credential ids referenced by the workflow', async () => {
				/**
				 * Arrange
				 */
				enterpriseWorkflowServiceMock.collectCredentialReferences.mockReturnValue({
					ids: new Set(['credential-1']),
					hasUnresolved: false,
				});
				credentialsFinderServiceMock.findCredentialIdsWithScopeForUser.mockResolvedValue(
					new Set(['credential-1']),
				);
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
				expect(credentialsFinderServiceMock.findCredentialIdsWithScopeForUser).toHaveBeenCalledWith(
					['credential-1'],
					user,
					['credential:read'],
				);
			});

			it('should skip credential lookup when the workflow references none', async () => {
				licenseStateMock.isSharingLicensed.mockReturnValue(true);
				enterpriseWorkflowServiceMock.validateCredentialPermissionsToUser.mockImplementation(() => {
					throw new Error('Stopping for test');
				});
				projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);

				await expect(
					workflowCreationService.createWorkflow(mock<User>(), new WorkflowEntity(), {
						projectId: 'project-1',
					}),
				).rejects.toThrow();

				expect(
					credentialsFinderServiceMock.findCredentialIdsWithScopeForUser,
				).not.toHaveBeenCalled();
			});

			it('should reject unresolved credential references', async () => {
				const user = mock<User>();
				const newWorkflow = new WorkflowEntity();
				licenseStateMock.isSharingLicensed.mockReturnValue(true);
				projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
				enterpriseWorkflowServiceMock.collectCredentialReferences.mockReturnValue({
					ids: new Set(['credential-1']),
					hasUnresolved: true,
				});
				credentialsFinderServiceMock.findCredentialIdsWithScopeForUser.mockResolvedValue(
					new Set(['credential-1']),
				);
				enterpriseWorkflowServiceMock.validateCredentialPermissionsToUser.mockImplementation(
					(_workflow, allowedCredentialIds) => {
						expect(allowedCredentialIds).toEqual(new Set());
						throw new Error('Unresolved credential');
					},
				);

				await expect(
					workflowCreationService.createWorkflow(user, newWorkflow, {
						projectId: 'project-1',
					}),
				).rejects.toThrow(
					'The workflow you are trying to save contains credentials that are not shared with you',
				);
			});
		});

		it('should throw BadRequestError when user lacks access to credentials in workflow', async () => {
			/**
			 * Arrange
			 */
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

		describe('lifecycle hook actor', () => {
			const expectedActor: WorkflowLifecycleHookActor = {
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: 'global:admin',
			};

			function makeActingUser() {
				return mock<User>({
					id: 'user-1',
					email: 'actor@example.com',
					firstName: 'Ada',
					lastName: 'Lovelace',
					role: mock<Role>({ slug: 'global:admin' }),
				});
			}

			it('forwards the acting user to the create hook', async () => {
				licenseStateMock.isSharingLicensed.mockReturnValue(false);
				projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
				setupTransactionMocks();

				const newWorkflow = new WorkflowEntity();
				newWorkflow.name = 'Test';
				newWorkflow.nodes = [];
				newWorkflow.connections = {};

				await expect(
					workflowCreationService.createWorkflow(makeActingUser(), newWorkflow, {
						projectId: 'project-1',
					}),
				).rejects.toThrow('Stopping for test');

				expect(externalHooksMock.run).toHaveBeenCalledWith('workflow.create', [
					newWorkflow,
					workflowHookContextServiceMock,
					expectedActor,
				]);
			});

			it('forwards the acting user to the afterCreate hook', async () => {
				licenseStateMock.isSharingLicensed.mockReturnValue(false);
				licenseStateMock.isDataRedactionLicensed.mockReturnValue(false);
				projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
				const { transactionManager } = setupTransactionMocks();
				transactionManager.save.mockImplementation(async (entity: unknown) => entity);
				workflowHistoryServiceMock.saveVersion.mockResolvedValue(undefined as never);

				const savedWorkflow = new WorkflowEntity();
				savedWorkflow.id = 'workflow-1';
				workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(savedWorkflow);

				const newWorkflow = new WorkflowEntity();
				newWorkflow.name = 'Test';
				newWorkflow.nodes = [];
				newWorkflow.connections = {};

				await workflowCreationService.createWorkflow(makeActingUser(), newWorkflow, {
					projectId: 'project-1',
				});

				expect(externalHooksMock.run).toHaveBeenCalledWith('workflow.afterCreate', [
					savedWorkflow,
					workflowHookContextServiceMock,
					expectedActor,
				]);
			});
		});
	});

	describe('policy enforcement on create', () => {
		const arrangeSuccessfulCreate = () => {
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(false);
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			const { transactionManager } = setupTransactionMocks();
			transactionManager.save.mockImplementation(async (entity: unknown) => entity);
			workflowHistoryServiceMock.saveVersion.mockResolvedValue(undefined as never);
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(
				makeWorkflow({ id: 'workflow-1' }),
			);
			return { transactionManager };
		};

		it('enforces the save with no stored workflow and the resolved project', async () => {
			arrangeSuccessfulCreate();
			const newWorkflow = makeWorkflow({ name: 'My workflow' });

			await workflowCreationService.createWorkflow(mock<User>(), newWorkflow, {
				projectId: 'project-1',
			});

			expect(policyEnforcementServiceMock.enforceWorkflowSave).toHaveBeenCalledExactlyOnceWith({
				workflow: { id: null, name: 'My workflow', nodes: [] },
				storedWorkflow: null,
				projectId: 'project-1',
			});
		});

		it("falls back to the user's personal project when no project is given", async () => {
			arrangeSuccessfulCreate();
			projectRepositoryMock.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: 'personal-project',
			} as never);

			await workflowCreationService.createWorkflow(mock<User>(), makeWorkflow());

			expect(policyEnforcementServiceMock.enforceWorkflowSave).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'personal-project' }),
			);
		});

		it('creates the workflow unchanged when the check clears', async () => {
			const { transactionManager } = arrangeSuccessfulCreate();

			const savedWorkflow = await workflowCreationService.createWorkflow(
				mock<User>(),
				makeWorkflow(),
				{ projectId: 'project-1' },
			);

			expect(transactionManager.save).toHaveBeenCalled();
			expect(savedWorkflow.id).toBe('workflow-1');
		});

		it('persists nothing when the check throws', async () => {
			const { transactionManager } = arrangeSuccessfulCreate();
			const violation = new Error('blocked by policy');
			policyEnforcementServiceMock.enforceWorkflowSave.mockRejectedValue(violation);

			await expect(
				workflowCreationService.createWorkflow(mock<User>(), makeWorkflow(), {
					projectId: 'project-1',
				}),
			).rejects.toThrow(violation);

			expect(transactionManager.save).not.toHaveBeenCalled();
			expect(workflowHistoryServiceMock.saveVersion).not.toHaveBeenCalled();
		});

		it('runs the external hook before enforcing, so hook mutations are covered', async () => {
			arrangeSuccessfulCreate();
			const callOrder: string[] = [];
			externalHooksMock.run.mockImplementation(async (hookName: string) => {
				callOrder.push(hookName);
			});
			policyEnforcementServiceMock.enforceWorkflowSave.mockImplementation(async () => {
				callOrder.push('enforceWorkflowSave');
				return await mock();
			});

			await workflowCreationService.createWorkflow(mock<User>(), makeWorkflow(), {
				projectId: 'project-1',
			});

			expect(callOrder).toEqual(['workflow.create', 'enforceWorkflowSave', 'workflow.afterCreate']);
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

	describe('auto-expose new workflows in MCP', () => {
		const user = mock<User>();

		beforeEach(() => {
			projectServiceMock.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(false);
			const { transactionManager } = setupTransactionMocks();
			transactionManager.save.mockImplementation(async (entity: unknown) => entity);
			workflowHistoryServiceMock.saveVersion.mockResolvedValue(undefined as never);
			workflowFinderServiceMock.findWorkflowForUser.mockImplementation(
				async () => new WorkflowEntity(),
			);
		});

		it('seeds availableInMCP when unset and the setting is on', async () => {
			mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(true);
			const workflow = makeWorkflow({ settings: {} });

			await workflowCreationService.createWorkflow(user, workflow, { projectId: 'project-1' });

			expect(workflow.settings?.availableInMCP).toBe(true);
		});

		it('seeds availableInMCP when settings is entirely absent', async () => {
			mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(true);
			const workflow = makeWorkflow({ settings: undefined });

			await workflowCreationService.createWorkflow(user, workflow, { projectId: 'project-1' });

			expect(workflow.settings?.availableInMCP).toBe(true);
		});

		it.each([
			{ explicitValue: false, settingValue: true },
			{ explicitValue: true, settingValue: false },
		])(
			'respects an explicit $explicitValue from the caller over a setting of $settingValue',
			async ({ explicitValue, settingValue }) => {
				mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(settingValue);
				const workflow = makeWorkflow({ settings: { availableInMCP: explicitValue } });

				await workflowCreationService.createWorkflow(user, workflow, { projectId: 'project-1' });

				expect(workflow.settings?.availableInMCP).toBe(explicitValue);
			},
		);

		it('does not seed when the setting is off', async () => {
			mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(false);
			const workflow = makeWorkflow({ settings: {} });

			await workflowCreationService.createWorkflow(user, workflow, { projectId: 'project-1' });

			expect(workflow.settings?.availableInMCP).toBeUndefined();
		});

		it('still creates the workflow when reading the auto-expose setting throws', async () => {
			mcpSettingsService.getAutoExposeNewWorkflows.mockRejectedValue(new Error('cache down'));
			const workflow = makeWorkflow({ settings: {} });

			await expect(
				workflowCreationService.createWorkflow(user, workflow, { projectId: 'project-1' }),
			).resolves.not.toThrow();

			expect(workflow.settings?.availableInMCP).toBeUndefined();
			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Failed to resolve auto-expose setting for new workflow',
				{ cause: 'cache down' },
			);
		});

		it('still creates the workflow when the auto-expose setting lookup rejects with a non-Error', async () => {
			mcpSettingsService.getAutoExposeNewWorkflows.mockRejectedValue('cache down');
			const workflow = makeWorkflow({ settings: {} });

			await expect(
				workflowCreationService.createWorkflow(user, workflow, { projectId: 'project-1' }),
			).resolves.not.toThrow();

			expect(workflow.settings?.availableInMCP).toBeUndefined();
			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Failed to resolve auto-expose setting for new workflow',
				{ cause: 'cache down' },
			);
		});
	});
});

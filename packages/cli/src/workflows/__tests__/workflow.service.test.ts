import type { LicenseState } from '@n8n/backend-common';
import type { Project, User, WorkflowRepository, WorkflowPublishHistoryRepository } from '@n8n/db';
import { WorkflowEntity, WorkflowHistory } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IConnections, INode } from 'n8n-workflow';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { WorkflowActivationBadRequestError } from '@/errors/response-errors/workflow-activation-bad-request.error';
import type { ExternalHooks } from '@/external-hooks';
import type { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { OwnershipService } from '@/services/ownership.service';
import type { RoleService } from '@/services/role.service';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';
import * as WorkflowHelpers from '@/workflow-helpers';

jest.mock('@/permissions.ee/check-access');
jest.mock('@/workflow-helpers');
jest.mock('@/generic-helpers');

describe('WorkflowService', () => {
	describe('getMany()', () => {
		let workflowService: WorkflowService;
		let workflowRepositoryMock: MockProxy<{
			getManyAndCountWithSharingSubquery: jest.Mock;
		}>;
		let roleServiceMock: MockProxy<RoleService>;
		let webhookServiceMock: MockProxy<WebhookService>;

		beforeEach(() => {
			workflowRepositoryMock = mock();
			workflowRepositoryMock.getManyAndCountWithSharingSubquery.mockResolvedValue({
				workflows: [],
				count: 0,
			});

			roleServiceMock = mock<RoleService>();
			roleServiceMock.rolesWithScope.mockResolvedValue(['project:viewer']);

			webhookServiceMock = mock<WebhookService>();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock as never, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // binaryDataService
				mock(), // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				roleServiceMock, // roleService
				mock(), // projectService
				mock(), // executionRepository
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				mock(), // workflowFinderService
				mock(), // workflowPublishedVersionRepository
				mock(), // workflowPublishHistoryRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				webhookServiceMock, // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
			);
		});

		test('should use default "workflow:read" scope when requiredScopes is not provided', async () => {
			const user = mock<User>();

			await workflowService.getMany(user);

			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', ['workflow:read']);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
			expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: ['workflow:read'],
					projectRoles: expect.any(Array),
					workflowRoles: expect.any(Array),
				}),
				undefined,
			);
		});

		test('should use provided requiredScopes when specified', async () => {
			const user = mock<User>();
			const customScopes: Scope[] = ['workflow:update'];

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				undefined, // includeFolders
				undefined, // onlySharedWithMe
				customScopes,
			);

			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', customScopes);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', customScopes);
			expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: customScopes,
					projectRoles: expect.any(Array),
					workflowRoles: expect.any(Array),
				}),
				undefined,
			);
		});

		test('should use provided requiredScopes with multiple scopes', async () => {
			const user = mock<User>();
			const customScopes: Scope[] = ['workflow:read', 'workflow:update'];

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				undefined, // includeFolders
				undefined, // onlySharedWithMe
				customScopes,
			);

			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', customScopes);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', customScopes);
			expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: customScopes,
					projectRoles: expect.any(Array),
					workflowRoles: expect.any(Array),
				}),
				undefined,
			);
		});

		test('should use "workflow:execute" scope when required', async () => {
			const user = mock<User>();
			const executeScope: Scope[] = ['workflow:execute'];

			await workflowService.getMany(
				user,
				undefined, // options
				undefined, // includeScopes
				undefined, // includeFolders
				undefined, // onlySharedWithMe
				executeScope,
			);

			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('project', executeScope);
			expect(roleServiceMock.rolesWithScope).toHaveBeenCalledWith('workflow', executeScope);
			expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					scopes: executeScope,
					projectRoles: expect.any(Array),
					workflowRoles: expect.any(Array),
				}),
				undefined,
			);
		});
	});

	describe('update() redactionPolicy scope enforcement', () => {
		const userHasScopesMock = jest.mocked(userHasScopes);
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let licenseStateMock: MockProxy<LicenseState>;
		let redactionEnforcementServiceMock: MockProxy<RedactionEnforcementService>;
		let workflowRepositoryMock: MockProxy<{
			update: jest.Mock;
			findOne: jest.Mock;
		}>;

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowRepositoryMock = mock();
			licenseStateMock = mock<LicenseState>();
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(true);
			redactionEnforcementServiceMock = mock<RedactionEnforcementService>();

			const ownershipServiceMock = mock<OwnershipService>();
			ownershipServiceMock.getWorkflowProjectCached.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock as never, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // binaryDataService
				ownershipServiceMock, // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionRepository
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishedVersionRepository
				mock(), // workflowPublishHistoryRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				licenseStateMock, // licenseState
				mock(), // projectRepository
				redactionEnforcementServiceMock, // redactionEnforcementService
			);

			jest.clearAllMocks();

			// Pass settings through removeDefaultValues unchanged
			jest.mocked(WorkflowHelpers.removeDefaultValues).mockImplementation((settings) => settings);
		});

		function setupExistingWorkflow(settings: Record<string, unknown> = {}) {
			const existingWorkflow = mock<WorkflowEntity>({
				id: 'workflow-1',
				isArchived: false,
				versionId: 'v1',
				nodes: [],
				connections: {},
				settings,
				activeVersionId: undefined as unknown as string,
				tags: [],
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(existingWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(existingWorkflow);
			return existingWorkflow;
		}

		function createUpdateData(settings: Record<string, unknown>) {
			return { settings } as unknown as WorkflowEntity;
		}

		test('should save new version when nodeGroups change', async () => {
			setupExistingWorkflow();

			const user = mock<User>();
			await workflowService.update(
				user,
				{
					nodes: [],
					connections: {},
					nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: [] }],
				} as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true },
			);

			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					versionId: expect.not.stringMatching('v1'),
				}),
			);
		});

		test('should not save new version when nodeGroups are unchanged', async () => {
			const nodeGroups = [{ id: 'g1', name: 'Group 1', nodeIds: [] }];
			const existingWorkflow = {
				id: 'workflow-1',
				isArchived: false,
				versionId: 'v1',
				nodes: [],
				connections: {},
				nodeGroups,
				settings: {},
				activeVersionId: undefined,
				tags: [],
			} as unknown as WorkflowEntity;
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(existingWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(existingWorkflow);

			const user = mock<User>();
			await workflowService.update(
				user,
				{
					nodes: [],
					connections: {},
					nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: [] }],
				} as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true },
			);

			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					versionId: 'v1',
				}),
			);
		});

		test('should validate nodeGroups against existing workflow when not in payload', async () => {
			const existingNodeGroups = [{ id: 'g1', name: 'Group 1', nodeIds: ['n1'] }];
			const existingWorkflow = setupExistingWorkflow();
			existingWorkflow.nodeGroups = existingNodeGroups;

			const user = mock<User>();
			await workflowService.update(user, { nodes: [] } as unknown as WorkflowEntity, 'workflow-1', {
				forceSave: true,
			});

			expect(WorkflowHelpers.validateWorkflowNodeGroups).toHaveBeenCalledWith({
				nodes: [],
				nodeGroups: existingNodeGroups,
			});
		});

		test('should throw BadRequestError for invalid workflow structure', async () => {
			setupExistingWorkflow();
			jest.mocked(WorkflowHelpers.validateWorkflowStructure).mockImplementationOnce(() => {
				throw new BadRequestError('Workflow structure is invalid. nodes[0].position: Required');
			});

			const user = mock<User>();

			await expect(
				workflowService.update(
					user,
					{
						nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: {} }],
					} as unknown as WorkflowEntity,
					'workflow-1',
					{ forceSave: true },
				),
			).rejects.toThrow('Workflow structure is invalid.');
		});

		test('should check enableRedaction and strip when user lacks it (none → all)', async () => {
			setupExistingWorkflow({ redactionPolicy: 'none' });
			userHasScopesMock.mockResolvedValue(false);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['workflow:enableRedaction'], false, {
				projectId: 'project-1',
			});
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.not.objectContaining({ redactionPolicy: 'all' }),
				}),
			);
		});

		test('should check enableRedaction and preserve when user has it (none → all)', async () => {
			setupExistingWorkflow({ redactionPolicy: 'none' });
			userHasScopesMock.mockResolvedValue(true);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['workflow:enableRedaction'], false, {
				projectId: 'project-1',
			});
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
			);
		});

		test('should check disableRedaction and strip when user lacks it (all → none)', async () => {
			setupExistingWorkflow({ redactionPolicy: 'all' });
			userHasScopesMock.mockResolvedValue(false);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'none' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['workflow:disableRedaction'], false, {
				projectId: 'project-1',
			});
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.not.objectContaining({ redactionPolicy: 'none' }),
				}),
			);
		});

		test('should check disableRedaction and preserve when user has it (all → none)', async () => {
			setupExistingWorkflow({ redactionPolicy: 'all' });
			userHasScopesMock.mockResolvedValue(true);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'none' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['workflow:disableRedaction'], false, {
				projectId: 'project-1',
			});
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'none' }),
				}),
			);
		});

		test('should check enableRedaction when changing between non-none values (non-manual → all)', async () => {
			setupExistingWorkflow({ redactionPolicy: 'non-manual' });
			userHasScopesMock.mockResolvedValue(true);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['workflow:enableRedaction'], false, {
				projectId: 'project-1',
			});
		});

		test('should not check scope when redactionPolicy value is unchanged', async () => {
			setupExistingWorkflow({ redactionPolicy: 'all' });

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(userHasScopesMock).not.toHaveBeenCalled();
		});

		test('should not check scope when redactionPolicy is not in incoming settings', async () => {
			setupExistingWorkflow({ redactionPolicy: 'all' });

			const user = mock<User>();
			await workflowService.update(user, createUpdateData({ executionOrder: 'v1' }), 'workflow-1', {
				forceSave: true,
			});

			expect(userHasScopesMock).not.toHaveBeenCalled();
		});

		test('should strip redactionPolicy when instance lacks data-redaction license', async () => {
			setupExistingWorkflow({ redactionPolicy: 'none' });
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(false);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.not.objectContaining({ redactionPolicy: 'all' }),
				}),
			);
		});

		test('should not strip redactionPolicy when instance has data-redaction license', async () => {
			setupExistingWorkflow({ redactionPolicy: 'none' });
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(true);
			userHasScopesMock.mockResolvedValue(true);

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'all' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
			);
		});

		test('should reject update with 422 when enforcement is on and redactionPolicy is changing', async () => {
			setupExistingWorkflow({ redactionPolicy: 'none' });
			redactionEnforcementServiceMock.assertPolicyChangeAllowed.mockImplementationOnce(() => {
				throw new UnprocessableRequestError(
					'Workflow redaction policy is enforced at the instance level and cannot be modified.',
				);
			});

			const user = mock<User>();
			await expect(
				workflowService.update(user, createUpdateData({ redactionPolicy: 'all' }), 'workflow-1', {
					forceSave: true,
				}),
			).rejects.toThrow(UnprocessableRequestError);

			expect(redactionEnforcementServiceMock.assertPolicyChangeAllowed).toHaveBeenCalledWith(
				'none',
				'all',
			);
			expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
		});

		test('should not call enforcement check with payload value when settings are absent', async () => {
			setupExistingWorkflow({ redactionPolicy: 'all' });

			const user = mock<User>();
			await workflowService.update(
				user,
				{ name: 'renamed' } as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true },
			);

			expect(redactionEnforcementServiceMock.assertPolicyChangeAllowed).toHaveBeenCalledWith(
				'all',
				undefined,
			);
		});
	});

	describe('workflow.activate hook', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowHistoryServiceMock: MockProxy<WorkflowHistoryService>;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let workflowPublishHistoryRepositoryMock: MockProxy<WorkflowPublishHistoryRepository>;
		let activeWorkflowManagerMock: MockProxy<ActiveWorkflowManager>;
		let externalHooksMock: MockProxy<ExternalHooks>;

		const WORKFLOW_ID = 'workflow-1';
		const PREVIOUS_VERSION_ID = 'v1';
		const TARGET_VERSION_ID = 'v2';

		function makeWorkflowEntity(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
			const workflow = new WorkflowEntity();
			workflow.id = WORKFLOW_ID;
			workflow.name = 'My workflow';
			workflow.isArchived = false;
			workflow.versionId = TARGET_VERSION_ID;
			workflow.activeVersionId = PREVIOUS_VERSION_ID;
			workflow.active = true;
			workflow.nodes = [{ name: 'Draft node' } as INode];
			workflow.connections = { Draft: {} } as IConnections;
			workflow.settings = {};
			workflow.updatedAt = new Date();
			Object.assign(workflow, overrides);
			return workflow;
		}

		function makeVersionToActivate(): WorkflowHistory {
			const version = new WorkflowHistory();
			version.versionId = TARGET_VERSION_ID;
			version.nodes = [{ name: 'Activated node' } as INode];
			version.connections = { Activated: {} } as IConnections;
			return version;
		}

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowHistoryServiceMock = mock<WorkflowHistoryService>();
			workflowRepositoryMock = mock();
			workflowPublishHistoryRepositoryMock = mock();
			activeWorkflowManagerMock = mock();
			externalHooksMock = mock<ExternalHooks>();

			workflowRepositoryMock.create.mockImplementation(
				(data) => Object.assign(new WorkflowEntity(), data) as WorkflowEntity,
			);

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // binaryDataService
				mock(), // ownershipService
				mock(), // tagService
				workflowHistoryServiceMock, // workflowHistoryService
				externalHooksMock, // externalHooks
				activeWorkflowManagerMock, // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionRepository
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishedVersionRepository
				workflowPublishHistoryRepositoryMock, // workflowPublishHistoryRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
			);

			// Bypass validation internals
			jest
				.spyOn(workflowService as never, '_detectWebhookConflicts')
				.mockResolvedValue(undefined as never);
			jest.spyOn(workflowService as never, '_validateNodes').mockReturnValue(undefined as never);
			jest
				.spyOn(workflowService as never, '_validateDynamicCredentials')
				.mockResolvedValue(undefined as never);
			jest
				.spyOn(workflowService as never, '_validateSubWorkflowReferences')
				.mockResolvedValue(undefined as never);
		});

		test('republish blocked by hook leaves previous active version untouched', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			const versionToActivate = makeVersionToActivate();
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowHistoryServiceMock.getVersion.mockResolvedValue(versionToActivate);

			externalHooksMock.run.mockRejectedValue(new Error('Publish gate rejected'));

			const user = mock<User>();

			await expect(
				workflowService.activateWorkflow(user, WORKFLOW_ID, { versionId: TARGET_VERSION_ID }),
			).rejects.toBeInstanceOf(WorkflowActivationBadRequestError);

			expect(workflow.active).toBe(true);
			expect(workflow.activeVersionId).toBe(PREVIOUS_VERSION_ID);
			expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
			expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
			expect(workflowPublishHistoryRepositoryMock.addRecord).not.toHaveBeenCalled();
		});

		test('first-time activate blocked by hook leaves the workflow row untouched', async () => {
			const workflow = makeWorkflowEntity({ active: false, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowHistoryServiceMock.getVersion.mockResolvedValue(makeVersionToActivate());

			externalHooksMock.run.mockRejectedValue(new Error('Publish gate rejected'));

			const user = mock<User>();

			await expect(
				workflowService.activateWorkflow(user, WORKFLOW_ID, { versionId: TARGET_VERSION_ID }),
			).rejects.toBeInstanceOf(WorkflowActivationBadRequestError);

			expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
			expect(activeWorkflowManagerMock.add).not.toHaveBeenCalled();
		});

		test('hook receives a candidate workflow targeting the activation version', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			const versionToActivate = makeVersionToActivate();
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowHistoryServiceMock.getVersion.mockResolvedValue(versionToActivate);
			workflowRepositoryMock.findOne.mockResolvedValue(workflow);

			externalHooksMock.run.mockResolvedValue(undefined);

			jest
				.spyOn(workflowService as never, '_addToActiveWorkflowManager')
				.mockResolvedValue(undefined as never);

			const user = mock<User>();

			await workflowService.activateWorkflow(user, WORKFLOW_ID, {
				versionId: TARGET_VERSION_ID,
			});

			expect(externalHooksMock.run).toHaveBeenCalledTimes(1);
			const [hookName, hookArgs] = externalHooksMock.run.mock.calls[0] as [
				string,
				[WorkflowEntity],
			];
			expect(hookName).toBe('workflow.activate');
			const [candidate] = hookArgs;
			expect(candidate.active).toBe(true);
			expect(candidate.activeVersionId).toBe(TARGET_VERSION_ID);
			expect(candidate.activeVersion).toBe(versionToActivate);
			expect(candidate.nodes).toBe(workflow.nodes);
			expect(candidate.connections).toBe(workflow.connections);
		});
	});
});

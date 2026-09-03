import type { LicenseState } from '@n8n/backend-common';
import type { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type {
	Project,
	Role,
	TagEntity,
	User,
	WorkflowRepository,
	WorkflowPublishHistoryRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersionRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import { WorkflowEntity, WorkflowHistory } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { EntityManager } from '@n8n/typeorm';
import { QueryFailedError } from '@n8n/typeorm';
import type { IConnections, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { WorkflowActivationBadRequestError } from '@/errors/response-errors/workflow-activation-bad-request.error';
import { WorkflowDeactivationBadRequestError } from '@/errors/response-errors/workflow-deactivation-bad-request.error';
import { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';
import type { EventService } from '@/events/event.service';
import type { SharedWorkflowRepository } from '@n8n/db';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { ExternalHooks, WorkflowLifecycleHookActor } from '@/external-hooks';
import type { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import type { PolicyCleared } from '@n8n/decorators';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import type { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import type { PollTriggerJobRegistrar } from '@/scheduling/poll-trigger-node/poll-trigger-job-registrar';
import type { ScheduleTriggerJobRegistrar } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import type { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';
import type { OwnershipService } from '@/services/ownership.service';
import type { RoleService } from '@/services/role.service';
import type { TagService } from '@/services/tag.service';
import type { WebhookService } from '@/webhooks/webhook.service';
import * as WorkflowHelpers from '@/workflow-helpers';
import type { WorkflowHookContextService } from '@/workflow-hook-context.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import type { WorkflowMutationHooksProxy } from '@/workflows/workflow-mutation-hooks-proxy.service';
import type { WorkflowPublishGuardProxy } from '@/workflows/workflow-publish-guard-proxy.service';
import type { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';

vi.mock('@/permissions.ee/check-access');
vi.mock('@/workflow-helpers');
vi.mock('@/generic-helpers');

describe('WorkflowService', () => {
	describe('getMany()', () => {
		let workflowService: WorkflowService;
		let workflowRepositoryMock: MockProxy<{
			getManyAndCountWithSharingSubquery: Mock;
			getWorkflowsAndFoldersWithCountWithSharingSubquery: Mock;
		}>;
		let roleServiceMock: MockProxy<RoleService>;
		let webhookServiceMock: MockProxy<WebhookService>;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let globalConfigMock: MockProxy<GlobalConfig>;
		let workflowPublicationStatusServiceMock: MockProxy<WorkflowPublicationStatusService>;

		beforeEach(() => {
			workflowRepositoryMock = mock();
			workflowRepositoryMock.getManyAndCountWithSharingSubquery.mockResolvedValue({
				workflows: [],
				count: 0,
			});

			roleServiceMock = mock<RoleService>();
			roleServiceMock.rolesWithScope.mockResolvedValue(['project:viewer']);

			webhookServiceMock = mock<WebhookService>();

			workflowFinderServiceMock = mock<WorkflowFinderService>();
			// By default the requester can read the supplied parent workflow.
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());

			globalConfigMock = mock<GlobalConfig>({
				workflows: mock<WorkflowsConfig>({ useWorkflowPublicationService: false }),
			});
			workflowPublicationStatusServiceMock = mock<WorkflowPublicationStatusService>();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock as never, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				roleServiceMock, // roleService
				mock(), // projectService
				mock(), // executionPersistence
				mock(), // eventService
				globalConfigMock, // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // outboxRepository
				Object.assign(mock<WorkflowValidationService>(), {
					validateCredentialNodeRestrictions: () => ({ isValid: true }),
				}), // workflowValidationService
				mock(), // nodeTypes
				webhookServiceMock, // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				mock(), // scheduleTriggerJobRegistrar
				mock(), // pollTriggerJobRegistrar
				mock(), // workflowScheduledJobOwner
				mock(), // durableJobProvisioner
				mock(), // workflowPublishedVersionRepository
				mock(), // workflowHookContextService
				mock(), // workflowPublishGuard
				mock(), // workflowMutationHooks
				mock(), // policyEnforcementService
				workflowPublicationStatusServiceMock, // workflowPublicationStatusService
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
				undefined, // callableForParentWorkflowId
			);
		});

		test('should use provided requiredScopes when specified', async () => {
			const user = mock<User>();
			const customScopes: Scope[] = ['workflow:update'];

			await workflowService.getMany(user, undefined, { requiredScopes: customScopes });

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
				undefined, // callableForParentWorkflowId
			);
		});

		test('should use provided requiredScopes with multiple scopes', async () => {
			const user = mock<User>();
			const customScopes: Scope[] = ['workflow:read', 'workflow:update'];

			await workflowService.getMany(user, undefined, { requiredScopes: customScopes });

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
				undefined, // callableForParentWorkflowId
			);
		});

		test('should use "workflow:execute" scope when required', async () => {
			const user = mock<User>();
			const executeScope: Scope[] = ['workflow:execute'];

			await workflowService.getMany(user, undefined, { requiredScopes: executeScope });

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
				undefined, // callableForParentWorkflowId
			);
		});

		describe('callableForParentWorkflowId', () => {
			test('should pass parentWorkflowId when includeCallableSubworkflows is true', async () => {
				const user = mock<User>();
				const options = {
					filter: {
						includeCallableSubworkflows: true,
						parentWorkflowId: 'parent-wf-id',
					},
				};

				await workflowService.getMany(user, options);

				expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					user,
					expect.any(Object),
					options,
					'parent-wf-id',
				);
			});

			test('should pass undefined when includeCallableSubworkflows is false', async () => {
				const user = mock<User>();
				const options = {
					filter: {
						includeCallableSubworkflows: false,
						parentWorkflowId: 'parent-wf-id',
					},
				};

				await workflowService.getMany(user, options);

				expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					user,
					expect.any(Object),
					options,
					undefined,
				);
			});

			test('should pass undefined when includeCallableSubworkflows is true but parentWorkflowId is missing', async () => {
				const user = mock<User>();
				const options = {
					filter: {
						includeCallableSubworkflows: true,
					},
				};

				await workflowService.getMany(user, options);

				expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					user,
					expect.any(Object),
					options,
					undefined,
				);
			});

			test('should pass undefined when includeCallableSubworkflows is true but parentWorkflowId is not a string', async () => {
				const user = mock<User>();
				const options = {
					filter: {
						includeCallableSubworkflows: true,
						parentWorkflowId: 123, // invalid type
					},
				};

				await workflowService.getMany(user, options);

				expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					user,
					expect.any(Object),
					options,
					undefined,
				);
			});

			test('should pass undefined when the requester cannot read the parent workflow', async () => {
				const user = mock<User>();
				const options = {
					filter: {
						includeCallableSubworkflows: true,
						parentWorkflowId: 'parent-wf-id',
					},
				};
				// Requester has no read access to the supplied parent workflow.
				workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(null);

				await workflowService.getMany(user, options);

				expect(workflowFinderServiceMock.findWorkflowForUser).toHaveBeenCalledWith(
					'parent-wf-id',
					user,
					['workflow:read'],
				);
				expect(workflowRepositoryMock.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					user,
					expect.any(Object),
					options,
					undefined,
				);
			});
		});

		describe('getMany publicationStatus enrichment', () => {
			const user = mock<User>();

			beforeEach(() => {
				workflowRepositoryMock.getManyAndCountWithSharingSubquery.mockResolvedValue({
					workflows: [{ id: 'wf-1' }, { id: 'wf-2' }],
					count: 2,
				});
			});

			it('attaches publicationStatus when the caller opts in and the publication service flag is on', async () => {
				globalConfigMock.workflows.useWorkflowPublicationService = true;
				workflowPublicationStatusServiceMock.getListStatusesByWorkflowIds.mockResolvedValue(
					new Map([['wf-1', 'partial']]),
				);

				const { workflows } = await workflowService.getMany(
					user,
					{},
					{ includePublicationStatus: true },
				);

				expect(workflows.find((w) => w.id === 'wf-1')).toMatchObject({
					publicationStatus: 'partial',
				});
				expect(workflows.find((w) => w.id === 'wf-2')).not.toHaveProperty('publicationStatus');
			});

			it('is a no-op when the flag is off', async () => {
				globalConfigMock.workflows.useWorkflowPublicationService = false;

				const { workflows } = await workflowService.getMany(
					user,
					{},
					{ includePublicationStatus: true },
				);

				expect(
					workflowPublicationStatusServiceMock.getListStatusesByWorkflowIds,
				).not.toHaveBeenCalled();
				expect(workflows.every((w) => !('publicationStatus' in w))).toBe(true);
			});

			it('is a no-op when the caller does not opt in, even with the flag on', async () => {
				globalConfigMock.workflows.useWorkflowPublicationService = true;

				const { workflows } = await workflowService.getMany(user, {});

				expect(
					workflowPublicationStatusServiceMock.getListStatusesByWorkflowIds,
				).not.toHaveBeenCalled();
				expect(workflows.every((w) => !('publicationStatus' in w))).toBe(true);
			});

			it('returns the list unenriched when the status lookup fails', async () => {
				globalConfigMock.workflows.useWorkflowPublicationService = true;
				workflowPublicationStatusServiceMock.getListStatusesByWorkflowIds.mockRejectedValue(
					new Error('table is locked'),
				);

				const { workflows, count } = await workflowService.getMany(
					user,
					{},
					{
						includePublicationStatus: true,
					},
				);

				expect(count).toBe(2);
				expect(workflows).toHaveLength(2);
				expect(workflows.every((w) => !('publicationStatus' in w))).toBe(true);
			});

			it('enriches the workflow row and leaves folder rows untouched on the folder list path', async () => {
				globalConfigMock.workflows.useWorkflowPublicationService = true;
				workflowRepositoryMock.getWorkflowsAndFoldersWithCountWithSharingSubquery.mockResolvedValue(
					[
						[
							{ id: 'folder-1', resource: 'folder' },
							{ id: 'wf-1', resource: 'workflow' },
						],
						2,
					],
				);
				// Only the workflow id has a settled status; the folder id never matches.
				workflowPublicationStatusServiceMock.getListStatusesByWorkflowIds.mockResolvedValue(
					new Map([['wf-1', 'published']]),
				);

				const { workflows } = await workflowService.getMany(
					user,
					{},
					{
						includeFolders: true,
						includePublicationStatus: true,
					},
				);

				// Folder ids are never fed to the aggregate query.
				expect(
					workflowPublicationStatusServiceMock.getListStatusesByWorkflowIds,
				).toHaveBeenCalledWith(['wf-1']);

				expect(workflows.find((w) => w.id === 'wf-1')).toMatchObject({
					resource: 'workflow',
					publicationStatus: 'published',
				});

				const folder = workflows.find((w) => w.id === 'folder-1');
				expect(folder).toMatchObject({ resource: 'folder' });
				expect(folder).not.toHaveProperty('publicationStatus');
			});
		});
	});

	describe('update() redactionPolicy scope enforcement', () => {
		const userHasScopesMock = vi.mocked(userHasScopes);
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowHistoryServiceMock: MockProxy<WorkflowHistoryService>;
		let licenseStateMock: MockProxy<LicenseState>;
		let redactionEnforcementServiceMock: MockProxy<RedactionEnforcementService>;
		let externalHooksMock: MockProxy<ExternalHooks>;
		let workflowHookContextServiceMock: MockProxy<WorkflowHookContextService>;
		let workflowRepositoryMock: MockProxy<{
			update: Mock;
			updateContent: Mock;
			findOne: Mock;
		}>;

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowHistoryServiceMock = mock<WorkflowHistoryService>();
			workflowRepositoryMock = mock();
			licenseStateMock = mock<LicenseState>();
			licenseStateMock.isDataRedactionLicensed.mockReturnValue(true);
			redactionEnforcementServiceMock = mock<RedactionEnforcementService>();
			externalHooksMock = mock<ExternalHooks>();
			workflowHookContextServiceMock = mock<WorkflowHookContextService>();

			const ownershipServiceMock = mock<OwnershipService>();
			ownershipServiceMock.getWorkflowProjectCached.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock as never, // workflowRepository
				mock(), // workflowTagMappingRepository
				ownershipServiceMock, // ownershipService
				mock(), // tagService
				workflowHistoryServiceMock, // workflowHistoryService
				externalHooksMock, // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionPersistence
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // outboxRepository
				Object.assign(mock<WorkflowValidationService>(), {
					validateCredentialNodeRestrictions: () => ({ isValid: true }),
				}), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				licenseStateMock, // licenseState
				mock(), // projectRepository
				redactionEnforcementServiceMock, // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				mock(), // scheduleTriggerJobRegistrar
				mock(), // pollTriggerJobRegistrar
				mock(), // workflowScheduledJobOwner
				mock(), // durableJobProvisioner
				mock(), // workflowPublishedVersionRepository
				workflowHookContextServiceMock, // workflowHookContextService
				mock(), // workflowPublishGuard
				mock(), // workflowMutationHooks
				mock(), // policyEnforcementService
				mock(), // workflowPublicationStatusService
			);

			vi.clearAllMocks();

			// Pass settings through removeDefaultValues unchanged
			vi.mocked(WorkflowHelpers.removeDefaultValues).mockImplementation((settings) => settings);
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

		test('forwards the workflow hook context to workflow.update and workflow.afterUpdate', async () => {
			setupExistingWorkflow();

			const user = mock<User>();
			await workflowService.update(
				user,
				{ nodes: [], connections: {} } as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true },
			);

			const updateCall = externalHooksMock.run.mock.calls.find(
				([hookName]) => hookName === 'workflow.update',
			);
			const afterUpdateCall = externalHooksMock.run.mock.calls.find(
				([hookName]) => hookName === 'workflow.afterUpdate',
			);
			expect(updateCall?.[1]?.[1]).toBe(workflowHookContextServiceMock);
			expect(afterUpdateCall?.[1]?.[1]).toBe(workflowHookContextServiceMock);
		});

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

			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					versionId: expect.not.stringMatching('v1'),
				}),
				expect.anything(),
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

			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					versionId: 'v1',
				}),
				expect.anything(),
			);
		});

		test('validates the existing nodeGroups (full) when the graph changes but groups are omitted', async () => {
			const existingNodeGroups = [{ id: 'g1', name: 'Group 1', nodeIds: ['n1'] }];
			const existingWorkflow = setupExistingWorkflow();
			existingWorkflow.nodeGroups = existingNodeGroups;

			// The getNodeType callback being passed through is the signal that full checks ran.
			const getNodeTypeStub = vi.fn();
			vi.mocked(WorkflowHelpers.makeGetNodeTypeForGrouping).mockReturnValue(getNodeTypeStub);

			// Change the nodes so validation runs; omit nodeGroups so they are backfilled.
			const changedNodes = [
				{ id: 'n1', name: 'N1', type: 't', typeVersion: 1, position: [0, 0], parameters: {} },
			];
			const user = mock<User>();
			await workflowService.update(
				user,
				{ nodes: changedNodes } as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true },
			);

			expect(WorkflowHelpers.validateWorkflowNodeGroups).toHaveBeenCalledWith(
				expect.objectContaining({
					nodes: changedNodes,
					nodeGroups: existingNodeGroups,
				}),
				getNodeTypeStub,
			);
		});

		test('skips nodeGroup validation on a metadata-only edit (nodes/connections/groups unchanged)', async () => {
			const existingWorkflow = setupExistingWorkflow();
			existingWorkflow.nodeGroups = [{ id: 'g1', name: 'Group 1', nodeIds: ['n1'] }];

			const user = mock<User>();
			await workflowService.update(
				user,
				{ name: 'Renamed workflow' } as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true },
			);

			expect(WorkflowHelpers.validateWorkflowNodeGroups).not.toHaveBeenCalled();
		});

		test('skips structure validation on a metadata-only edit so legacy graphs stay editable', async () => {
			setupExistingWorkflow();

			const user = mock<User>();
			await workflowService.update(
				user,
				{ name: 'Renamed workflow' } as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true },
			);

			expect(WorkflowHelpers.validateWorkflowStructure).not.toHaveBeenCalled();
		});

		test('backfills existing nodeGroups into the saved history version when omitted', async () => {
			const existingNodeGroups = [{ id: 'g1', name: 'Group 1', nodeIds: ['n1'] }];
			const existingWorkflow = setupExistingWorkflow();
			existingWorkflow.nodeGroups = existingNodeGroups;

			const user = mock<User>();
			// Change nodes (forces a new version) while omitting nodeGroups.
			await workflowService.update(
				user,
				{
					nodes: [
						{ id: 'n1', name: 'N1', type: 't', typeVersion: 1, position: [0, 0], parameters: {} },
					],
				} as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true },
			);

			// The history version must record the live (effective) groups, not empty.
			expect(workflowHistoryServiceMock.saveVersion).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ nodeGroups: existingNodeGroups }),
				'workflow-1',
				false,
				'ui',
				undefined,
				undefined,
			);
		});

		test('should throw BadRequestError for invalid workflow structure', async () => {
			setupExistingWorkflow();
			vi.mocked(WorkflowHelpers.validateWorkflowStructure).mockImplementationOnce(() => {
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

		test('should strip redactionPolicy when user lacks scope and value is changing', async () => {
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
			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.not.objectContaining({ redactionPolicy: 'all' }),
				}),
				expect.anything(),
			);
		});

		test('should preserve redactionPolicy when user has scope and value is changing', async () => {
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
			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
				expect.anything(),
			);
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

			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.not.objectContaining({ redactionPolicy: 'all' }),
				}),
				expect.anything(),
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

			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
				expect.anything(),
			);
		});

		test('should reject update with 422 when redactionPolicy change violates the instance floor', async () => {
			setupExistingWorkflow({ redactionPolicy: 'none' });
			redactionEnforcementServiceMock.assertPolicyChangeAllowed.mockRejectedValueOnce(
				new UnprocessableRequestError(
					'Workflow redaction policy cannot be weaker than the instance floor.',
				),
			);

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

		test('preserves a below-floor stored redactionPolicy when an unrelated setting changes (ENT-35)', async () => {
			// Floor enforced, workflow stored below the floor. A save that only changes another
			// field must not overwrite the stored policy — the field is absent from the payload,
			// enforcement is consulted with `undefined`, and the merge keeps the stored value.
			setupExistingWorkflow({ redactionPolicy: 'none', timezone: 'UTC' });

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ timezone: 'Europe/Berlin' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(redactionEnforcementServiceMock.assertPolicyChangeAllowed).toHaveBeenCalledWith(
				'none',
				undefined,
			);
			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({
						redactionPolicy: 'none',
						timezone: 'Europe/Berlin',
					}),
				}),
				expect.anything(),
			);
		});

		test('allows a save that re-sends the unchanged below-floor redactionPolicy verbatim (ENT-35)', async () => {
			// Mirrors the editor sending the user's own stored value for a floor-locked channel:
			// incoming === current, so enforcement allows it and the stored value is preserved.
			setupExistingWorkflow({ redactionPolicy: 'none' });

			const user = mock<User>();
			await workflowService.update(
				user,
				createUpdateData({ redactionPolicy: 'none' }),
				'workflow-1',
				{ forceSave: true },
			);

			expect(redactionEnforcementServiceMock.assertPolicyChangeAllowed).toHaveBeenCalledWith(
				'none',
				'none',
			);
			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'none' }),
				}),
				expect.anything(),
			);
		});

		describe('directional scope enforcement', () => {
			test('should require enableRedaction for upgrade (none → all)', async () => {
				setupExistingWorkflow({ redactionPolicy: 'none' });
				userHasScopesMock.mockResolvedValue(false);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'all' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(userHasScopesMock).toHaveBeenCalledWith(
					user,
					expect.arrayContaining(['workflow:enableRedaction']),
					false,
					expect.any(Object),
				);
				expect(userHasScopesMock).not.toHaveBeenCalledWith(
					user,
					expect.arrayContaining(['workflow:disableRedaction']),
					false,
					expect.any(Object),
				);
			});

			test('should require disableRedaction for downgrade (all → none)', async () => {
				setupExistingWorkflow({ redactionPolicy: 'all' });
				userHasScopesMock.mockResolvedValue(false);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'none' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(userHasScopesMock).toHaveBeenCalledWith(
					user,
					expect.arrayContaining(['workflow:disableRedaction']),
					false,
					expect.any(Object),
				);
				expect(userHasScopesMock).not.toHaveBeenCalledWith(
					user,
					expect.arrayContaining(['workflow:enableRedaction']),
					false,
					expect.any(Object),
				);
			});

			test('should require disableRedaction for partial downgrade (all → non-manual)', async () => {
				setupExistingWorkflow({ redactionPolicy: 'all' });
				userHasScopesMock.mockResolvedValue(false);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'non-manual' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(userHasScopesMock).toHaveBeenCalledWith(
					user,
					expect.arrayContaining(['workflow:disableRedaction']),
					false,
					expect.any(Object),
				);
			});

			test('should require disableRedaction for partial downgrade (all → manual-only)', async () => {
				setupExistingWorkflow({ redactionPolicy: 'all' });
				userHasScopesMock.mockResolvedValue(false);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'manual-only' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(userHasScopesMock).toHaveBeenCalledWith(
					user,
					expect.arrayContaining(['workflow:disableRedaction']),
					false,
					expect.any(Object),
				);
			});

			test('should require both scopes for mixed transition (non-manual → manual-only)', async () => {
				setupExistingWorkflow({ redactionPolicy: 'non-manual' });
				userHasScopesMock.mockResolvedValue(false);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'manual-only' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(userHasScopesMock).toHaveBeenCalledWith(
					user,
					expect.arrayContaining(['workflow:enableRedaction', 'workflow:disableRedaction']),
					false,
					expect.any(Object),
				);
			});

			test('should require both scopes for mixed transition (manual-only → non-manual)', async () => {
				setupExistingWorkflow({ redactionPolicy: 'manual-only' });
				userHasScopesMock.mockResolvedValue(false);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'non-manual' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(userHasScopesMock).toHaveBeenCalledWith(
					user,
					expect.arrayContaining(['workflow:enableRedaction', 'workflow:disableRedaction']),
					false,
					expect.any(Object),
				);
			});

			test('should strip policy when user lacks required scope', async () => {
				setupExistingWorkflow({ redactionPolicy: 'all' });
				userHasScopesMock.mockResolvedValue(false);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'non-manual' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
					'workflow-1',
					expect.objectContaining({
						settings: expect.not.objectContaining({ redactionPolicy: 'non-manual' }),
					}),
					expect.anything(),
				);
			});

			test('should preserve policy when user has required scope', async () => {
				setupExistingWorkflow({ redactionPolicy: 'all' });
				userHasScopesMock.mockResolvedValue(true);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'non-manual' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
					'workflow-1',
					expect.objectContaining({
						settings: expect.objectContaining({ redactionPolicy: 'non-manual' }),
					}),
					expect.anything(),
				);
			});

			test('should strip policy when user has only disableRedaction for mixed transition (non-manual → manual-only)', async () => {
				setupExistingWorkflow({ redactionPolicy: 'non-manual' });
				userHasScopesMock.mockImplementation(
					async (_user, scopes) =>
						Array.isArray(scopes) &&
						scopes.includes('workflow:disableRedaction') &&
						!scopes.includes('workflow:enableRedaction'),
				);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'manual-only' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
					'workflow-1',
					expect.objectContaining({
						settings: expect.not.objectContaining({ redactionPolicy: 'manual-only' }),
					}),
					expect.anything(),
				);
			});

			test('should strip policy when user has only enableRedaction for mixed transition (non-manual → manual-only)', async () => {
				setupExistingWorkflow({ redactionPolicy: 'non-manual' });
				userHasScopesMock.mockImplementation(
					async (_user, scopes) =>
						Array.isArray(scopes) &&
						scopes.includes('workflow:enableRedaction') &&
						!scopes.includes('workflow:disableRedaction'),
				);

				const user = mock<User>();
				await workflowService.update(
					user,
					createUpdateData({ redactionPolicy: 'manual-only' }),
					'workflow-1',
					{ forceSave: true },
				);

				expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
					'workflow-1',
					expect.objectContaining({
						settings: expect.not.objectContaining({ redactionPolicy: 'manual-only' }),
					}),
					expect.anything(),
				);
			});
		});
	});

	describe('workflow.activate hook', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowHistoryServiceMock: MockProxy<WorkflowHistoryService>;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let workflowPublishHistoryRepositoryMock: MockProxy<WorkflowPublishHistoryRepository>;
		let outboxRepositoryMock: MockProxy<WorkflowPublicationOutboxRepository>;
		let globalConfigMock: MockProxy<GlobalConfig>;
		let activeWorkflowManagerMock: MockProxy<ActiveWorkflowManager>;
		let externalHooksMock: MockProxy<ExternalHooks>;
		let eventServiceMock: MockProxy<EventService>;
		let scheduleTriggerJobRegistrarMock: MockProxy<ScheduleTriggerJobRegistrar>;
		let workflowHookContextServiceMock: MockProxy<WorkflowHookContextService>;
		let pollTriggerJobRegistrarMock: MockProxy<PollTriggerJobRegistrar>;
		let workflowPublishGuardMock: MockProxy<WorkflowPublishGuardProxy>;
		let workflowMutationHooksMock: MockProxy<WorkflowMutationHooksProxy>;
		let policyEnforcementServiceMock: MockProxy<PolicyEnforcementService>;
		let ownershipServiceMock: MockProxy<OwnershipService>;

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
			workflow.activeVersion = makeActiveVersion();
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

		function makeActiveVersion(): WorkflowHistory {
			const version = new WorkflowHistory();
			version.versionId = PREVIOUS_VERSION_ID;
			version.nodes = [{ name: 'Active node' } as INode];
			version.connections = { Active: {} } as IConnections;
			return version;
		}

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowHistoryServiceMock = mock<WorkflowHistoryService>();
			workflowRepositoryMock = mock();
			workflowPublishHistoryRepositoryMock = mock();
			outboxRepositoryMock = mock();
			globalConfigMock = mock<GlobalConfig>({
				workflows: mock<WorkflowsConfig>({ useWorkflowPublicationService: false }),
			});
			activeWorkflowManagerMock = mock();
			externalHooksMock = mock<ExternalHooks>();
			eventServiceMock = mock<EventService>();
			scheduleTriggerJobRegistrarMock = mock();
			workflowHookContextServiceMock = mock<WorkflowHookContextService>();
			pollTriggerJobRegistrarMock = mock();
			workflowPublishGuardMock = mock<WorkflowPublishGuardProxy>();
			workflowMutationHooksMock = mock<WorkflowMutationHooksProxy>();
			// Stands in for the dummy always-allow check: with no backend registered the
			// real service clears every publish.
			policyEnforcementServiceMock = mock<PolicyEnforcementService>();
			policyEnforcementServiceMock.hasChecksFor.mockReturnValue(true);
			ownershipServiceMock = mock<OwnershipService>();
			ownershipServiceMock.getWorkflowProjectCached.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);

			workflowRepositoryMock.create.mockImplementation(
				(data) => Object.assign(new WorkflowEntity(), data) as WorkflowEntity,
			);

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock, // workflowRepository
				mock(), // workflowTagMappingRepository
				ownershipServiceMock, // ownershipService
				mock(), // tagService
				workflowHistoryServiceMock, // workflowHistoryService
				externalHooksMock, // externalHooks
				activeWorkflowManagerMock, // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionPersistence
				eventServiceMock, // eventService
				globalConfigMock, // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				workflowPublishHistoryRepositoryMock, // workflowPublishHistoryRepository
				outboxRepositoryMock, // outboxRepository
				Object.assign(mock<WorkflowValidationService>(), {
					validateCredentialNodeRestrictions: () => ({ isValid: true }),
				}), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				scheduleTriggerJobRegistrarMock, // scheduleTriggerJobRegistrar
				pollTriggerJobRegistrarMock, // pollTriggerJobRegistrar
				mock(), // workflowScheduledJobOwner
				mock(), // durableJobProvisioner
				mock(), // workflowPublishedVersionRepository
				workflowHookContextServiceMock, // workflowHookContextService
				workflowPublishGuardMock, // workflowPublishGuard
				workflowMutationHooksMock, // workflowMutationHooks
				policyEnforcementServiceMock, // policyEnforcementService
				mock(), // workflowPublicationStatusService
			);

			// Bypass validation internals
			const internals = workflowService as unknown as {
				_detectWebhookConflicts: () => Promise<void>;
				_validateNodes: () => void;
				_validateDynamicCredentials: () => Promise<void>;
				_validateSubWorkflowReferences: () => Promise<void>;
				_validateTriggerNodeIds: () => void;
			};
			vi.spyOn(internals, '_detectWebhookConflicts').mockResolvedValue(undefined);
			vi.spyOn(internals, '_validateNodes').mockReturnValue(undefined);
			vi.spyOn(internals, '_validateDynamicCredentials').mockResolvedValue(undefined);
			vi.spyOn(internals, '_validateSubWorkflowReferences').mockResolvedValue(undefined);
			vi.spyOn(internals, '_validateTriggerNodeIds').mockReturnValue(undefined);
		});

		test.each([
			['current publication path', false],
			['outbox publication path', true],
		] as const)(
			'does not start the %s when an open review blocks a first publication',
			async (_path, useWorkflowPublicationService) => {
				globalConfigMock.workflows.useWorkflowPublicationService = useWorkflowPublicationService;
				const workflow = makeWorkflowEntity({ active: false, activeVersionId: null });
				workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
				workflowHistoryServiceMock.getVersion.mockResolvedValue(makeVersionToActivate());
				workflowPublishGuardMock.assertCanPublish.mockRejectedValue(
					new WorkflowPublishBlockedError({
						reason: 'review_pending',
						workflowReviewRequestId: 'review-1',
					}),
				);

				await expect(
					workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
						versionId: TARGET_VERSION_ID,
					}),
				).rejects.toBeInstanceOf(WorkflowPublishBlockedError);

				expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
				expect(activeWorkflowManagerMock.add).not.toHaveBeenCalled();
				expect(outboxRepositoryMock.enqueue).not.toHaveBeenCalled();
				expect(workflowPublishHistoryRepositoryMock.addRecord).not.toHaveBeenCalled();
			},
		);

		test('keeps the previous version running when an open review blocks a replacement', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowHistoryServiceMock.getVersion.mockResolvedValue(makeVersionToActivate());
			workflowPublishGuardMock.assertCanPublish.mockRejectedValue(
				new WorkflowPublishBlockedError({
					reason: 'changes_requested',
					workflowReviewRequestId: 'review-1',
				}),
			);

			await expect(
				workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
					versionId: TARGET_VERSION_ID,
				}),
			).rejects.toBeInstanceOf(WorkflowPublishBlockedError);

			expect(workflow.activeVersionId).toBe(PREVIOUS_VERSION_ID);
			expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
			expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
		});

		test('checks for an open review after the activation hook has accepted the version', async () => {
			const workflow = makeWorkflowEntity({ active: false, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowHistoryServiceMock.getVersion.mockResolvedValue(makeVersionToActivate());
			workflowPublishGuardMock.assertCanPublish.mockRejectedValue(
				new WorkflowPublishBlockedError({
					reason: 'review_pending',
					workflowReviewRequestId: 'review-1',
				}),
			);

			await expect(
				workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID),
			).rejects.toBeInstanceOf(WorkflowPublishBlockedError);

			expect(externalHooksMock.run).toHaveBeenCalledWith('workflow.activate', expect.any(Array));
			expect(externalHooksMock.run.mock.invocationCallOrder[0]).toBeLessThan(
				workflowPublishGuardMock.assertCanPublish.mock.invocationCallOrder[0],
			);
		});

		test('does not check workflow reviews when re-applying the published version', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowHistoryServiceMock.getVersion.mockResolvedValue(makeActiveVersion());
			workflowRepositoryMock.findOne.mockResolvedValue(workflow);
			externalHooksMock.run.mockResolvedValue(undefined);
			vi.spyOn(
				workflowService as unknown as { _addToActiveWorkflowManager: () => Promise<void> },
				'_addToActiveWorkflowManager',
			).mockResolvedValue(undefined);
			workflowPublishGuardMock.assertCanPublish.mockRejectedValue(
				new WorkflowPublishBlockedError({
					reason: 'review_pending',
					workflowReviewRequestId: 'review-1',
				}),
			);

			await workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
				versionId: PREVIOUS_VERSION_ID,
			});

			expect(workflowPublishGuardMock.assertCanPublish).not.toHaveBeenCalled();
		});

		test('does not check workflow reviews while unpublishing', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.deactivateWorkflow(mock<User>(), WORKFLOW_ID);

			expect(workflowPublishGuardMock.assertCanPublish).not.toHaveBeenCalled();
		});

		test('fires the afterWorkflowPublished lifecycle hook once activation is committed', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowHistoryServiceMock.getVersion.mockResolvedValue(makeVersionToActivate());
			workflowRepositoryMock.findOne.mockResolvedValue(workflow);
			externalHooksMock.run.mockResolvedValue(undefined);
			vi.spyOn(
				workflowService as unknown as { _addToActiveWorkflowManager: () => Promise<void> },
				'_addToActiveWorkflowManager',
			).mockResolvedValue(undefined);

			await workflowService.activateWorkflow(mock<User>({ id: 'user-1' }), WORKFLOW_ID, {
				versionId: TARGET_VERSION_ID,
			});

			expect(workflowMutationHooksMock.afterWorkflowPublished).toHaveBeenCalledExactlyOnceWith({
				workflowId: WORKFLOW_ID,
				versionId: TARGET_VERSION_ID,
				userId: 'user-1',
			});
		});

		test('does not fire the afterWorkflowPublished lifecycle hook while unpublishing', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.deactivateWorkflow(mock<User>(), WORKFLOW_ID);

			expect(workflowMutationHooksMock.afterWorkflowPublished).not.toHaveBeenCalled();
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

			vi.spyOn(
				workflowService as unknown as { _addToActiveWorkflowManager: () => Promise<void> },
				'_addToActiveWorkflowManager',
			).mockResolvedValue(undefined);

			const user = mock<User>({
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: mock<Role>({ slug: 'global:admin' }),
			});

			await workflowService.activateWorkflow(user, WORKFLOW_ID, {
				versionId: TARGET_VERSION_ID,
			});

			expect(workflowPublishGuardMock.assertCanPublish).toHaveBeenCalledWith(WORKFLOW_ID);
			expect(externalHooksMock.run).toHaveBeenCalledTimes(1);
			const [hookName, hookArgs] = externalHooksMock.run.mock.calls[0] as [
				string,
				[WorkflowEntity, WorkflowHookContextService, WorkflowLifecycleHookActor],
			];
			expect(hookName).toBe('workflow.activate');
			const [candidate, context, actor] = hookArgs;
			expect(candidate.active).toBe(true);
			expect(candidate.activeVersionId).toBe(TARGET_VERSION_ID);
			expect(candidate.activeVersion).toBe(versionToActivate);
			expect(candidate.nodes).toBe(versionToActivate.nodes);
			expect(candidate.connections).toBe(versionToActivate.connections);
			expect(actor).toEqual({
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: 'global:admin',
			});
			expect(context).toBe(workflowHookContextServiceMock);
		});

		test('with the publication outbox enabled, updates the version, writes history, enqueues and emits events without touching the active workflow manager', async () => {
			globalConfigMock.workflows.useWorkflowPublicationService = true;

			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			const versionToActivate = makeVersionToActivate();
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowHistoryServiceMock.getVersion.mockResolvedValue(versionToActivate);
			workflowRepositoryMock.findOne.mockResolvedValue(workflow);
			externalHooksMock.run.mockResolvedValue(undefined);

			const trx = mock<EntityManager>();
			const managerMock = mock<EntityManager>();
			(managerMock.transaction as unknown as Mock).mockImplementation(
				async (runInTransaction: (entityManager: EntityManager) => Promise<unknown>) =>
					await runInTransaction(trx),
			);
			Object.defineProperty(workflowRepositoryMock, 'manager', {
				value: managerMock,
				configurable: true,
			});

			const addToActiveWorkflowManagerSpy = vi.spyOn(
				workflowService as never,
				'_addToActiveWorkflowManager',
			);

			const user = mock<User>({ id: 'user-1' });

			await workflowService.activateWorkflow(user, WORKFLOW_ID, {
				versionId: TARGET_VERSION_ID,
			});

			// activeVersionId + active are updated inside the transaction
			expect(trx.update).toHaveBeenCalledWith(
				WorkflowEntity,
				{ id: WORKFLOW_ID },
				expect.objectContaining({ active: true, activeVersionId: TARGET_VERSION_ID }),
			);
			// the outbox record is enqueued in the same transaction
			expect(outboxRepositoryMock.enqueue).toHaveBeenCalledWith(
				WORKFLOW_ID,
				TARGET_VERSION_ID,
				'publish',
				trx,
			);
			// publish-history records (deactivated for the previous version, activated for the
			// target) are written in the same transaction
			expect(workflowPublishHistoryRepositoryMock.addRecord).toHaveBeenCalledWith(
				expect.objectContaining({ event: 'deactivated', versionId: PREVIOUS_VERSION_ID }),
				trx,
			);
			expect(workflowPublishHistoryRepositoryMock.addRecord).toHaveBeenCalledWith(
				expect.objectContaining({ event: 'activated', versionId: TARGET_VERSION_ID }),
				trx,
			);
			expect(eventServiceMock.emit).toHaveBeenNthCalledWith(1, 'workflow-deactivated', {
				user,
				workflowId: WORKFLOW_ID,
				workflow,
				publicApi: false,
				deactivatedVersionId: PREVIOUS_VERSION_ID,
				source: 'ui',
			});
			expect(eventServiceMock.emit).toHaveBeenNthCalledWith(2, 'workflow-activated', {
				user,
				workflowId: WORKFLOW_ID,
				workflow: expect.objectContaining({
					active: true,
					activeVersionId: TARGET_VERSION_ID,
					activeVersion: versionToActivate,
					nodes: versionToActivate.nodes,
					connections: versionToActivate.connections,
				}),
				publicApi: false,
				source: 'ui',
			});
			// trigger reapplication is deferred to the consumer
			expect(addToActiveWorkflowManagerSpy).not.toHaveBeenCalled();
			expect(activeWorkflowManagerMock.add).not.toHaveBeenCalled();
			expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
			expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
		});

		test('deactivating through the outbox removes the durable schedule jobs in the same transaction, without routing through the leader', async () => {
			globalConfigMock.workflows.useWorkflowPublicationService = true;

			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			const trx = mock<EntityManager>();
			const managerMock = mock<EntityManager>();
			(managerMock.transaction as unknown as Mock).mockImplementation(
				async (runInTransaction: (entityManager: EntityManager) => Promise<unknown>) =>
					await runInTransaction(trx),
			);
			Object.defineProperty(workflowRepositoryMock, 'manager', {
				value: managerMock,
				configurable: true,
			});

			const user = mock<User>({ id: 'user-1' });

			await workflowService.deactivateWorkflow(user, WORKFLOW_ID);

			// active=false and the durable-job removal commit in the same transaction
			expect(trx.update).toHaveBeenCalledWith(
				WorkflowEntity,
				{ id: WORKFLOW_ID },
				expect.objectContaining({ active: false, activeVersionId: null }),
			);
			expect(scheduleTriggerJobRegistrarMock.removeWorkflowInTransaction).toHaveBeenCalledWith(
				trx,
				WORKFLOW_ID,
			);
			expect(pollTriggerJobRegistrarMock.removeWorkflowInTransaction).toHaveBeenCalledWith(
				trx,
				WORKFLOW_ID,
			);
			// in-memory teardown is left to the leader, not run here
			expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
		});

		test('deactivation blocked by hook leaves the workflow published', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			externalHooksMock.run.mockRejectedValue(new Error('Code freeze in effect'));

			const user = mock<User>();

			await expect(workflowService.deactivateWorkflow(user, WORKFLOW_ID)).rejects.toBeInstanceOf(
				WorkflowDeactivationBadRequestError,
			);

			expect(workflow.active).toBe(true);
			expect(workflow.activeVersionId).toBe(PREVIOUS_VERSION_ID);
			expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
			expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
			expect(workflowPublishHistoryRepositoryMock.addRecord).not.toHaveBeenCalled();
		});

		test('hook receives the active version being deactivated and the acting user', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			const activeVersion = workflow.activeVersion as WorkflowHistory;
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			externalHooksMock.run.mockResolvedValue(undefined);

			const user = mock<User>({
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: mock<Role>({ slug: 'global:admin' }),
			});

			await workflowService.deactivateWorkflow(user, WORKFLOW_ID);

			expect(externalHooksMock.run).toHaveBeenCalledTimes(1);
			const [hookName, hookArgs] = externalHooksMock.run.mock.calls[0] as [
				string,
				[WorkflowEntity, WorkflowHookContextService, WorkflowLifecycleHookActor],
			];
			expect(hookName).toBe('workflow.deactivate');
			const [candidate, context, actor] = hookArgs;
			expect(candidate.activeVersionId).toBe(PREVIOUS_VERSION_ID);
			expect(candidate.versionId).toBe(PREVIOUS_VERSION_ID);
			expect(candidate.activeVersion).toBeNull();
			expect(candidate.nodes).toBe(activeVersion.nodes);
			expect(candidate.connections).toBe(activeVersion.connections);
			expect(actor).toEqual({
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: 'global:admin',
			});
			expect(context).toBe(workflowHookContextServiceMock);
		});

		test('hook is not given the draft when it differs from the active version', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			externalHooksMock.run.mockResolvedValue(undefined);

			await workflowService.deactivateWorkflow(mock<User>(), WORKFLOW_ID);

			const [, hookArgs] = externalHooksMock.run.mock.calls[0] as [
				string,
				[WorkflowEntity, WorkflowHookContextService, WorkflowLifecycleHookActor],
			];
			expect(hookArgs[0].nodes).not.toBe(workflow.nodes);
			expect(hookArgs[0].connections).not.toBe(workflow.connections);
		});

		test('still deactivates when the active version cannot be read', async () => {
			const workflow = makeWorkflowEntity({
				activeVersionId: PREVIOUS_VERSION_ID,
				activeVersion: null,
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			externalHooksMock.run.mockResolvedValue(undefined);

			await workflowService.deactivateWorkflow(mock<User>(), WORKFLOW_ID);

			expect(externalHooksMock.run).toHaveBeenCalledTimes(1);
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				WORKFLOW_ID,
				expect.objectContaining({ active: false, activeVersionId: null }),
			);
		});

		test('does not run the hook when the workflow is already inactive', async () => {
			const workflow = makeWorkflowEntity({ active: false, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			const user = mock<User>();

			await workflowService.deactivateWorkflow(user, WORKFLOW_ID);

			expect(externalHooksMock.run).not.toHaveBeenCalled();
		});

		describe('policy enforcement', () => {
			const arrangeSuccessfulActivation = (workflow: WorkflowEntity) => {
				workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
				workflowRepositoryMock.findOne.mockResolvedValue(workflow);
				externalHooksMock.run.mockResolvedValue(undefined);
				vi.spyOn(
					workflowService as unknown as { _addToActiveWorkflowManager: () => Promise<void> },
					'_addToActiveWorkflowManager',
				).mockResolvedValue(undefined);
			};

			test('enforces the publish with the version being activated and the owning project', async () => {
				const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
				const versionToActivate = makeVersionToActivate();
				arrangeSuccessfulActivation(workflow);
				workflowHistoryServiceMock.getVersion.mockResolvedValue(versionToActivate);

				await workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
					versionId: TARGET_VERSION_ID,
				});

				expect(policyEnforcementServiceMock.enforceWorkflowPublish).toHaveBeenCalledExactlyOnceWith(
					{
						workflow: {
							id: WORKFLOW_ID,
							name: workflow.name,
							nodes: versionToActivate.nodes,
						},
						projectId: 'project-1',
					},
				);
			});

			// The candidate shares its node array with the version row, so an in-place
			// mutation would otherwise be policed even though it is never persisted.
			test('polices the version even when the hook mutates the nodes in place', async () => {
				const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
				const versionToActivate = makeVersionToActivate();
				const originalNodes = [...versionToActivate.nodes];
				arrangeSuccessfulActivation(workflow);
				workflowHistoryServiceMock.getVersion.mockResolvedValue(versionToActivate);

				externalHooksMock.run.mockImplementation(async (_name, args) => {
					const [candidate] = args as unknown as [WorkflowEntity];
					candidate.nodes.push({ name: 'Injected by hook' } as INode);
				});

				await workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
					versionId: TARGET_VERSION_ID,
				});

				expect(policyEnforcementServiceMock.enforceWorkflowPublish).toHaveBeenCalledWith(
					expect.objectContaining({
						workflow: expect.objectContaining({ nodes: originalNodes }),
					}),
				);
			});

			// Only the version row gets registered, so a hook that rewrites the candidate
			// changes a graph that never runs.
			test('polices the version being published, not a hook-mutated candidate', async () => {
				const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
				const versionToActivate = makeVersionToActivate();
				arrangeSuccessfulActivation(workflow);
				workflowHistoryServiceMock.getVersion.mockResolvedValue(versionToActivate);

				externalHooksMock.run.mockImplementation(async (_name, args) => {
					const [candidate] = args as unknown as [WorkflowEntity];
					candidate.nodes = [{ name: 'Rewritten by hook' } as INode];
				});

				await workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
					versionId: TARGET_VERSION_ID,
				});

				expect(policyEnforcementServiceMock.enforceWorkflowPublish).toHaveBeenCalledWith(
					expect.objectContaining({
						workflow: expect.objectContaining({ nodes: versionToActivate.nodes }),
					}),
				);
			});

			// Unlike the review gate: re-applying the current version still re-registers.
			test('enforces when re-applying the already-published version', async () => {
				const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
				arrangeSuccessfulActivation(workflow);
				workflowHistoryServiceMock.getVersion.mockResolvedValue(makeActiveVersion());

				await workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
					versionId: PREVIOUS_VERSION_ID,
				});

				expect(workflowPublishGuardMock.assertCanPublish).not.toHaveBeenCalled();
				expect(policyEnforcementServiceMock.enforceWorkflowPublish).toHaveBeenCalledTimes(1);
			});

			test.each([
				['current publication path', false],
				['outbox publication path', true],
			] as const)(
				'publishes nothing on the %s when policy blocks the version',
				async (_path, useWorkflowPublicationService) => {
					globalConfigMock.workflows.useWorkflowPublicationService = useWorkflowPublicationService;
					const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
					arrangeSuccessfulActivation(workflow);
					workflowHistoryServiceMock.getVersion.mockResolvedValue(makeVersionToActivate());
					policyEnforcementServiceMock.enforceWorkflowPublish.mockRejectedValue(
						new PolicyViolationError([
							{ kind: 'node-type-unavailable', checkId: 'check-1', message: 'Blocked' },
						]),
					);

					await expect(
						workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
							versionId: TARGET_VERSION_ID,
						}),
					).rejects.toBeInstanceOf(PolicyViolationError);

					expect(workflow.activeVersionId).toBe(PREVIOUS_VERSION_ID);
					expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
					expect(activeWorkflowManagerMock.add).not.toHaveBeenCalled();
					expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
					expect(outboxRepositoryMock.enqueue).not.toHaveBeenCalled();
					expect(workflowPublishHistoryRepositoryMock.addRecord).not.toHaveBeenCalled();
					expect(workflowMutationHooksMock.afterWorkflowPublished).not.toHaveBeenCalled();
				},
			);

			test('does not enforce while unpublishing', async () => {
				const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
				workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

				await workflowService.deactivateWorkflow(mock<User>(), WORKFLOW_ID);

				expect(policyEnforcementServiceMock.enforceWorkflowPublish).not.toHaveBeenCalled();
			});

			// An unevaluated project rule is not a passed one, so the lookup is unguarded.
			test('propagates a failed ownership lookup instead of policing a null scope', async () => {
				const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
				arrangeSuccessfulActivation(workflow);
				workflowHistoryServiceMock.getVersion.mockResolvedValue(makeVersionToActivate());
				ownershipServiceMock.getWorkflowProjectCached.mockRejectedValue(new Error('no owner row'));

				await expect(
					workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
						versionId: TARGET_VERSION_ID,
					}),
				).rejects.toThrow('no owner row');

				expect(policyEnforcementServiceMock.enforceWorkflowPublish).not.toHaveBeenCalled();
			});

			// A feature that is merely absent must not cost a lookup on every publish.
			test('does not resolve ownership when no check is registered', async () => {
				const workflow = makeWorkflowEntity({ activeVersionId: PREVIOUS_VERSION_ID });
				arrangeSuccessfulActivation(workflow);
				workflowHistoryServiceMock.getVersion.mockResolvedValue(makeVersionToActivate());
				policyEnforcementServiceMock.hasChecksFor.mockReturnValue(false);

				await workflowService.activateWorkflow(mock<User>(), WORKFLOW_ID, {
					versionId: TARGET_VERSION_ID,
				});

				expect(ownershipServiceMock.getWorkflowProjectCached).not.toHaveBeenCalled();
				expect(policyEnforcementServiceMock.enforceWorkflowPublish).not.toHaveBeenCalled();
			});
		});
	});

	describe('deactivateWorkflowAsSystem()', () => {
		let workflowService: WorkflowService;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let workflowPublishHistoryRepositoryMock: MockProxy<WorkflowPublishHistoryRepository>;
		let globalConfigMock: MockProxy<GlobalConfig>;
		let activeWorkflowManagerMock: MockProxy<ActiveWorkflowManager>;
		let externalHooksMock: MockProxy<ExternalHooks>;

		const WORKFLOW_ID = 'workflow-1';
		const ACTIVE_VERSION_ID = 'v1';

		function makeWorkflowEntity(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
			const workflow = new WorkflowEntity();
			workflow.id = WORKFLOW_ID;
			workflow.name = 'My workflow';
			workflow.versionId = 'v2';
			workflow.activeVersionId = ACTIVE_VERSION_ID;
			workflow.active = true;
			workflow.nodes = [];
			workflow.connections = {};
			workflow.updatedAt = new Date();
			Object.assign(workflow, overrides);
			return workflow;
		}

		beforeEach(() => {
			workflowRepositoryMock = mock();
			workflowPublishHistoryRepositoryMock = mock();
			globalConfigMock = mock<GlobalConfig>({
				workflows: mock<WorkflowsConfig>({ useWorkflowPublicationService: false }),
			});
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
				mock(), // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				externalHooksMock, // externalHooks
				activeWorkflowManagerMock, // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionPersistence
				mock(), // eventService
				globalConfigMock, // globalConfig
				mock(), // folderRepository
				mock(), // workflowFinderService
				workflowPublishHistoryRepositoryMock, // workflowPublishHistoryRepository
				mock(), // outboxRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				mock(), // scheduleTriggerJobRegistrar
				mock(), // pollTriggerJobRegistrar
				mock(), // workflowScheduledJobOwner
				mock(), // durableJobProvisioner
				mock(), // workflowPublishedVersionRepository
				mock(), // workflowHookContextService
				mock(), // workflowPublishGuard
				mock(), // workflowMutationHooks
				mock(), // policyEnforcementService
				mock(), // workflowPublicationStatusService
			);
		});

		test('proceeds with deactivation when the workflow.deactivate hook fails', async () => {
			workflowRepositoryMock.findOne.mockResolvedValue(makeWorkflowEntity());
			externalHooksMock.run.mockRejectedValue(new Error('Code freeze in effect'));

			await expect(
				workflowService.deactivateWorkflowAsSystem(WORKFLOW_ID),
			).resolves.toBeUndefined();

			expect(activeWorkflowManagerMock.remove).toHaveBeenCalledWith(WORKFLOW_ID);
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				WORKFLOW_ID,
				expect.objectContaining({ active: false, activeVersionId: null }),
			);
			expect(workflowPublishHistoryRepositoryMock.addRecord).toHaveBeenCalledWith({
				workflowId: WORKFLOW_ID,
				versionId: ACTIVE_VERSION_ID,
				event: 'deactivated',
				userId: null,
			});
		});

		test('does nothing when the workflow does not exist', async () => {
			workflowRepositoryMock.findOne.mockResolvedValue(null);

			await workflowService.deactivateWorkflowAsSystem(WORKFLOW_ID);

			expect(externalHooksMock.run).not.toHaveBeenCalled();
			expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
			expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
			expect(workflowPublishHistoryRepositoryMock.addRecord).not.toHaveBeenCalled();
		});

		test('does nothing when the workflow is not published', async () => {
			workflowRepositoryMock.findOne.mockResolvedValue(
				makeWorkflowEntity({ active: false, activeVersionId: null }),
			);

			await workflowService.deactivateWorkflowAsSystem(WORKFLOW_ID);

			expect(externalHooksMock.run).not.toHaveBeenCalled();
			expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
			expect(workflowRepositoryMock.update).not.toHaveBeenCalled();
			expect(workflowPublishHistoryRepositoryMock.addRecord).not.toHaveBeenCalled();
		});
	});

	describe('delete()', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let executionPersistenceMock: MockProxy<ExecutionPersistence>;
		let globalConfigMock: MockProxy<GlobalConfig>;
		let activeWorkflowManagerMock: MockProxy<ActiveWorkflowManager>;
		let externalHooksMock: MockProxy<ExternalHooks>;
		let workflowPublishedVersionRepositoryMock: MockProxy<WorkflowPublishedVersionRepository>;
		let workflowMutationHooksMock: MockProxy<WorkflowMutationHooksProxy>;
		let ownershipServiceMock: MockProxy<OwnershipService>;
		let sharedWorkflowRepositoryMock: MockProxy<SharedWorkflowRepository>;
		let deleteEventServiceMock: MockProxy<EventService>;
		let workflowScheduledJobOwnerMock: MockProxy<WorkflowScheduledJobOwner>;
		let durableJobProvisionerMock: MockProxy<DurableJobProvisioner>;
		let trxMock: MockProxy<EntityManager>;

		const WORKFLOW_ID = 'workflow-1';
		const WORKFLOW_OWNER_REF = { ownerType: 'workflow', ownerId: WORKFLOW_ID };

		function makeWorkflowEntity(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
			const workflow = new WorkflowEntity();
			workflow.id = WORKFLOW_ID;
			workflow.name = 'My workflow';
			workflow.isArchived = false;
			workflow.active = false;
			workflow.activeVersionId = null;
			Object.assign(workflow, overrides);
			return workflow;
		}

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			ownershipServiceMock = mock<OwnershipService>();
			sharedWorkflowRepositoryMock = mock<SharedWorkflowRepository>();
			deleteEventServiceMock = mock<EventService>();
			workflowRepositoryMock = mock();
			executionPersistenceMock = mock();
			activeWorkflowManagerMock = mock();
			externalHooksMock = mock<ExternalHooks>();
			workflowMutationHooksMock = mock<WorkflowMutationHooksProxy>();
			workflowPublishedVersionRepositoryMock = mock<WorkflowPublishedVersionRepository>();
			workflowPublishedVersionRepositoryMock.getPublishedVersionId.mockResolvedValue(null);
			workflowScheduledJobOwnerMock = mock<WorkflowScheduledJobOwner>();
			workflowScheduledJobOwnerMock.ref.mockReturnValue(WORKFLOW_OWNER_REF);
			durableJobProvisionerMock = mock<DurableJobProvisioner>();
			globalConfigMock = mock<GlobalConfig>({
				workflows: mock<WorkflowsConfig>({ useWorkflowPublicationService: true }),
			});

			trxMock = mock<EntityManager>();
			workflowRepositoryMock.runInTransaction.mockImplementation(
				async (ctx, runInTransaction) => await runInTransaction(trxMock, ctx),
			);

			workflowService = new WorkflowService(
				mock(), // logger
				sharedWorkflowRepositoryMock, // sharedWorkflowRepository
				workflowRepositoryMock, // workflowRepository
				mock(), // workflowTagMappingRepository
				ownershipServiceMock, // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				externalHooksMock, // externalHooks
				activeWorkflowManagerMock, // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				executionPersistenceMock, // executionPersistence
				deleteEventServiceMock, // eventService
				globalConfigMock, // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // outboxRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				mock(), // scheduleTriggerJobRegistrar
				mock(), // pollTriggerJobRegistrar
				workflowScheduledJobOwnerMock, // workflowScheduledJobOwner
				durableJobProvisionerMock, // durableJobProvisioner
				workflowPublishedVersionRepositoryMock, // workflowPublishedVersionRepository
				mock(), // workflowHookContextService
				mock(), // workflowPublishGuard
				workflowMutationHooksMock, // workflowMutationHooks
				mock(), // policyEnforcementService
				mock(), // workflowPublicationStatusService
			);
		});

		test("emits the deleted workflow's name and owning project, captured before the cascade", async () => {
			const user = mock<User>({ id: 'user-1' });
			const workflow = makeWorkflowEntity({ isArchived: true });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			sharedWorkflowRepositoryMock.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);

			await workflowService.delete(user, WORKFLOW_ID);

			expect(deleteEventServiceMock.emit).toHaveBeenCalledWith('workflow-deleted', {
				user,
				workflowId: WORKFLOW_ID,
				workflowName: 'My workflow',
				projectId: 'project-1',
				publicApi: false,
			});
		});

		test('deletes the workflow even when no owning project can be resolved', async () => {
			const user = mock<User>({ id: 'user-1' });
			const workflow = makeWorkflowEntity({ isArchived: true });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			// An unowned workflow must not turn a delete into a failure just to record it.
			sharedWorkflowRepositoryMock.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(workflowService.delete(user, WORKFLOW_ID)).resolves.toBeDefined();

			expect(deleteEventServiceMock.emit).toHaveBeenCalledWith(
				'workflow-deleted',
				expect.objectContaining({ projectId: undefined }),
			);
		});

		test('throws ConflictError when deleting a published workflow', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: 'v1' });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await expect(workflowService.delete(mock<User>(), WORKFLOW_ID, true)).rejects.toBeInstanceOf(
				ConflictError,
			);

			expect(trxMock.delete).not.toHaveBeenCalled();
		});

		test('throws ConflictError while the published-version mapping still exists', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			// The unpublish outbox record has not been consumed yet.
			workflowPublishedVersionRepositoryMock.getPublishedVersionId.mockResolvedValue('v1');

			await expect(workflowService.delete(mock<User>(), WORKFLOW_ID)).rejects.toThrowError(
				'Workflow is still being unpublished. Please try again in a few moments.',
			);

			expect(trxMock.delete).not.toHaveBeenCalled();
		});

		test('deletes a workflow whose active version was set while publication service was off', async () => {
			globalConfigMock.workflows.useWorkflowPublicationService = false;
			const workflow = makeWorkflowEntity({ active: true, activeVersionId: 'v1' });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(activeWorkflowManagerMock.remove).toHaveBeenCalledWith(WORKFLOW_ID);
			expect(trxMock.delete).toHaveBeenCalledWith(WorkflowEntity, { id: WORKFLOW_ID });
		});

		test('deletes an unpublished workflow when publication service is on', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(trxMock.delete).toHaveBeenCalledWith(WorkflowEntity, { id: WORKFLOW_ID });
		});

		// Nothing in the database removes a workflow's scheduled jobs with it, so the
		// delete has to do it in the same transaction as the row delete. A deprovision
		// of its own would strip the schedules of a workflow that survives a failed
		// delete.
		test('deprovisions the scheduled jobs the workflow owned in the row delete transaction', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(workflowScheduledJobOwnerMock.ref).toHaveBeenCalledWith(WORKFLOW_ID);
			expect(
				durableJobProvisionerMock.deprovisionOwnerInTransaction,
			).toHaveBeenCalledExactlyOnceWith(trxMock, WORKFLOW_OWNER_REF);
			expect(durableJobProvisionerMock.deprovisionOwner).not.toHaveBeenCalled();
			expect(
				durableJobProvisionerMock.deprovisionOwnerInTransaction.mock.invocationCallOrder[0],
			).toBeLessThan(trxMock.delete.mock.invocationCallOrder[0]);
		});

		test('deprovisions no scheduled jobs when deletion is rejected', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: 'v1' });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await expect(workflowService.delete(mock<User>(), WORKFLOW_ID, true)).rejects.toBeInstanceOf(
				ConflictError,
			);

			expect(durableJobProvisionerMock.deprovisionOwnerInTransaction).not.toHaveBeenCalled();
		});

		test('runs the beforeWorkflowDeleted lifecycle hook before the row delete', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>({ id: 'user-1' }), WORKFLOW_ID, true);

			expect(workflowMutationHooksMock.beforeWorkflowDeleted).toHaveBeenCalledExactlyOnceWith(
				WORKFLOW_ID,
				'user-1',
			);
			expect(
				workflowMutationHooksMock.beforeWorkflowDeleted.mock.invocationCallOrder[0],
			).toBeLessThan(trxMock.delete.mock.invocationCallOrder[0]);
		});

		test('does not run the beforeWorkflowDeleted lifecycle hook when deletion is rejected', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: 'v1' });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await expect(workflowService.delete(mock<User>(), WORKFLOW_ID, true)).rejects.toBeInstanceOf(
				ConflictError,
			);

			expect(workflowMutationHooksMock.beforeWorkflowDeleted).not.toHaveBeenCalled();
		});

		// The hook captures rows the cascade will destroy, so it must run before any
		// destructive step — not just before the row delete.
		test('runs the beforeWorkflowDeleted lifecycle hook before the executions are purged', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(
				workflowMutationHooksMock.beforeWorkflowDeleted.mock.invocationCallOrder[0],
			).toBeLessThan(executionPersistenceMock.hardDeleteByWorkflowId.mock.invocationCallOrder[0]);
		});

		// It cleans up rows the cascade orphaned, which cannot be found until the row is gone.
		test('runs the afterWorkflowsDeleted lifecycle hook once the row is deleted', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(workflowMutationHooksMock.afterWorkflowsDeleted).toHaveBeenCalledExactlyOnceWith([
				WORKFLOW_ID,
			]);
			expect(
				workflowMutationHooksMock.afterWorkflowsDeleted.mock.invocationCallOrder[0],
			).toBeGreaterThan(trxMock.delete.mock.invocationCallOrder[0]);
		});

		test('deletes the workflow executions before the workflow itself', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(executionPersistenceMock.hardDeleteByWorkflowId).toHaveBeenCalledWith(WORKFLOW_ID);
			expect(
				executionPersistenceMock.hardDeleteByWorkflowId.mock.invocationCallOrder[0],
			).toBeLessThan(trxMock.delete.mock.invocationCallOrder[0]);
		});

		test('invalidates the cached project for the deleted workflow', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(ownershipServiceMock.invalidateWorkflowProjectCacheByIds).toHaveBeenCalledWith([
				WORKFLOW_ID,
			]);
		});

		test('does not invalidate the cached project when the workflow is not found', async () => {
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(null);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(ownershipServiceMock.invalidateWorkflowProjectCacheByIds).not.toHaveBeenCalled();
		});

		test('forwards the acting user to the delete and afterDelete hooks', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			const user = mock<User>({
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: mock<Role>({ slug: 'global:admin' }),
			});

			await workflowService.delete(user, WORKFLOW_ID, true);

			const expectedActor: WorkflowLifecycleHookActor = {
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: 'global:admin',
			};
			expect(externalHooksMock.run).toHaveBeenCalledWith('workflow.delete', [
				WORKFLOW_ID,
				expectedActor,
			]);
			expect(externalHooksMock.run).toHaveBeenCalledWith('workflow.afterDelete', [
				WORKFLOW_ID,
				expectedActor,
			]);
		});
	});

	describe('update() hook', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let externalHooksMock: MockProxy<ExternalHooks>;
		let ownershipServiceMock: MockProxy<OwnershipService>;
		let licenseStateMock: MockProxy<LicenseState>;
		let workflowRepositoryMock: MockProxy<{ update: Mock; updateContent: Mock; findOne: Mock }>;

		const WORKFLOW_ID = 'workflow-1';

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			externalHooksMock = mock<ExternalHooks>();
			ownershipServiceMock = mock<OwnershipService>();
			ownershipServiceMock.getWorkflowProjectCached.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			licenseStateMock = mock<LicenseState>();
			licenseStateMock.isSharingLicensed.mockReturnValue(false);
			workflowRepositoryMock = mock();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock as never, // workflowRepository
				mock(), // workflowTagMappingRepository
				ownershipServiceMock, // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				externalHooksMock, // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionPersistence
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // outboxRepository
				Object.assign(mock<WorkflowValidationService>(), {
					validateCredentialNodeRestrictions: () => ({ isValid: true }),
				}), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				licenseStateMock, // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				mock(), // scheduleTriggerJobRegistrar
				mock(), // pollTriggerJobRegistrar
				mock(), // workflowScheduledJobOwner
				mock(), // durableJobProvisioner
				mock(), // workflowPublishedVersionRepository
				mock(), // workflowHookContextService
				mock(), // workflowPublishGuard
				mock(), // workflowMutationHooks
				mock(), // policyEnforcementService
				mock(), // workflowPublicationStatusService
			);
		});

		test('forwards the acting user to the update and afterUpdate hooks', async () => {
			const workflow = mock<WorkflowEntity>({
				id: WORKFLOW_ID,
				isArchived: false,
				versionId: 'v1',
				nodes: [],
				connections: {},
				settings: {},
				activeVersionId: undefined as unknown as string,
				tags: [],
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowRepositoryMock.findOne.mockResolvedValue(workflow);

			const user = mock<User>({
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: mock<Role>({ slug: 'global:admin' }),
			});

			await workflowService.update(
				user,
				{ nodes: [], connections: {} } as unknown as WorkflowEntity,
				WORKFLOW_ID,
			);

			const expectedActor: WorkflowLifecycleHookActor = {
				id: 'user-1',
				email: 'actor@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
				role: 'global:admin',
			};
			const updateCall = externalHooksMock.run.mock.calls.find((c) => c[0] === 'workflow.update');
			const afterUpdateCall = externalHooksMock.run.mock.calls.find(
				(c) => c[0] === 'workflow.afterUpdate',
			);
			expect(updateCall?.[1]?.[2]).toEqual(expectedActor);
			expect(afterUpdateCall?.[1]?.[2]).toEqual(expectedActor);
		});

		// Bulk import paths (e.g. the n8n-packages workflow importer) pass entities
		// that may carry `isArchived` from the imported payload. Archiving must only
		// happen through `archive()`, which runs its side effects (review auto-close,
		// events) — so `update()` must never persist the flag. If this test breaks,
		// those import paths silently gain an archive bypass.
		test('does not persist isArchived from the update payload', async () => {
			const workflow = mock<WorkflowEntity>({
				id: WORKFLOW_ID,
				isArchived: false,
				versionId: 'v1',
				nodes: [],
				connections: {},
				settings: {},
				activeVersionId: undefined as unknown as string,
				tags: [],
			});
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);
			workflowRepositoryMock.findOne.mockResolvedValue(workflow);

			const user = mock<User>({
				id: 'user-1',
				role: mock<Role>({ slug: 'global:admin' }),
			});

			await workflowService.update(
				user,
				{ nodes: [], connections: {}, isArchived: true } as unknown as WorkflowEntity,
				WORKFLOW_ID,
			);

			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				WORKFLOW_ID,
				expect.not.objectContaining({ isArchived: expect.anything() }),
				expect.anything(),
			);
		});
	});

	describe('update() policy enforcement', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let externalHooksMock: MockProxy<ExternalHooks>;
		let ownershipServiceMock: MockProxy<OwnershipService>;
		let workflowHistoryServiceMock: MockProxy<WorkflowHistoryService>;
		let policyEnforcementServiceMock: MockProxy<PolicyEnforcementService>;
		let workflowRepositoryMock: MockProxy<{ update: Mock; updateContent: Mock; findOne: Mock }>;

		const WORKFLOW_ID = 'workflow-1';
		const storedNodes = [{ name: 'Start' }] as unknown as INode[];

		const makeStoredWorkflow = () =>
			mock<WorkflowEntity>({
				id: WORKFLOW_ID,
				name: 'Stored name',
				isArchived: false,
				versionId: 'v1',
				nodes: storedNodes,
				connections: {},
				settings: {},
				activeVersionId: undefined as unknown as string,
				tags: [],
			});

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			externalHooksMock = mock<ExternalHooks>();
			ownershipServiceMock = mock<OwnershipService>();
			ownershipServiceMock.getWorkflowProjectCached.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			workflowHistoryServiceMock = mock<WorkflowHistoryService>();
			workflowRepositoryMock = mock();

			const licenseStateMock = mock<LicenseState>();
			licenseStateMock.isSharingLicensed.mockReturnValue(false);

			// Stands in for the dummy always-allow check: with no policy backend registered
			// the real service clears every save, so this is what production does by default.
			policyEnforcementServiceMock = mock<PolicyEnforcementService>();
			policyEnforcementServiceMock.enforceWorkflowSave.mockResolvedValue(mock());

			const storedWorkflow = makeStoredWorkflow();
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(storedWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(storedWorkflow);

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock as never, // workflowRepository
				mock(), // workflowTagMappingRepository
				ownershipServiceMock, // ownershipService
				mock(), // tagService
				workflowHistoryServiceMock, // workflowHistoryService
				externalHooksMock, // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionPersistence
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // outboxRepository
				Object.assign(mock<WorkflowValidationService>(), {
					validateCredentialNodeRestrictions: () => ({ isValid: true }),
				}), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				licenseStateMock, // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				mock(), // scheduleTriggerJobRegistrar
				mock(), // pollTriggerJobRegistrar
				mock(), // workflowScheduledJobOwner
				mock(), // durableJobProvisioner
				mock(), // workflowPublishedVersionRepository
				mock(), // workflowHookContextService
				mock(), // workflowPublishGuard
				mock(), // workflowMutationHooks
				policyEnforcementServiceMock, // policyEnforcementService
				mock(), // workflowPublicationStatusService
			);
		});

		it('enforces the save with the submitted workflow, the stored one, and the owning project', async () => {
			const submittedNodes = [{ name: 'Start' }, { name: 'Slack' }] as unknown as INode[];

			await workflowService.update(
				mock<User>({ id: 'user-1' }),
				{ name: 'New name', nodes: submittedNodes, connections: {} } as unknown as WorkflowEntity,
				WORKFLOW_ID,
			);

			expect(policyEnforcementServiceMock.enforceWorkflowSave).toHaveBeenCalledExactlyOnceWith({
				workflow: { id: WORKFLOW_ID, name: 'New name', nodes: submittedNodes },
				storedWorkflow: { id: WORKFLOW_ID, name: 'Stored name', nodes: storedNodes },
				projectId: 'project-1',
			});
		});

		// A partial update (e.g. renaming only) omits `nodes` entirely. The check still needs
		// the effective graph, otherwise it would see an empty workflow and clear anything.
		it('falls back to the stored name and nodes for a partial update', async () => {
			await workflowService.update(
				mock<User>({ id: 'user-1' }),
				{ settings: { timezone: 'Europe/Berlin' } } as unknown as WorkflowEntity,
				WORKFLOW_ID,
			);

			expect(policyEnforcementServiceMock.enforceWorkflowSave).toHaveBeenCalledExactlyOnceWith({
				workflow: { id: WORKFLOW_ID, name: 'Stored name', nodes: storedNodes },
				storedWorkflow: { id: WORKFLOW_ID, name: 'Stored name', nodes: storedNodes },
				projectId: 'project-1',
			});
		});

		it('updates the workflow unchanged when the check clears', async () => {
			await workflowService.update(
				mock<User>({ id: 'user-1' }),
				{ nodes: [], connections: {} } as unknown as WorkflowEntity,
				WORKFLOW_ID,
			);

			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledTimes(1);
		});

		// The content write must go through the token-gated `updateContent`, carrying the
		// clearance minted by `enforceWorkflowSave` on the context.
		it('persists the content through updateContent carrying the policy clearance', async () => {
			const cleared = mock<PolicyCleared<'workflowSave'>>();
			policyEnforcementServiceMock.enforceWorkflowSave.mockResolvedValue(cleared);

			await workflowService.update(
				mock<User>({ id: 'user-1' }),
				{ nodes: [], connections: {} } as unknown as WorkflowEntity,
				WORKFLOW_ID,
			);

			expect(workflowRepositoryMock.updateContent).toHaveBeenCalledWith(
				WORKFLOW_ID,
				expect.anything(),
				{ policyCleared: cleared },
			);
		});

		it('persists nothing when the check throws', async () => {
			const violation = new Error('blocked by policy');
			policyEnforcementServiceMock.enforceWorkflowSave.mockRejectedValue(violation);

			await expect(
				workflowService.update(
					mock<User>({ id: 'user-1' }),
					{ nodes: [], connections: {} } as unknown as WorkflowEntity,
					WORKFLOW_ID,
				),
			).rejects.toThrow(violation);

			expect(workflowRepositoryMock.updateContent).not.toHaveBeenCalled();
			expect(workflowHistoryServiceMock.saveVersion).not.toHaveBeenCalled();
		});

		it('runs the external hook before enforcing, so hook mutations are covered', async () => {
			const callOrder: string[] = [];
			externalHooksMock.run.mockImplementation(async (hookName: string) => {
				callOrder.push(hookName);
			});
			policyEnforcementServiceMock.enforceWorkflowSave.mockImplementation(async () => {
				callOrder.push('enforceWorkflowSave');
				return await mock();
			});

			await workflowService.update(
				mock<User>({ id: 'user-1' }),
				{ nodes: [], connections: {} } as unknown as WorkflowEntity,
				WORKFLOW_ID,
			);

			expect(callOrder.slice(0, 2)).toEqual(['workflow.update', 'enforceWorkflowSave']);
		});
	});

	describe('archive() and unarchive() hooks', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let externalHooksMock: MockProxy<ExternalHooks>;
		let workflowMutationHooksMock: MockProxy<WorkflowMutationHooksProxy>;

		const WORKFLOW_ID = 'workflow-1';

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

		function makeWorkflowEntity(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
			const workflow = new WorkflowEntity();
			workflow.id = WORKFLOW_ID;
			workflow.name = 'My workflow';
			workflow.isArchived = false;
			workflow.active = false;
			workflow.activeVersionId = null;
			Object.assign(workflow, overrides);
			return workflow;
		}

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowRepositoryMock = mock();
			externalHooksMock = mock<ExternalHooks>();
			workflowMutationHooksMock = mock<WorkflowMutationHooksProxy>();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				externalHooksMock, // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionPersistence
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // outboxRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				mock(), // scheduleTriggerJobRegistrar
				mock(), // pollTriggerJobRegistrar
				mock(), // workflowScheduledJobOwner
				mock(), // durableJobProvisioner
				mock(), // workflowPublishedVersionRepository
				mock(), // workflowHookContextService
				mock(), // workflowPublishGuard
				workflowMutationHooksMock, // workflowMutationHooks
				mock(), // policyEnforcementService
				mock(), // workflowPublicationStatusService
			);
		});

		test('forwards the acting user to the afterArchive hook', async () => {
			const workflow = makeWorkflowEntity({ isArchived: false, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.archive(makeActingUser(), WORKFLOW_ID);

			expect(externalHooksMock.run).toHaveBeenCalledWith('workflow.afterArchive', [
				WORKFLOW_ID,
				expectedActor,
			]);
		});

		test('forwards the acting user to the afterUnarchive hook', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.unarchive(makeActingUser(), WORKFLOW_ID);

			expect(externalHooksMock.run).toHaveBeenCalledWith('workflow.afterUnarchive', [
				WORKFLOW_ID,
				expectedActor,
			]);
		});

		test('runs the afterWorkflowArchived lifecycle hook on archive', async () => {
			const workflow = makeWorkflowEntity({ isArchived: false, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.archive(makeActingUser(), WORKFLOW_ID);

			expect(workflowMutationHooksMock.afterWorkflowArchived).toHaveBeenCalledExactlyOnceWith(
				WORKFLOW_ID,
				'user-1',
			);
		});

		test('runs no lifecycle hook when archiving is skipped or on unarchive', async () => {
			const archived = makeWorkflowEntity({ isArchived: true });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(archived);

			await workflowService.archive(makeActingUser(), WORKFLOW_ID, { skipArchived: true });
			await workflowService.unarchive(makeActingUser(), WORKFLOW_ID);

			expect(workflowMutationHooksMock.afterWorkflowArchived).not.toHaveBeenCalled();
			expect(workflowMutationHooksMock.beforeWorkflowDeleted).not.toHaveBeenCalled();
			expect(workflowMutationHooksMock.afterWorkflowsTransferred).not.toHaveBeenCalled();
		});
	});

	describe('updateWorkflowTags()', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowTagMappingRepositoryMock: MockProxy<WorkflowTagMappingRepository>;
		let tagServiceMock: MockProxy<TagService>;

		const WORKFLOW_ID = 'workflow-1';
		const user = mock<User>({ id: 'user-1' });

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowTagMappingRepositoryMock = mock<WorkflowTagMappingRepository>();
			tagServiceMock = mock<TagService>();

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				mock(), // workflowRepository
				workflowTagMappingRepositoryMock, // workflowTagMappingRepository
				mock(), // ownershipService
				tagServiceMock, // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionPersistence
				mock(), // eventService
				mock(), // globalConfig
				mock(), // folderRepository
				workflowFinderServiceMock, // workflowFinderService
				mock(), // workflowPublishHistoryRepository
				mock(), // outboxRepository
				mock(), // workflowValidationService
				mock(), // nodeTypes
				mock(), // webhookService
				mock(), // licenseState
				mock(), // projectRepository
				mock(), // redactionEnforcementService
				mock(), // workflowPublicationNotifier
				mock(), // scheduleTriggerJobRegistrar
				mock(), // pollTriggerJobRegistrar
				mock(), // workflowScheduledJobOwner
				mock(), // durableJobProvisioner
				mock(), // workflowPublishedVersionRepository
				mock(), // workflowHookContextService
				mock(), // workflowPublishGuard
				mock(), // workflowMutationHooks
				mock(), // policyEnforcementService
				mock(), // workflowPublicationStatusService
			);
		});

		test('checks workflow:update and does not overwrite tags when the user cannot access the workflow', async () => {
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(null);

			await expect(
				workflowService.updateWorkflowTags(user, WORKFLOW_ID, ['tag-1']),
			).rejects.toThrow(NotFoundError);

			expect(workflowFinderServiceMock.findWorkflowForUser).toHaveBeenCalledWith(
				WORKFLOW_ID,
				user,
				['workflow:update'],
			);
			expect(workflowTagMappingRepositoryMock.overwriteTaggings).not.toHaveBeenCalled();
			expect(tagServiceMock.getAllByWorkflowId).not.toHaveBeenCalled();
		});

		test('overwrites tag mappings when the user can update the workflow', async () => {
			const tags = [mock<TagEntity>({ id: 'tag-1' })];
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			tagServiceMock.getAllByWorkflowId.mockResolvedValue(tags);

			const result = await workflowService.updateWorkflowTags(user, WORKFLOW_ID, ['tag-1']);

			expect(workflowTagMappingRepositoryMock.overwriteTaggings).toHaveBeenCalledWith(WORKFLOW_ID, [
				'tag-1',
			]);
			expect(result).toBe(tags);
		});

		test('maps missing tag constraint failures to NotFoundError', async () => {
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			workflowTagMappingRepositoryMock.overwriteTaggings.mockRejectedValue(
				new QueryFailedError('INSERT', [], new Error('FK')),
			);

			await expect(
				workflowService.updateWorkflowTags(user, WORKFLOW_ID, ['missing-tag']),
			).rejects.toThrow('Some tags not found');
		});
	});
});

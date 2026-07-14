import type { Mock } from 'vitest';
import type { LicenseState } from '@n8n/backend-common';
import type { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type {
	ExecutionRepository,
	Project,
	User,
	WorkflowRepository,
	WorkflowPublishHistoryRepository,
	WorkflowPublicationOutboxRepository,
} from '@n8n/db';
import { WorkflowEntity, WorkflowHistory } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { EntityManager } from '@n8n/typeorm';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IConnections, INode } from 'n8n-workflow';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { ScheduleTriggerJobRegistrar } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { WorkflowActivationBadRequestError } from '@/errors/response-errors/workflow-activation-bad-request.error';
import type { EventService } from '@/events/event.service';
import type { ExternalHooks } from '@/external-hooks';
import type { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { OwnershipService } from '@/services/ownership.service';
import type { RoleService } from '@/services/role.service';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';
import type { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import * as WorkflowHelpers from '@/workflow-helpers';

vi.mock('@/permissions.ee/check-access');
vi.mock('@/workflow-helpers');
vi.mock('@/generic-helpers');

describe('WorkflowService', () => {
	describe('getMany()', () => {
		let workflowService: WorkflowService;
		let workflowRepositoryMock: MockProxy<{
			getManyAndCountWithSharingSubquery: Mock;
		}>;
		let roleServiceMock: MockProxy<RoleService>;
		let webhookServiceMock: MockProxy<WebhookService>;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;

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
				undefined, // callableForParentWorkflowId
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
				undefined, // callableForParentWorkflowId
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
	});

	describe('update() redactionPolicy scope enforcement', () => {
		const userHasScopesMock = vi.mocked(userHasScopes);
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowHistoryServiceMock: MockProxy<WorkflowHistoryService>;
		let licenseStateMock: MockProxy<LicenseState>;
		let redactionEnforcementServiceMock: MockProxy<RedactionEnforcementService>;
		let workflowRepositoryMock: MockProxy<{
			update: Mock;
			findOne: Mock;
		}>;

		beforeEach(() => {
			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowHistoryServiceMock = mock<WorkflowHistoryService>();
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
				workflowHistoryServiceMock, // workflowHistoryService
				mock(), // externalHooks
				mock(), // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				mock(), // executionRepository
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
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.not.objectContaining({ redactionPolicy: 'all' }),
				}),
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
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'all' }),
				}),
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
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({
						redactionPolicy: 'none',
						timezone: 'Europe/Berlin',
					}),
				}),
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
			expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
				'workflow-1',
				expect.objectContaining({
					settings: expect.objectContaining({ redactionPolicy: 'none' }),
				}),
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

				expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
					'workflow-1',
					expect.objectContaining({
						settings: expect.not.objectContaining({ redactionPolicy: 'non-manual' }),
					}),
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

				expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
					'workflow-1',
					expect.objectContaining({
						settings: expect.objectContaining({ redactionPolicy: 'non-manual' }),
					}),
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

				expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
					'workflow-1',
					expect.objectContaining({
						settings: expect.not.objectContaining({ redactionPolicy: 'manual-only' }),
					}),
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

				expect(workflowRepositoryMock.update).toHaveBeenCalledWith(
					'workflow-1',
					expect.objectContaining({
						settings: expect.not.objectContaining({ redactionPolicy: 'manual-only' }),
					}),
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
			outboxRepositoryMock = mock();
			globalConfigMock = mock<GlobalConfig>({
				workflows: mock<WorkflowsConfig>({ useWorkflowPublicationService: false }),
			});
			activeWorkflowManagerMock = mock();
			externalHooksMock = mock<ExternalHooks>();
			eventServiceMock = mock<EventService>();
			scheduleTriggerJobRegistrarMock = mock();

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
			);

			// Bypass validation internals
			const internals = workflowService as unknown as {
				_detectWebhookConflicts: () => Promise<void>;
				_validateNodes: () => void;
				_validateDynamicCredentials: () => Promise<void>;
				_validateSubWorkflowReferences: () => Promise<void>;
			};
			vi.spyOn(internals, '_detectWebhookConflicts').mockResolvedValue(undefined);
			vi.spyOn(internals, '_validateNodes').mockReturnValue(undefined);
			vi.spyOn(internals, '_validateDynamicCredentials').mockResolvedValue(undefined);
			vi.spyOn(internals, '_validateSubWorkflowReferences').mockResolvedValue(undefined);
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
			// in-memory teardown is left to the leader, not run here
			expect(activeWorkflowManagerMock.remove).not.toHaveBeenCalled();
		});
	});

	describe('delete()', () => {
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowRepositoryMock: MockProxy<WorkflowRepository>;
		let executionRepositoryMock: MockProxy<ExecutionRepository>;
		let globalConfigMock: MockProxy<GlobalConfig>;
		let activeWorkflowManagerMock: MockProxy<ActiveWorkflowManager>;

		const WORKFLOW_ID = 'workflow-1';

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
			executionRepositoryMock = mock();
			activeWorkflowManagerMock = mock();
			globalConfigMock = mock<GlobalConfig>({
				workflows: mock<WorkflowsConfig>({ useWorkflowPublicationService: true }),
			});

			executionRepositoryMock.find.mockResolvedValue([]);

			workflowService = new WorkflowService(
				mock(), // logger
				mock(), // sharedWorkflowRepository
				workflowRepositoryMock, // workflowRepository
				mock(), // workflowTagMappingRepository
				mock(), // binaryDataService
				mock(), // ownershipService
				mock(), // tagService
				mock(), // workflowHistoryService
				mock(), // externalHooks
				activeWorkflowManagerMock, // activeWorkflowManager
				mock(), // roleService
				mock(), // projectService
				executionRepositoryMock, // executionRepository
				mock(), // eventService
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
			);
		});

		test('throws ConflictError when deleting a published workflow', async () => {
			const workflow = makeWorkflowEntity({ activeVersionId: 'v1' });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await expect(workflowService.delete(mock<User>(), WORKFLOW_ID, true)).rejects.toBeInstanceOf(
				ConflictError,
			);

			expect(workflowRepositoryMock.delete).not.toHaveBeenCalled();
		});

		test('deletes a workflow whose active version was set while publication service was off', async () => {
			globalConfigMock.workflows.useWorkflowPublicationService = false;
			const workflow = makeWorkflowEntity({ active: true, activeVersionId: 'v1' });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(activeWorkflowManagerMock.remove).toHaveBeenCalledWith(WORKFLOW_ID);
			expect(workflowRepositoryMock.delete).toHaveBeenCalledWith(WORKFLOW_ID);
		});

		test('deletes an unpublished workflow when publication service is on', async () => {
			const workflow = makeWorkflowEntity({ isArchived: true, activeVersionId: null });
			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(workflow);

			await workflowService.delete(mock<User>(), WORKFLOW_ID, true);

			expect(workflowRepositoryMock.delete).toHaveBeenCalledWith(WORKFLOW_ID);
		});
	});
});

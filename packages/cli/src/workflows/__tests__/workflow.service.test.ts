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
import type { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import * as WorkflowHelpers from '@/workflow-helpers';

jest.mock('@/permissions.ee/check-access');
jest.mock('@/workflow-helpers');
jest.mock('@/generic-helpers');

type WorkflowServiceTestDeps = ConstructorParameters<typeof WorkflowService>;

function createWorkflowService(
	overrides: Partial<{
		workflowRepository: WorkflowServiceTestDeps[2];
		ownershipService: WorkflowServiceTestDeps[5];
		workflowHistoryService: WorkflowServiceTestDeps[7];
		externalHooks: WorkflowServiceTestDeps[8];
		activeWorkflowManager: WorkflowServiceTestDeps[9];
		roleService: WorkflowServiceTestDeps[10];
		workflowFinderService: WorkflowServiceTestDeps[16];
		workflowPublishHistoryRepository: WorkflowServiceTestDeps[18];
		webhookService: WorkflowServiceTestDeps[21];
		licenseState: WorkflowServiceTestDeps[22];
		redactionEnforcementService: WorkflowServiceTestDeps[24];
	}> = {},
): WorkflowService {
	const workflowValidationService = Object.assign(mock<WorkflowValidationService>(), {
		validateCredentialNodeRestrictions: () => ({ isValid: true }),
	});

	return new WorkflowService(
		mock(), // logger
		mock(), // sharedWorkflowRepository
		overrides.workflowRepository ?? mock(), // workflowRepository
		mock(), // workflowTagMappingRepository
		mock(), // binaryDataService
		overrides.ownershipService ?? mock(), // ownershipService
		mock(), // tagService
		overrides.workflowHistoryService ?? mock(), // workflowHistoryService
		overrides.externalHooks ?? mock(), // externalHooks
		overrides.activeWorkflowManager ?? mock(), // activeWorkflowManager
		overrides.roleService ?? mock(), // roleService
		mock(), // projectService
		mock(), // executionRepository
		mock(), // eventService
		mock(), // globalConfig
		mock(), // folderRepository
		overrides.workflowFinderService ?? mock(), // workflowFinderService
		mock(), // workflowPublishedVersionRepository
		overrides.workflowPublishHistoryRepository ?? mock(), // workflowPublishHistoryRepository
		workflowValidationService, // workflowValidationService
		mock(), // nodeTypes
		overrides.webhookService ?? mock(), // webhookService
		overrides.licenseState ?? mock(), // licenseState
		mock(), // projectRepository
		overrides.redactionEnforcementService ?? mock(), // redactionEnforcementService
	);
}

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

			workflowService = createWorkflowService({
				workflowRepository: workflowRepositoryMock as never,
				roleService: roleServiceMock,
				webhookService: webhookServiceMock,
			});
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

			workflowService = createWorkflowService({
				workflowRepository: workflowRepositoryMock as never,
				ownershipService: ownershipServiceMock,
				workflowFinderService: workflowFinderServiceMock,
				licenseState: licenseStateMock,
				redactionEnforcementService: redactionEnforcementServiceMock,
			});

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

	describe('update() skipActivation', () => {
		const userHasScopesMock = jest.mocked(userHasScopes);
		let workflowService: WorkflowService;
		let workflowFinderServiceMock: MockProxy<WorkflowFinderService>;
		let workflowRepositoryMock: MockProxy<{
			update: jest.Mock;
			findOne: jest.Mock;
		}>;
		let activateWorkflowSpy: jest.SpyInstance;

		beforeEach(() => {
			jest.clearAllMocks();
			jest.mocked(WorkflowHelpers.removeDefaultValues).mockImplementation((settings) => settings);
			userHasScopesMock.mockResolvedValue(true);

			workflowFinderServiceMock = mock<WorkflowFinderService>();
			workflowRepositoryMock = mock();

			const ownershipServiceMock = mock<OwnershipService>();
			ownershipServiceMock.getWorkflowProjectCached.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);

			workflowService = createWorkflowService({
				workflowRepository: workflowRepositoryMock as never,
				ownershipService: ownershipServiceMock,
				workflowFinderService: workflowFinderServiceMock,
			});

			activateWorkflowSpy = jest
				.spyOn(workflowService, 'activateWorkflow')
				.mockResolvedValue(mock<WorkflowEntity>());
		});

		afterEach(() => {
			activateWorkflowSpy.mockRestore();
		});

		function setupPublishedWorkflow() {
			const existingWorkflow = mock<WorkflowEntity>({
				id: 'workflow-1',
				isArchived: false,
				versionId: 'v1',
				nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: {} }],
				connections: {},
				settings: { executionOrder: 'v0' },
				activeVersionId: 'v1',
				tags: [],
			});
			const updatedWorkflow = mock<WorkflowEntity>({
				...existingWorkflow,
				activeVersionId: 'v2',
				versionId: 'v2',
			});

			workflowFinderServiceMock.findWorkflowForUser.mockResolvedValue(existingWorkflow);
			workflowRepositoryMock.findOne.mockResolvedValue(updatedWorkflow);

			return { existingWorkflow, updatedWorkflow };
		}

		test('should reactivate when publishIfActive is true and skipActivation is not set', async () => {
			setupPublishedWorkflow();

			const user = mock<User>();
			await workflowService.update(
				user,
				{
					nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: {} }],
					connections: {},
				} as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true, publishIfActive: true },
			);

			expect(activateWorkflowSpy).toHaveBeenCalledWith(user, 'workflow-1', {
				versionId: 'v2',
				source: 'ui',
			});
		});

		test('should not reactivate when publishIfActive is true and skipActivation is true', async () => {
			setupPublishedWorkflow();

			const user = mock<User>();
			await workflowService.update(
				user,
				{
					nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: {} }],
					connections: {},
				} as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true, publishIfActive: true, skipActivation: true },
			);

			expect(activateWorkflowSpy).not.toHaveBeenCalled();
		});

		test('should not reactivate on settings change when skipActivation is true', async () => {
			setupPublishedWorkflow();

			const user = mock<User>();
			await workflowService.update(
				user,
				{ settings: { executionOrder: 'v1' } } as unknown as WorkflowEntity,
				'workflow-1',
				{ forceSave: true, skipActivation: true },
			);

			expect(activateWorkflowSpy).not.toHaveBeenCalled();
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

			workflowService = createWorkflowService({
				workflowRepository: workflowRepositoryMock,
				workflowHistoryService: workflowHistoryServiceMock,
				externalHooks: externalHooksMock,
				activeWorkflowManager: activeWorkflowManagerMock,
				workflowFinderService: workflowFinderServiceMock,
				workflowPublishHistoryRepository: workflowPublishHistoryRepositoryMock,
			});

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

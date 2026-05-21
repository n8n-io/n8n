import type { LicenseState } from '@n8n/backend-common';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { OwnershipService } from '@/services/ownership.service';
import type { RoleService } from '@/services/role.service';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
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
				userHasScopesMock.mockImplementation((_user, scopes) =>
					Promise.resolve(
						Array.isArray(scopes) &&
							scopes.includes('workflow:disableRedaction') &&
							!scopes.includes('workflow:enableRedaction'),
					),
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
				userHasScopesMock.mockImplementation((_user, scopes) =>
					Promise.resolve(
						Array.isArray(scopes) &&
							scopes.includes('workflow:enableRedaction') &&
							!scopes.includes('workflow:disableRedaction'),
					),
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
});

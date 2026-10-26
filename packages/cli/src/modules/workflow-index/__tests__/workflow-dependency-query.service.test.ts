import type {
	CredentialsRepository,
	ProjectRelationRepository,
	SharedWorkflow,
	User,
	WorkflowDependencyRepository,
	WorkflowRepository,
} from '@n8n/db';
import { chunkIds } from '@n8n/db';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { type CredentialsFinderService, type RoleService } from '@n8n/backend-services';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { mock } from 'vitest-mock-extended';

import type { AgentUsageProviderProxy } from '../agent-usage-provider-proxy.service';
import { WorkflowDependencyQueryService } from '../workflow-dependency-query.service';

describe('WorkflowDependencyQueryService', () => {
	const dependencyRepository = mock<WorkflowDependencyRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const dataTableRepository = mock<DataTableRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const roleService = mock<RoleService>();
	const agentUsageProvider = mock<AgentUsageProviderProxy>();

	const service = new WorkflowDependencyQueryService(
		dependencyRepository,
		credentialsRepository,
		workflowRepository,
		dataTableRepository,
		workflowFinderService,
		credentialsFinderService,
		projectRelationRepository,
		roleService,
		agentUsageProvider,
	);

	const user = mock<User>({ id: 'user-1', role: mock({ scopes: [] }) });

	beforeEach(() => {
		vi.clearAllMocks();
		agentUsageProvider.findAgentUsages.mockResolvedValue([]);
	});

	describe('getResourceDependencies', () => {
		const mockCredentialDep = () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			dependencyRepository.find.mockResolvedValue([
				mock({ workflowId: 'wf-1', dependencyType: 'credentialId', dependencyKey: 'cred-1' }),
			]);
			credentialsRepository.find.mockResolvedValue([mock({ id: 'cred-1', name: 'Test Cred' })]);
		};

		it("includes the workflow's owning project id for a credential used in it", async () => {
			mockCredentialDep();
			workflowRepository.find.mockResolvedValue([
				mock({
					id: 'wf-1',
					name: 'Test Workflow',
					shared: [mock({ role: 'workflow:owner', project: mock({ id: 'project-1' }) })],
				}),
			]);

			const result = await service.getResourceDependencies(['cred-1'], 'credential', user);

			expect(workflowRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({ relations: { shared: { project: true } } }),
			);
			expect(result['cred-1'].dependencies).toContainEqual({
				id: 'wf-1',
				name: 'Test Workflow',
				type: 'workflowParent',
				projectId: 'project-1',
			});
		});

		it("omits the project id when the workflow's owning project cannot be resolved", async () => {
			mockCredentialDep();
			workflowRepository.find.mockResolvedValue([
				mock({ id: 'wf-1', name: 'Test Workflow', shared: [] as SharedWorkflow[] }),
			]);

			const result = await service.getResourceDependencies(['cred-1'], 'credential', user);

			expect(result['cred-1'].dependencies).toContainEqual({
				id: 'wf-1',
				name: 'Test Workflow',
				type: 'workflowParent',
				projectId: undefined,
			});
		});

		it('does not request the owner-project relation for a workflow dependency lookup', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-1', 'wf-2']),
			);
			dependencyRepository.find.mockResolvedValue([
				mock({ workflowId: 'wf-2', dependencyType: 'workflowCall', dependencyKey: 'wf-1' }),
			]);
			workflowRepository.find.mockResolvedValue([
				mock({ id: 'wf-1', name: 'Sub-workflow', shared: [] as SharedWorkflow[] }),
				mock({ id: 'wf-2', name: 'Parent', shared: [] as SharedWorkflow[] }),
			]);

			await service.getResourceDependencies(['wf-1'], 'workflow', user);

			expect(workflowRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({ select: ['id', 'name'] }),
			);
			expect(workflowRepository.find).not.toHaveBeenCalledWith(
				expect.objectContaining({ relations: expect.anything() }),
			);
		});
	});

	describe('getResourceDependencies with overlapping parent types', () => {
		it.each([true, false])(
			'counts each hidden workflow and agent once when the workflow is accessible: %s',
			async (visibleWorkflow) => {
				const resourceIds = ['wf-1', 'wf-2'];
				workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
					new Set([...resourceIds, ...(visibleWorkflow ? ['shared-id'] : [])]),
				);
				roleService.rolesWithScope.mockResolvedValue([]);
				projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
				dependencyRepository.find.mockResolvedValue(
					resourceIds.flatMap((resourceId) => [
						mock({
							workflowId: 'shared-id',
							dependencyType: 'workflowCall',
							dependencyKey: resourceId,
						}),
						mock({
							workflowId: 'shared-id',
							dependencyType: 'errorWorkflow',
							dependencyKey: resourceId,
						}),
					]),
				);
				workflowRepository.find.mockResolvedValue([
					mock({ id: 'shared-id', name: 'Order intake', shared: [] }),
				]);
				agentUsageProvider.findAgentUsages.mockResolvedValue(
					resourceIds.map((resourceId) => ({ agentId: 'shared-id', resourceId })),
				);
				agentUsageProvider.findAgentSummaries.mockResolvedValue([
					{ id: 'shared-id', name: 'Support agent', projectId: 'other' },
				]);

				const result = await service.getResourceDependencies(resourceIds, 'workflow', user);

				for (const resourceId of resourceIds) {
					expect(result[resourceId].inaccessibleDependentCount).toBe(visibleWorkflow ? 1 : 2);
					expect(result[resourceId].inaccessibleCount).toBe(visibleWorkflow ? 1 : 3);
					expect(result[resourceId].dependencies).toHaveLength(visibleWorkflow ? 2 : 0);
				}
			},
		);
	});

	describe('getResourceDependencies with a credential the user cannot see', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());
			dependencyRepository.find.mockResolvedValue([
				mock({ workflowId: 'wf-1', dependencyType: 'credentialId', dependencyKey: 'cred-1' }),
			]);
			credentialsRepository.find.mockResolvedValue([mock({ id: 'cred-1', name: 'Personal Cred' })]);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValue([
				mock({ id: 'cred-1' }),
			]);
		});

		it('lists its name as unavailable when asked to', async () => {
			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user, {
				listUnavailableCredentials: true,
			});

			expect(result['wf-1']).toEqual({
				dependencies: [
					{ id: 'cred-1', name: 'Personal Cred', type: 'credentialId', unavailable: true },
				],
				inaccessibleCount: 0,
			});
		});

		it('lists a credential the user can see but cannot use as unavailable', async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);

			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user, {
				listUnavailableCredentials: true,
			});

			expect(result['wf-1'].dependencies).toEqual([
				{ id: 'cred-1', name: 'Personal Cred', type: 'credentialId', unavailable: true },
			]);
		});

		it('lists a credential the user can use as a normal dependency', async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValue([]);

			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user, {
				listUnavailableCredentials: true,
			});

			expect(result['wf-1'].dependencies).toEqual([
				{ id: 'cred-1', name: 'Personal Cred', type: 'credentialId' },
			]);
		});

		it('counts it as hidden when not asked to list it', async () => {
			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user);

			expect(result['wf-1']).toEqual({
				dependencies: [],
				inaccessibleCount: 1,
				inaccessibleCounts: { credentialId: 1 },
			});
		});
	});

	describe('getResourceDependencies with deleted index references', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());
			roleService.rolesWithScope.mockResolvedValue([]);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
			dependencyRepository.find.mockResolvedValue(
				['hidden', 'deleted'].flatMap((suffix) => [
					mock({
						workflowId: 'wf-1',
						dependencyType: 'credentialId',
						dependencyKey: `cred-${suffix}`,
					}),
					mock({
						workflowId: 'wf-1',
						dependencyType: 'dataTableId',
						dependencyKey: `dt-${suffix}`,
					}),
					mock({
						workflowId: 'wf-1',
						dependencyType: 'workflowCall',
						dependencyKey: `wf-${suffix}`,
					}),
					mock({
						workflowId: `wf-${suffix}`,
						dependencyType: 'workflowCall',
						dependencyKey: 'wf-1',
					}),
					mock({
						workflowId: 'wf-1',
						dependencyType: 'errorWorkflow',
						dependencyKey: `wf-${suffix}`,
					}),
					mock({
						workflowId: `wf-${suffix}`,
						dependencyType: 'errorWorkflow',
						dependencyKey: 'wf-1',
					}),
				]),
			);
			agentUsageProvider.findAgentUsages.mockResolvedValue([
				{ agentId: 'agent-hidden', resourceId: 'wf-1' },
				{ agentId: 'agent-deleted', resourceId: 'wf-1' },
			]);
		});

		it('counts existing inaccessible resources by type and omits deleted resources', async () => {
			workflowRepository.find.mockResolvedValue([mock({ id: 'wf-hidden' })]);
			credentialsRepository.find.mockResolvedValue([mock({ id: 'cred-hidden' })]);
			dataTableRepository.find.mockResolvedValue([mock({ id: 'dt-hidden', projectId: 'other' })]);
			agentUsageProvider.findAgentSummaries.mockResolvedValue([
				{ id: 'agent-hidden', name: 'Hidden agent', projectId: 'other' },
			]);

			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user);

			expect(result['wf-1']).toEqual({
				dependencies: [],
				inaccessibleCount: 7,
				inaccessibleCounts: {
					agentUsage: 1,
					credentialId: 1,
					dataTableId: 1,
					errorWorkflow: 1,
					errorWorkflowParent: 1,
					workflowCall: 1,
					workflowParent: 1,
				},
				inaccessibleDependentCount: 2,
			});
		});

		it('reports no inaccessible resources when all references are deleted', async () => {
			workflowRepository.find.mockResolvedValue([]);
			credentialsRepository.find.mockResolvedValue([]);
			dataTableRepository.find.mockResolvedValue([]);
			agentUsageProvider.findAgentSummaries.mockResolvedValue([]);

			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user);

			expect(result['wf-1']).toEqual({ dependencies: [], inaccessibleCount: 0 });
		});
	});

	describe('getFolderDependencies', () => {
		// This block stubs `getResourceDependencies` on the shared service instance, so the spy has
		// to be undone for the suite above, which exercises it for real.
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('queries every chunk and deduplicates dependencies across them', async () => {
			// One id more than a single batch holds, so the loop has to run more than once.
			const workflowIds = Array.from({ length: 10_001 }, (_, index) => `wf-${index}`);
			const chunks = chunkIds(workflowIds);
			// Guard the fixture: the point of the test is lost if this is a single batch.
			expect(chunks.length).toBeGreaterThan(1);

			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(workflowIds);

			const sharedTable = { type: 'dataTableId' as const, id: 'dt-shared', name: 'Customers' };
			const getResourceDependencies = vi
				.spyOn(service, 'getResourceDependencies')
				.mockImplementation(async (ids) => ({
					// Every chunk reports the same table plus one of its own.
					[ids[0]]: {
						dependencies: [
							sharedTable,
							{ type: 'dataTableId' as const, id: `dt-${ids.length}`, name: `Table ${ids.length}` },
						],
						inaccessibleCount: 0,
					},
				}));

			const result = await service.getFolderDependencies('project-1', 'folder-1', user);

			expect(getResourceDependencies).toHaveBeenCalledTimes(chunks.length);
			// Each id is queried exactly once, in order — no chunk dropped or repeated.
			expect(getResourceDependencies.mock.calls.flatMap(([ids]) => ids)).toEqual(workflowIds);

			expect(result.filter((dep) => dep.id === sharedTable.id)).toHaveLength(1);
			expect(result.map((dep) => dep.id).sort()).toEqual(
				[sharedTable.id, ...chunks.map((chunk) => `dt-${chunk.length}`)].sort(),
			);
		});

		it('does not query when the folder holds no workflows the user can read', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue([]);
			const getResourceDependencies = vi.spyOn(service, 'getResourceDependencies');

			await expect(service.getFolderDependencies('project-1', 'folder-1', user)).resolves.toEqual(
				[],
			);
			expect(getResourceDependencies).not.toHaveBeenCalled();
		});
	});
});

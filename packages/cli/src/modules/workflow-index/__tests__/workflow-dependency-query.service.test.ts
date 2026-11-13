import type {
	CredentialsRepository,
	ProjectRelationRepository,
	SharedWorkflow,
	User,
	WorkflowDependencyRepository,
	WorkflowRepository,
} from '@n8n/db';
import { chunkIds } from '@n8n/db';
import type { DataTableRepository } from '@n8n/backend-module-data-table';
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

	const user = mock<User>({ id: 'user-1' });

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
			dependencyRepository.findDependenciesForResources.mockResolvedValue([
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
					isArchived: false,
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
				mock({
					id: 'wf-1',
					name: 'Test Workflow',
					isArchived: false,
					shared: [] as SharedWorkflow[],
				}),
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
			dependencyRepository.findDependenciesForResources.mockResolvedValue([
				mock({ workflowId: 'wf-2', dependencyType: 'workflowCall', dependencyKey: 'wf-1' }),
			]);
			workflowRepository.find.mockResolvedValue([
				mock({ id: 'wf-1', name: 'Sub-workflow', shared: [] as SharedWorkflow[] }),
				mock({ id: 'wf-2', name: 'Parent', shared: [] as SharedWorkflow[] }),
			]);

			await service.getResourceDependencies(['wf-1'], 'workflow', user);

			expect(workflowRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({ select: ['id', 'name', 'isArchived'] }),
			);
			expect(workflowRepository.find).not.toHaveBeenCalledWith(
				expect.objectContaining({ relations: expect.anything() }),
			);
		});
	});

	describe('getResourceDependencies with a credential the user cannot see', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());
			dependencyRepository.findDependenciesForResources.mockResolvedValue([
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

			expect(result['wf-1']).toEqual({ dependencies: [], inaccessibleCount: 1 });
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

	describe('getResourceDependencies with versions', () => {
		const row = (
			workflowId: string,
			dependencyType: 'workflowCall' | 'credentialId',
			dependencyKey: string,
			publishedVersionId: string | null,
		) => ({ workflowId, dependencyType, dependencyKey, publishedVersionId });

		beforeEach(() => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-1', 'wf-2', 'wf-3']),
			);
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);
			credentialsRepository.find.mockResolvedValue([mock({ id: 'cred-1', name: 'Cred' })]);
			workflowRepository.find.mockResolvedValue([
				mock({ id: 'wf-1', name: 'Target', shared: [] as SharedWorkflow[] }),
				mock({ id: 'wf-2', name: 'Caller A', shared: [] as SharedWorkflow[] }),
				mock({ id: 'wf-3', name: 'Caller B', shared: [] as SharedWorkflow[] }),
			]);
			dependencyRepository.findDependenciesForResources.mockResolvedValue([
				// wf-2 calls wf-1 from its draft and its published version.
				row('wf-2', 'workflowCall', 'wf-1', null),
				row('wf-2', 'workflowCall', 'wf-1', 'pub-2'),
				// wf-3 calls wf-1 only from its published version.
				row('wf-3', 'workflowCall', 'wf-1', 'pub-3'),
				// wf-1 uses cred-1 only in its draft.
				row('wf-1', 'credentialId', 'cred-1', null),
			]);
		});

		it('labels each link with the versions that hold it', async () => {
			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user, {
				includeVersions: true,
			});

			expect(result['wf-1'].dependencies).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 'wf-2',
						type: 'workflowParent',
						versions: ['draft', 'published'],
					}),
					expect.objectContaining({ id: 'wf-3', type: 'workflowParent', versions: ['published'] }),
					expect.objectContaining({ id: 'cred-1', type: 'credentialId', versions: ['draft'] }),
				]),
			);
		});

		it('marks a workflow item whose workflow is archived', async () => {
			workflowRepository.find.mockResolvedValue([
				mock({ id: 'wf-1', name: 'Target', isArchived: false, shared: [] as SharedWorkflow[] }),
				mock({ id: 'wf-2', name: 'Caller A', isArchived: false, shared: [] as SharedWorkflow[] }),
				mock({ id: 'wf-3', name: 'Caller B', isArchived: true, shared: [] as SharedWorkflow[] }),
			]);

			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user);

			const byId = Object.fromEntries(result['wf-1'].dependencies.map((d) => [d.id, d]));
			expect(byId['wf-3']).toMatchObject({ archived: true });
			expect(byId['wf-2']).not.toHaveProperty('archived');
			expect(byId['cred-1']).not.toHaveProperty('archived');
		});

		it('leaves the versions out unless asked', async () => {
			const result = await service.getResourceDependencies(['wf-1'], 'workflow', user);

			for (const dependency of result['wf-1'].dependencies) {
				expect(dependency).not.toHaveProperty('versions');
			}
		});
	});

	describe('canReadResource', () => {
		it('is false for a data table that does not exist', async () => {
			dataTableRepository.existsBy.mockResolvedValue(false);

			await expect(service.canReadResource('dt-1', 'dataTable', user)).resolves.toBe(false);
		});

		it('checks access for a workflow', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));

			await expect(service.canReadResource('wf-1', 'workflow', user)).resolves.toBe(true);
			await expect(service.canReadResource('wf-2', 'workflow', user)).resolves.toBe(false);
		});
	});
});

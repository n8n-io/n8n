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
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { RoleService } from '@n8n/backend-services';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { mock } from 'vitest-mock-extended';

import type { AgentUsageProviderProxy } from '../agent-usage-provider-proxy.service';
import { WorkflowDependencyQueryService } from '../workflow-dependency-query.service';

const { isCredSharingEnabledMock } = vi.hoisted(() => ({
	isCredSharingEnabledMock: vi.fn(),
}));

vi.mock('@/constants/credential-sharing', () => ({
	isCredSharingEnabled: isCredSharingEnabledMock,
}));

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
		isCredSharingEnabledMock.mockReturnValue(true);
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

		it('does not request the owner-project relation when the flag is disabled, even for a credential lookup', async () => {
			isCredSharingEnabledMock.mockReturnValue(false);
			mockCredentialDep();
			workflowRepository.find.mockResolvedValue([
				mock({ id: 'wf-1', name: 'Test Workflow', shared: [] as SharedWorkflow[] }),
			]);

			const result = await service.getResourceDependencies(['cred-1'], 'credential', user);

			expect(workflowRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({ select: ['id', 'name'] }),
			);
			expect(result['cred-1'].dependencies).toContainEqual({
				id: 'wf-1',
				name: 'Test Workflow',
				type: 'workflowParent',
				projectId: undefined,
			});
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

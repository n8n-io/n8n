import type {
	CredentialsRepository,
	ProjectRelationRepository,
	SharedWorkflow,
	User,
	WorkflowDependencyRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { RoleService } from '@/services/role.service';
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
});

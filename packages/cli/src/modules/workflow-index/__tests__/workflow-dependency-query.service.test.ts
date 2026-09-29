import type {
	CredentialsRepository,
	ProjectRelationRepository,
	SharedWorkflowRepository,
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

describe('WorkflowDependencyQueryService', () => {
	const dependencyRepository = mock<WorkflowDependencyRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
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
		sharedWorkflowRepository,
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
		it("includes the workflow's owning project id for a credential used in it", async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			dependencyRepository.find.mockResolvedValue([
				mock({ workflowId: 'wf-1', dependencyType: 'credentialId', dependencyKey: 'cred-1' }),
			]);
			credentialsRepository.find.mockResolvedValue([mock({ id: 'cred-1', name: 'Test Cred' })]);
			workflowRepository.find.mockResolvedValue([mock({ id: 'wf-1', name: 'Test Workflow' })]);
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([['wf-1', mock({ id: 'project-1' })]]),
			);

			const result = await service.getResourceDependencies(['cred-1'], 'credential', user);

			expect(sharedWorkflowRepository.findOwnerProjectsByWorkflowIds).toHaveBeenCalledWith([
				'wf-1',
			]);
			expect(result['cred-1'].dependencies).toContainEqual({
				id: 'wf-1',
				name: 'Test Workflow',
				type: 'workflowParent',
				projectId: 'project-1',
			});
		});

		it("omits the project id when the workflow's owning project cannot be resolved", async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			dependencyRepository.find.mockResolvedValue([
				mock({ workflowId: 'wf-1', dependencyType: 'credentialId', dependencyKey: 'cred-1' }),
			]);
			credentialsRepository.find.mockResolvedValue([mock({ id: 'cred-1', name: 'Test Cred' })]);
			workflowRepository.find.mockResolvedValue([mock({ id: 'wf-1', name: 'Test Workflow' })]);
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(new Map());

			const result = await service.getResourceDependencies(['cred-1'], 'credential', user);

			expect(result['cred-1'].dependencies).toContainEqual({
				id: 'wf-1',
				name: 'Test Workflow',
				type: 'workflowParent',
				projectId: undefined,
			});
		});
	});
});

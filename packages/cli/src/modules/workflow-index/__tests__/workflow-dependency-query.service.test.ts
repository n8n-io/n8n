import type {
	CredentialsRepository,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowRepository,
	User,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { RoleService } from '@/services/role.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

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
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const projectRepository = mock<ProjectRepository>();

	// Real object (not jest-mock-extended proxy) so hasGlobalScope can read
	// user.role.scopes via a plain property lookup.
	const user = {
		id: 'user-1',
		role: { scopes: [{ slug: 'dataTable:listProject' }] },
	} as unknown as User;

	let service: WorkflowDependencyQueryService;

	beforeEach(() => {
		jest.resetAllMocks();
		service = new WorkflowDependencyQueryService(
			dependencyRepository,
			credentialsRepository,
			workflowRepository,
			dataTableRepository,
			workflowFinderService,
			credentialsFinderService,
			projectRelationRepository,
			roleService,
			sharedWorkflowRepository,
			sharedCredentialsRepository,
			projectRepository,
		);
	});

	describe('getDependencyGraph', () => {
		it('returns an empty graph when the user has no accessible workflows', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue([]);

			const dot = await service.getDependencyGraph(user);

			expect(dot).toContain('digraph WorkflowDependencies');
			expect(dot).not.toContain('->');
			expect(dependencyRepository.find).not.toHaveBeenCalled();
		});

		it('returns an empty graph when there are no dependencies', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-1']);
			dependencyRepository.find.mockResolvedValue([]);

			const dot = await service.getDependencyGraph(user);

			expect(dot).toContain('digraph WorkflowDependencies');
			expect(dot).not.toContain('->');
		});

		it('defaults to rankdir=LR but honors layout="tb"', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-A']);
			dependencyRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', dependencyType: 'credentialId', dependencyKey: 'cred-1' },
			] as never);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-A']));
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);
			workflowRepository.find.mockResolvedValue([{ id: 'wf-A', name: 'Workflow A' }] as never);
			credentialsRepository.find.mockResolvedValue([{ id: 'cred-1', name: 'Cred' }] as never);
			dataTableRepository.find.mockResolvedValue([] as never);
			sharedWorkflowRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', projectId: 'proj-1' },
			] as never);
			sharedCredentialsRepository.find.mockResolvedValue([
				{ credentialsId: 'cred-1', projectId: 'proj-1' },
			] as never);
			projectRepository.find.mockResolvedValue([{ id: 'proj-1', name: 'Eng' }] as never);

			const defaultDot = await service.getDependencyGraph(user);
			expect(defaultDot).toContain('rankdir=LR;');

			const tbDot = await service.getDependencyGraph(user, { layout: 'tb' });
			expect(tbDot).toContain('rankdir=TB;');
			expect(tbDot).not.toContain('rankdir=LR;');
		});

		it('emits rankdir on the empty-graph fallback as well', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue([]);
			const dot = await service.getDependencyGraph(user, { layout: 'tb' });
			expect(dot).toContain('rankdir=TB;');
		});

		it('groups accessible resources by project and applies per-type fill colors', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-A', 'wf-B']);
			dependencyRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', dependencyType: 'workflowCall', dependencyKey: 'wf-B' },
				{ workflowId: 'wf-A', dependencyType: 'credentialId', dependencyKey: 'cred-1' },
				{ workflowId: 'wf-B', dependencyType: 'dataTableId', dependencyKey: 'dt-1' },
			] as never);

			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-A', 'wf-B']),
			);
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);

			workflowRepository.find.mockResolvedValue([
				{ id: 'wf-A', name: 'Workflow A' },
				{ id: 'wf-B', name: 'Workflow B' },
			] as never);
			credentialsRepository.find.mockResolvedValue([{ id: 'cred-1', name: 'My Cred' }] as never);
			dataTableRepository.find.mockResolvedValue([
				{ id: 'dt-1', name: 'My Table', projectId: 'proj-marketing' },
			] as never);

			sharedWorkflowRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', projectId: 'proj-engineering' },
				{ workflowId: 'wf-B', projectId: 'proj-marketing' },
			] as never);
			sharedCredentialsRepository.find.mockResolvedValue([
				{ credentialsId: 'cred-1', projectId: 'proj-engineering' },
			] as never);
			projectRepository.find.mockResolvedValue([
				{ id: 'proj-engineering', name: 'Engineering' },
				{ id: 'proj-marketing', name: 'Marketing' },
			] as never);

			const dot = await service.getDependencyGraph(user);

			// Each project becomes a sanitized subgraph cluster with its display label.
			expect(dot).toContain('subgraph cluster_project_proj_engineering {');
			expect(dot).toContain('label="Engineering";');
			expect(dot).toContain('subgraph cluster_project_proj_marketing {');
			expect(dot).toContain('label="Marketing";');

			// Engineering cluster owns wf-A and cred-1; marketing owns wf-B and dt-1.
			const engineeringBlock = dot.slice(
				dot.indexOf('cluster_project_proj_engineering'),
				dot.indexOf('cluster_project_proj_marketing'),
			);
			expect(engineeringBlock).toContain('"wf_wf-A"');
			expect(engineeringBlock).toContain('"cred_cred-1"');
			expect(engineeringBlock).not.toContain('"wf_wf-B"');

			const marketingBlock = dot.slice(dot.indexOf('cluster_project_proj_marketing'));
			expect(marketingBlock).toContain('"wf_wf-B"');
			expect(marketingBlock).toContain('"dt_dt-1"');

			// Each resource type gets its own fill color.
			expect(dot).toMatch(/"wf_wf-A".*fillcolor="#DBEAFE"/); // workflow blue
			expect(dot).toMatch(/"cred_cred-1".*fillcolor="#DCFCE7"/); // credential green
			expect(dot).toMatch(/"dt_dt-1".*fillcolor="#FED7AA"/); // data table orange

			// Edges live outside clusters and connect with the right semantics.
			expect(dot).toContain('"wf_wf-A" -> "wf_wf-B" [label="calls"]');
			expect(dot).toContain('"wf_wf-A" -> "cred_cred-1"');
			expect(dot).toContain('"wf_wf-B" -> "dt_dt-1"');
		});

		it('places resources without a known home project into an "unassigned" cluster', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-A']);
			dependencyRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', dependencyType: 'credentialId', dependencyKey: 'cred-1' },
			] as never);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-A']));
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);
			workflowRepository.find.mockResolvedValue([{ id: 'wf-A', name: 'Workflow A' }] as never);
			credentialsRepository.find.mockResolvedValue([{ id: 'cred-1', name: 'Cred' }] as never);
			dataTableRepository.find.mockResolvedValue([] as never);
			// No shared rows returned — owning project unknown.
			sharedWorkflowRepository.find.mockResolvedValue([] as never);
			sharedCredentialsRepository.find.mockResolvedValue([] as never);
			projectRepository.find.mockResolvedValue([] as never);

			const dot = await service.getDependencyGraph(user);

			expect(dot).toContain('subgraph cluster_project_unassigned {');
			expect(dot).toContain('label="(no project)"');
			expect(dot).toContain('"wf_wf-A"');
			expect(dot).toContain('"cred_cred-1"');
		});

		it('anonymizes inaccessible dependencies inside a Restricted cluster', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-A']);
			dependencyRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', dependencyType: 'workflowCall', dependencyKey: 'wf-secret' },
				{ workflowId: 'wf-A', dependencyType: 'credentialId', dependencyKey: 'cred-secret' },
			] as never);

			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-A']));
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());

			workflowRepository.find.mockResolvedValue([{ id: 'wf-A', name: 'Workflow A' }] as never);
			credentialsRepository.find.mockResolvedValue([] as never);
			dataTableRepository.find.mockResolvedValue([] as never);
			sharedWorkflowRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', projectId: 'proj-1' },
			] as never);
			sharedCredentialsRepository.find.mockResolvedValue([] as never);
			projectRepository.find.mockResolvedValue([{ id: 'proj-1', name: 'Eng' }] as never);

			const dot = await service.getDependencyGraph(user);

			expect(dot).toContain('subgraph cluster_restricted {');
			expect(dot).toContain('label="Restricted";');
			expect(dot).not.toContain('wf-secret');
			expect(dot).not.toContain('cred-secret');
			expect(dot).toMatch(/"restricted_wf_\d+".*label="\(restricted\)"/);
			expect(dot).toMatch(/"restricted_cred_\d+".*label="\(restricted\)"/);
			expect(dot).toMatch(/"wf_wf-A" -> "restricted_wf_\d+" \[label="calls"\]/);
			expect(dot).toMatch(/"wf_wf-A" -> "restricted_cred_\d+" \[label="uses"/);
		});

		it('reuses the same anonymized node id for repeated references to the same inaccessible resource', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-A', 'wf-B']);
			dependencyRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', dependencyType: 'credentialId', dependencyKey: 'cred-secret' },
				{ workflowId: 'wf-B', dependencyType: 'credentialId', dependencyKey: 'cred-secret' },
			] as never);

			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-A', 'wf-B']),
			);
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());

			workflowRepository.find.mockResolvedValue([
				{ id: 'wf-A', name: 'Workflow A' },
				{ id: 'wf-B', name: 'Workflow B' },
			] as never);
			credentialsRepository.find.mockResolvedValue([] as never);
			dataTableRepository.find.mockResolvedValue([] as never);
			sharedWorkflowRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', projectId: 'proj-1' },
				{ workflowId: 'wf-B', projectId: 'proj-1' },
			] as never);
			sharedCredentialsRepository.find.mockResolvedValue([] as never);
			projectRepository.find.mockResolvedValue([{ id: 'proj-1', name: 'Eng' }] as never);

			const dot = await service.getDependencyGraph(user);

			const restrictedDeclarations = dot.match(/restricted_cred_\d+/g) ?? [];
			const uniqueIds = new Set(restrictedDeclarations);
			expect(uniqueIds.size).toBe(1);
			const [anonId] = uniqueIds;
			expect(dot).toContain(`"wf_wf-A" -> "${anonId}"`);
			expect(dot).toContain(`"wf_wf-B" -> "${anonId}"`);
		});

		it('escapes double quotes and backslashes in resource and project names', async () => {
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-A']);
			dependencyRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', dependencyType: 'credentialId', dependencyKey: 'cred-1' },
			] as never);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-A']));
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);

			workflowRepository.find.mockResolvedValue([
				{ id: 'wf-A', name: 'A "quoted" \\ workflow' },
			] as never);
			credentialsRepository.find.mockResolvedValue([{ id: 'cred-1', name: 'normal' }] as never);
			dataTableRepository.find.mockResolvedValue([] as never);
			sharedWorkflowRepository.find.mockResolvedValue([
				{ workflowId: 'wf-A', projectId: 'proj-1' },
			] as never);
			sharedCredentialsRepository.find.mockResolvedValue([
				{ credentialsId: 'cred-1', projectId: 'proj-1' },
			] as never);
			projectRepository.find.mockResolvedValue([{ id: 'proj-1', name: 'Team "Alpha"' }] as never);

			const dot = await service.getDependencyGraph(user);

			expect(dot).toContain('label="A \\"quoted\\" \\\\ workflow"');
			expect(dot).toContain('label="Team \\"Alpha\\""');
		});
	});
});

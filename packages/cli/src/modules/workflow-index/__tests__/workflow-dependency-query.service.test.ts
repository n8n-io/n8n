import type {
	CredentialsRepository,
	ProjectRelationRepository,
	User,
	WorkflowDependencyRepository,
	WorkflowRepository,
} from '@n8n/db';
import { chunkIds } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { RoleService } from '@/services/role.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentUsageProviderProxy } from '../agent-usage-provider-proxy.service';
import { WorkflowDependencyQueryService } from '../workflow-dependency-query.service';

describe('WorkflowDependencyQueryService', () => {
	const workflowFinderService = mock<WorkflowFinderService>();
	const user = mock<User>();
	let service: WorkflowDependencyQueryService;

	beforeEach(() => {
		vi.resetAllMocks();

		service = new WorkflowDependencyQueryService(
			mock<WorkflowDependencyRepository>(),
			mock<CredentialsRepository>(),
			mock<WorkflowRepository>(),
			mock<DataTableRepository>(),
			workflowFinderService,
			mock<CredentialsFinderService>(),
			mock<ProjectRelationRepository>(),
			mock<RoleService>(),
			mock<AgentUsageProviderProxy>(),
		);
	});

	describe('getFolderDependencies', () => {
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

/* eslint-disable @typescript-eslint/unbound-method -- vi mocks */
import type {
	FolderRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { RoleService } from '@/services/role.service';

import { WorkflowFinderService } from '../workflow-finder.service';

/** Minimal projection of the row shape `findWorkflowIdsByFolder` selects. */
type FolderRow = { workflow: { id: string; parentFolder: { id: string } | null } };

function makeService(rows?: FolderRow[]) {
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	if (rows) {
		sharedWorkflowRepository.find.mockResolvedValue(rows as unknown as SharedWorkflow[]);
	}
	const workflowRepository = mock<WorkflowRepository>();
	const folderRepository = mock<FolderRepository>();
	const roleService = mock<RoleService>();
	const service = new WorkflowFinderService(
		sharedWorkflowRepository,
		folderRepository,
		roleService,
		workflowRepository,
	);
	return { service, sharedWorkflowRepository, workflowRepository, folderRepository, roleService };
}

describe('WorkflowFinderService', () => {
	describe('findWorkflowIdsByFolder', () => {
		it('returns an empty map without querying when no folder ids are given', async () => {
			const { service, sharedWorkflowRepository } = makeService();

			const result = await service.findWorkflowIdsByFolder([]);

			expect(result.size).toBe(0);
			expect(sharedWorkflowRepository.find).not.toHaveBeenCalled();
		});

		it('groups workflow ids by their parent folder', async () => {
			const { service } = makeService([
				{ workflow: { id: 'w1', parentFolder: { id: 'f1' } } },
				{ workflow: { id: 'w2', parentFolder: { id: 'f1' } } },
				{ workflow: { id: 'w3', parentFolder: { id: 'f2' } } },
			]);

			const result = await service.findWorkflowIdsByFolder(['f1', 'f2']);

			expect(result.get('f1')).toEqual(['w1', 'w2']);
			expect(result.get('f2')).toEqual(['w3']);
		});

		it('dedupes a workflow that surfaces via several share rows', async () => {
			const { service } = makeService([
				{ workflow: { id: 'w1', parentFolder: { id: 'f1' } } },
				{ workflow: { id: 'w1', parentFolder: { id: 'f1' } } },
			]);

			const result = await service.findWorkflowIdsByFolder(['f1']);

			expect(result.get('f1')).toEqual(['w1']);
		});

		it('skips rows whose workflow has no parent folder', async () => {
			const { service } = makeService([
				{ workflow: { id: 'w1', parentFolder: null } },
				{ workflow: { id: 'w2', parentFolder: { id: 'f1' } } },
			]);

			const result = await service.findWorkflowIdsByFolder(['f1']);

			expect([...result.keys()]).toEqual(['f1']);
			expect(result.get('f1')).toEqual(['w2']);
		});
	});

	describe('findExistingWorkflowIds', () => {
		it('returns an empty set without querying when no ids are given', async () => {
			const { service, workflowRepository } = makeService();

			const result = await service.findExistingWorkflowIds([]);

			expect(result.size).toBe(0);
			expect(workflowRepository.find).not.toHaveBeenCalled();
		});

		it('returns the ids that exist in the database, unscoped by access', async () => {
			const { service, workflowRepository } = makeService();
			workflowRepository.find.mockResolvedValue([{ id: 'wf-1' }] as never);

			const result = await service.findExistingWorkflowIds(['wf-1', 'wf-missing']);

			expect(result).toEqual(new Set(['wf-1']));
		});
	});

	describe('findWorkflowsForUser', () => {
		const user = {
			id: 'user-1',
			role: { slug: 'global:member', scopes: [] },
		} as never;

		function setup() {
			const ctx = makeService();
			ctx.roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'project' ? ['project:admin'] : ['workflow:owner'],
			);
			ctx.workflowRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
				workflows: [],
				count: 0,
			});
			return ctx;
		}

		it('resolves the roles for the requested scopes instead of materialising workflow ids', async () => {
			const { service, workflowRepository, sharedWorkflowRepository, roleService } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read'], { offset: 0, limit: 10 });

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['workflow:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
			expect(workflowRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				{
					scopes: ['workflow:read'],
					projectRoles: ['project:admin'],
					workflowRoles: ['workflow:owner'],
				},
				expect.objectContaining({ skip: 0, take: 10 }),
			);
			// The whole point: no `shared_workflow` scan feeding a `WHERE id IN (...)`.
			expect(sharedWorkflowRepository.find).not.toHaveBeenCalled();
			expect(workflowRepository.getManyAndCount).not.toHaveBeenCalled();
		});

		it('passes tag names through ListQuery filters', async () => {
			const { service, workflowRepository } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read'], {
				filters: { tagNames: ['prod'] },
				offset: 0,
				limit: 10,
			});

			expect(workflowRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.anything(),
				expect.objectContaining({
					filter: expect.objectContaining({ tags: ['prod'] }),
				}),
			);
		});

		it('passes projectId through as a filter', async () => {
			const { service, workflowRepository, folderRepository } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read'], {
				filters: { projectId: 'project-1' },
			});

			expect(workflowRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.anything(),
				expect.objectContaining({ filter: { projectId: 'project-1' } }),
			);
			expect(folderRepository.getAllFolderIdsInHierarchy).not.toHaveBeenCalled();
		});

		it('expands folderId into the folder hierarchy as a parentFolderIds filter', async () => {
			const { service, workflowRepository, folderRepository } = setup();
			folderRepository.getAllFolderIdsInHierarchy.mockResolvedValue(['folder-2', 'folder-3']);

			await service.findWorkflowsForUser(user, ['workflow:read'], {
				filters: { folderId: 'folder-1', projectId: 'project-1' },
			});

			expect(folderRepository.getAllFolderIdsInHierarchy).toHaveBeenCalledWith(
				'folder-1',
				'project-1',
			);
			expect(workflowRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.anything(),
				expect.objectContaining({
					filter: {
						projectId: 'project-1',
						parentFolderIds: ['folder-1', 'folder-2', 'folder-3'],
					},
				}),
			);
		});

		it('passes name/active/pagination and select through to the repository', async () => {
			const { service, workflowRepository } = setup();
			workflowRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
				workflows: [{ id: 'wf-1' }] as never,
				count: 1,
			});

			const result = await service.findWorkflowsForUser(user, ['workflow:read'], {
				filters: { name: 'Invoice', active: true },
				offset: 20,
				limit: 5,
				includePinnedData: false,
				includeTags: true,
			});

			expect(workflowRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.anything(),
				expect.objectContaining({
					filter: { query: 'Invoice', active: true },
					skip: 20,
					take: 5,
					select: expect.objectContaining({
						tags: true,
						nodes: true,
						activeVersion: true,
					}),
				}),
			);
			const [, , options] = workflowRepository.getManyAndCountWithSharingSubquery.mock.calls[0];
			assert(options);
			expect(options.select).not.toHaveProperty('pinData');
			expect(result.count).toBe(1);
		});

		it('omits pagination when no limit is given', async () => {
			const { service, workflowRepository } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read'], {});

			const [, , options] = workflowRepository.getManyAndCountWithSharingSubquery.mock.calls[0];
			assert(options);
			expect(options).not.toHaveProperty('skip');
			expect(options).not.toHaveProperty('take');
		});
	});
});

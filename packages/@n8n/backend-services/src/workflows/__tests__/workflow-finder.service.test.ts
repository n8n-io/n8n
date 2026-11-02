/* eslint-disable @typescript-eslint/unbound-method -- vi mocks */
import type {
	FolderRepository,
	OperationContext,
	User,
	WorkflowAccessRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { RoleService } from '../../services/role.service';
import { WorkflowFinderService } from '../workflow-finder.service';

function makeService() {
	const workflowAccessRepository = mock<WorkflowAccessRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const folderRepository = mock<FolderRepository>();
	const roleService = mock<RoleService>();
	const service = new WorkflowFinderService(
		workflowAccessRepository,
		folderRepository,
		roleService,
		workflowRepository,
	);
	return { service, workflowAccessRepository, workflowRepository, folderRepository, roleService };
}

const member = { id: 'user-1', role: { slug: 'global:member', scopes: [] } } as unknown as User;
const owner = {
	id: 'owner-1',
	role: { slug: 'global:owner', scopes: [{ slug: 'workflow:read' }] },
} as unknown as User;

describe('WorkflowFinderService', () => {
	describe('findWorkflowForUser', () => {
		it('loads the roles in the transaction of the context', async () => {
			const { service, roleService, workflowAccessRepository } = makeService();
			const ctx = mock<OperationContext>();
			roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'project' ? ['project:editor'] : ['workflow:editor'],
			);
			workflowAccessRepository.findRolesForAccessCheck.mockResolvedValue([]);

			await service.findWorkflowForUser('workflow-1', member, ['workflow:read'], {
				ctx,
				includeActiveVersion: true,
				publishHistory: 'latestActivation',
			});

			const loadRoles = roleService.rolesWithScope.mock.calls[0][2];
			await loadRoles?.();
			expect(workflowAccessRepository.findRolesForAccessCheck).toHaveBeenCalledWith(ctx);
			expect(workflowAccessRepository.findWorkflowForUser).toHaveBeenCalledWith(
				'workflow-1',
				{ userId: 'user-1', projectRoles: ['project:editor'], workflowRoles: ['workflow:editor'] },
				{ includeActiveVersion: true, publishHistory: 'latestActivation' },
				ctx,
			);
		});

		it('uses the cached roles without a context', async () => {
			const { service, roleService } = makeService();
			roleService.rolesWithScope.mockResolvedValue([]);

			await service.findWorkflowForUser('workflow-1', member, ['workflow:read']);

			expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['workflow:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
		});

		it('does not filter by role for a user with a global scope', async () => {
			const { service, roleService, workflowAccessRepository } = makeService();

			await service.findWorkflowForUser('workflow-1', owner, ['workflow:read']);

			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
			expect(workflowAccessRepository.findWorkflowForUser).toHaveBeenCalledWith(
				'workflow-1',
				null,
				{},
				undefined,
			);
		});
	});

	describe('findWorkflowIdsByFolder', () => {
		it('returns an empty map without querying when no folder ids are given', async () => {
			const { service, workflowAccessRepository } = makeService();

			const result = await service.findWorkflowIdsByFolder([]);

			expect(result.size).toBe(0);
			expect(workflowAccessRepository.findWorkflowParentFolderIds).not.toHaveBeenCalled();
		});

		it('groups workflow ids by their parent folder', async () => {
			const { service, workflowAccessRepository } = makeService();
			workflowAccessRepository.findWorkflowParentFolderIds.mockResolvedValue([
				{ workflowId: 'w1', parentFolderId: 'f1' },
				{ workflowId: 'w2', parentFolderId: 'f1' },
				{ workflowId: 'w3', parentFolderId: 'f2' },
			]);

			const result = await service.findWorkflowIdsByFolder(['f1', 'f2']);

			expect(result.get('f1')).toEqual(['w1', 'w2']);
			expect(result.get('f2')).toEqual(['w3']);
			expect(workflowAccessRepository.findWorkflowParentFolderIds).toHaveBeenCalledWith(
				['f1', 'f2'],
				false,
			);
		});

		it('includes archived workflows when requested', async () => {
			const { service, workflowAccessRepository } = makeService();
			workflowAccessRepository.findWorkflowParentFolderIds.mockResolvedValue([]);

			await service.findWorkflowIdsByFolder(['f1'], { includeArchived: true });

			expect(workflowAccessRepository.findWorkflowParentFolderIds).toHaveBeenCalledWith(
				['f1'],
				true,
			);
		});

		it('dedupes a workflow that surfaces via several share rows', async () => {
			const { service, workflowAccessRepository } = makeService();
			workflowAccessRepository.findWorkflowParentFolderIds.mockResolvedValue([
				{ workflowId: 'w1', parentFolderId: 'f1' },
				{ workflowId: 'w1', parentFolderId: 'f1' },
			]);

			const result = await service.findWorkflowIdsByFolder(['f1']);

			expect(result.get('f1')).toEqual(['w1']);
		});

		it('skips rows whose workflow has no parent folder', async () => {
			const { service, workflowAccessRepository } = makeService();
			workflowAccessRepository.findWorkflowParentFolderIds.mockResolvedValue([
				{ workflowId: 'w1', parentFolderId: null },
				{ workflowId: 'w2', parentFolderId: 'f1' },
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
			expect(workflowRepository.findByIds).not.toHaveBeenCalled();
		});

		it('returns the ids that exist in the database, unscoped by access', async () => {
			const { service, workflowRepository } = makeService();
			workflowRepository.findByIds.mockResolvedValue([{ id: 'wf-1' }] as never);

			const result = await service.findExistingWorkflowIds(['wf-1', 'wf-missing']);

			expect(result).toEqual(new Set(['wf-1']));
			expect(workflowRepository.findByIds).toHaveBeenCalledWith(['wf-1', 'wf-missing'], {
				fields: ['id'],
			});
		});
	});

	describe('findAllWorkflowIdsForUser', () => {
		it('expands the folder into its hierarchy and applies the access roles', async () => {
			const { service, roleService, folderRepository, workflowAccessRepository } = makeService();
			roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'project' ? ['project:admin'] : ['workflow:owner'],
			);
			folderRepository.getAllFolderIdsInHierarchy.mockResolvedValue(['folder-2']);
			workflowAccessRepository.findWorkflowIdsForUser.mockResolvedValue(['wf-1']);

			const result = await service.findAllWorkflowIdsForUser(
				member,
				['workflow:read'],
				'folder-1',
				'project-1',
			);

			expect(result).toEqual(['wf-1']);
			expect(folderRepository.getAllFolderIdsInHierarchy).toHaveBeenCalledWith(
				'folder-1',
				'project-1',
			);
			expect(workflowAccessRepository.findWorkflowIdsForUser).toHaveBeenCalledWith(
				{ userId: 'user-1', projectRoles: ['project:admin'], workflowRoles: ['workflow:owner'] },
				{ projectId: 'project-1', parentFolderIds: ['folder-1', 'folder-2'] },
			);
		});
	});

	describe('findOwnedWorkflowsBySourceWorkflowIds', () => {
		it('returns an empty list without querying when no ids are given', async () => {
			const { service, workflowAccessRepository } = makeService();

			await expect(service.findOwnedWorkflowsBySourceWorkflowIds('project-1', [])).resolves.toEqual(
				[],
			);
			expect(workflowAccessRepository.findOwnedWorkflowsBySourceWorkflowIds).not.toHaveBeenCalled();
		});
	});

	describe('findWorkflowsForUser', () => {
		const user = member;

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
			const { service, workflowRepository, workflowAccessRepository, roleService } = setup();

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
			expect(workflowAccessRepository.findWorkflowIdsForUser).not.toHaveBeenCalled();
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
				includeActiveVersion: true,
			});

			expect(workflowRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
				user,
				expect.anything(),
				expect.objectContaining({
					filter: { name: 'Invoice', active: true },
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

		it('selects bare share rows by default and the home project on request', async () => {
			const { service, workflowRepository } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read']);
			await service.findWorkflowsForUser(user, ['workflow:read'], { includeProjects: true });

			const [first, second] = workflowRepository.getManyAndCountWithSharingSubquery.mock.calls;
			assert(first?.[2] && second?.[2]);
			expect(first[2].select).toMatchObject({ shared: true });
			expect(first[2].select).not.toHaveProperty('ownedBy');
			expect(second[2].select).toMatchObject({ ownedBy: true });
			expect(second[2].select).not.toHaveProperty('shared');
		});

		it('sorts by id by default for public-list compatibility', async () => {
			const { service, workflowRepository } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read']);

			const [, , options] = workflowRepository.getManyAndCountWithSharingSubquery.mock.calls[0];
			assert(options);
			expect(options.sortBy).toBe('id:asc');
		});

		it('omits pinned data unless asked for it', async () => {
			const { service, workflowRepository } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read']);
			await service.findWorkflowsForUser(user, ['workflow:read'], { includePinnedData: true });

			const [first, second] = workflowRepository.getManyAndCountWithSharingSubquery.mock.calls;
			assert(first?.[2] && second?.[2]);
			expect(first[2].select).not.toHaveProperty('pinData');
			expect(second[2].select).toMatchObject({ pinData: true });
		});

		it('omits the activeVersion join unless asked for it', async () => {
			const { service, workflowRepository } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read']);
			await service.findWorkflowsForUser(user, ['workflow:read'], { includeActiveVersion: true });

			const [first, second] = workflowRepository.getManyAndCountWithSharingSubquery.mock.calls;
			assert(first?.[2] && second?.[2]);
			// Callers that never read it shouldn't pay for its nodes/connections.
			expect(first[2].select).not.toHaveProperty('activeVersion');
			expect(second[2].select).toMatchObject({ activeVersion: true });
		});

		it('omits pagination when no limit is given', async () => {
			const { service, workflowRepository } = setup();

			await service.findWorkflowsForUser(user, ['workflow:read']);

			const [, , options] = workflowRepository.getManyAndCountWithSharingSubquery.mock.calls[0];
			assert(options);
			expect(options).not.toHaveProperty('skip');
			expect(options).not.toHaveProperty('take');
		});
	});
});

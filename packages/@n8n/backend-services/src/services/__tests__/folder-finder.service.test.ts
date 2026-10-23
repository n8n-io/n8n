import { mock } from 'vitest-mock-extended';

import type {
	FolderAccessRepository,
	Folder,
	OperationContext,
	Role,
	Scope as DbScope,
	User,
} from '@n8n/db';

import { FolderFinderService } from '../folder-finder.service';
import type { RoleService } from '../role.service';

const member = mock<User>({
	id: 'user-1',
	role: { slug: 'global:member', scopes: [] },
});

describe('FolderFinderService', () => {
	const accessRepository = mock<FolderAccessRepository>();
	const roleService = mock<RoleService>();
	const service = new FolderFinderService(accessRepository, roleService);

	beforeEach(() => {
		vi.clearAllMocks();
		roleService.rolesWithScope.mockResolvedValue(['project:admin', 'project:editor']);
	});

	it('does not query for an empty folder id list', async () => {
		await expect(service.findFoldersByIdsForUser([], member, ['folder:read'])).resolves.toEqual([]);
		expect(accessRepository.findFoldersByIdsForUser).not.toHaveBeenCalled();
	});

	it('resolves project roles and delegates access filtering', async () => {
		const folder = mock<Folder>({ id: 'folder-1' });
		accessRepository.findFoldersByIdsForUser.mockResolvedValue([folder]);

		await expect(
			service.findFoldersByIdsForUser(['folder-1'], member, ['folder:read']),
		).resolves.toEqual([folder]);
		expect(accessRepository.findFoldersByIdsForUser).toHaveBeenCalledWith(
			['folder-1'],
			{
				userId: member.id,
				projectRoles: ['project:admin', 'project:editor'],
			},
			{},
		);
	});

	it('loads project roles through the repository callback', async () => {
		accessRepository.findRolesForAccessCheck.mockResolvedValue([]);
		roleService.rolesWithScope.mockImplementation(async (_namespace, _scopes, loadRoles) => {
			await loadRoles?.();
			return ['project:editor'];
		});

		await service.findFoldersByIdsForUser(['folder-1'], member, ['folder:read']);

		expect(accessRepository.findRolesForAccessCheck).toHaveBeenCalledWith({});
	});

	it('uses the global access path without resolving roles', async () => {
		const user = mock<User>({
			role: mock<Role>({
				slug: 'global:custom',
				scopes: [mock<DbScope>({ slug: 'folder:read' })],
			}),
		});

		await service.findFoldersByIdsForUser(['folder-1'], user, ['folder:read']);

		expect(accessRepository.findFoldersByIdsForUser).toHaveBeenCalledWith(['folder-1'], null, {});
		expect(roleService.rolesWithScope).not.toHaveBeenCalled();
	});

	it('returns an empty filter for an unknown folder', async () => {
		accessRepository.findExistingFolderIds.mockResolvedValue(new Set());

		await expect(service.findFolderFilterIdsWithoutAccessCheck('missing', true)).resolves.toEqual(
			[],
		);
		expect(accessRepository.findDescendantIds).not.toHaveBeenCalled();
	});

	it('returns a folder and all descendants without an access check', async () => {
		accessRepository.findExistingFolderIds.mockResolvedValue(new Set(['folder-1']));
		accessRepository.findDescendantIds.mockResolvedValue(['folder-2', 'folder-3']);

		await expect(service.findFolderFilterIdsWithoutAccessCheck('folder-1', true)).resolves.toEqual([
			'folder-1',
			'folder-2',
			'folder-3',
		]);
		expect(roleService.rolesWithScope).not.toHaveBeenCalled();
	});

	it('returns only the folder when descendants are not requested', async () => {
		accessRepository.findExistingFolderIds.mockResolvedValue(new Set(['folder-1']));

		await expect(service.findFolderFilterIdsWithoutAccessCheck('folder-1', false)).resolves.toEqual(
			['folder-1'],
		);
		expect(accessRepository.findDescendantIds).not.toHaveBeenCalled();
	});

	it('resolves subtrees in one descendant query', async () => {
		const ctx = mock<OperationContext>();
		const parent = mock<Folder>({ id: 'parent', parentFolderId: null });
		const child = mock<Folder>({ id: 'child', parentFolderId: 'parent' });
		accessRepository.findDescendantIds.mockResolvedValue(['child']);
		accessRepository.findFoldersByIdsForUser.mockResolvedValue([parent, child]);

		await expect(
			service.findFolderSubtreesForUser(['parent'], member, ['folder:read'], ctx),
		).resolves.toEqual([parent, child]);

		expect(accessRepository.findDescendantIds).toHaveBeenCalledWith(['parent'], ctx);
		expect(accessRepository.findFoldersByIdsForUser).toHaveBeenCalledWith(
			['parent', 'child'],
			expect.any(Object),
			ctx,
		);
	});

	it('short-circuits an empty subtree request', async () => {
		await expect(service.findFolderSubtreesForUser([], member, ['folder:read'])).resolves.toEqual(
			[],
		);
		expect(accessRepository.findDescendantIds).not.toHaveBeenCalled();
		expect(accessRepository.findFoldersByIdsForUser).not.toHaveBeenCalled();
	});

	it('builds root-first ancestor chains', async () => {
		const leaf = mock<Folder>({ id: 'leaf', parentFolderId: 'root' });
		const root = mock<Folder>({ id: 'root', parentFolderId: null });
		accessRepository.findFoldersByIdsForUser
			.mockResolvedValueOnce([leaf])
			.mockResolvedValueOnce([root]);

		const chains = await service.findFolderAncestorChainsForUser(['leaf'], member, ['folder:read']);

		expect(chains.get('leaf')).toEqual([root, leaf]);
	});

	it('fetches a shared ancestor once for multiple requested folders', async () => {
		const first = mock<Folder>({ id: 'first', parentFolderId: 'shared' });
		const second = mock<Folder>({ id: 'second', parentFolderId: 'shared' });
		const shared = mock<Folder>({ id: 'shared', parentFolderId: null });
		accessRepository.findFoldersByIdsForUser
			.mockResolvedValueOnce([first, second])
			.mockResolvedValueOnce([shared]);

		const chains = await service.findFolderAncestorChainsForUser(['first', 'second'], member, [
			'folder:read',
		]);

		expect(chains.get('first')).toEqual([shared, first]);
		expect(chains.get('second')).toEqual([shared, second]);
		expect(accessRepository.findFoldersByIdsForUser).toHaveBeenCalledTimes(2);
		expect(accessRepository.findFoldersByIdsForUser).toHaveBeenNthCalledWith(
			2,
			['shared'],
			expect.any(Object),
			{},
		);
	});

	it('truncates a chain when an ancestor is inaccessible', async () => {
		const leaf = mock<Folder>({ id: 'leaf', parentFolderId: 'inaccessible' });
		accessRepository.findFoldersByIdsForUser
			.mockResolvedValueOnce([leaf])
			.mockResolvedValueOnce([]);

		const chains = await service.findFolderAncestorChainsForUser(['leaf'], member, ['folder:read']);

		expect(chains.get('leaf')).toEqual([leaf]);
	});

	it('omits an inaccessible requested folder', async () => {
		accessRepository.findFoldersByIdsForUser.mockResolvedValue([]);

		const chains = await service.findFolderAncestorChainsForUser(['inaccessible'], member, [
			'folder:read',
		]);

		expect(chains).toEqual(new Map());
	});

	it('short-circuits an empty ancestor request', async () => {
		await expect(
			service.findFolderAncestorChainsForUser([], member, ['folder:read']),
		).resolves.toEqual(new Map());
		expect(accessRepository.findFoldersByIdsForUser).not.toHaveBeenCalled();
	});

	it('short-circuits an empty existing-folder request', async () => {
		await expect(service.findExistingFolderIds([])).resolves.toEqual(new Set());
		expect(accessRepository.findExistingFolderIds).not.toHaveBeenCalled();
	});

	it('returns existing folder ids without an access check', async () => {
		accessRepository.findExistingFolderIds.mockResolvedValue(new Set(['folder-1']));

		await expect(service.findExistingFolderIds(['folder-1', 'missing'])).resolves.toEqual(
			new Set(['folder-1']),
		);
		expect(accessRepository.findExistingFolderIds).toHaveBeenCalledWith(
			['folder-1', 'missing'],
			{},
		);
	});

	it('forwards context when listing project folder ids', async () => {
		const ctx = mock<OperationContext>();
		accessRepository.findFolderIdsInProject.mockResolvedValue(['folder-1']);

		await expect(service.findFolderIdsInProject('project-1', ctx)).resolves.toEqual(['folder-1']);
		expect(accessRepository.findFolderIdsInProject).toHaveBeenCalledWith('project-1', ctx);
	});
});

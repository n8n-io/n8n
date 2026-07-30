import type { Folder, FolderRepository, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { RoleService } from '@/services/role.service';

import { FolderFinderService } from '../folder-finder.service';

const nonGlobalUser = {
	id: 'user-1',
	role: { slug: 'global:member', scopes: [] },
} as unknown as User;

function makeFolder(overrides: Partial<Folder> = {}): Folder {
	return {
		id: 'fld-1',
		name: 'to_production',
		parentFolderId: null,
		homeProject: { id: 'proj-1' },
		...overrides,
	} as unknown as Folder;
}

function makeFinder(found: Folder[]) {
	const folderRepository = mock<FolderRepository>();
	folderRepository.find.mockResolvedValue(found);
	const roleService = mock<RoleService>();
	roleService.rolesWithScope.mockResolvedValue(['project:admin', 'project:editor']);
	const finder = new FolderFinderService(folderRepository, roleService);
	return { finder, folderRepository, roleService };
}

describe('FolderFinderService', () => {
	it('returns an empty list without querying for an empty folderIds list', async () => {
		const { finder, folderRepository } = makeFinder([]);

		const result = await finder.findFoldersByIdsForUser([], nonGlobalUser, ['folder:read']);

		expect(result).toEqual([]);
		expect(folderRepository.find.mock.calls).toHaveLength(0);
	});

	it('returns the folders the repository resolves', async () => {
		const folders = [makeFolder({ id: 'a' }), makeFolder({ id: 'b' })];
		const { finder } = makeFinder(folders);

		const result = await finder.findFoldersByIdsForUser(['a', 'b'], nonGlobalUser, ['folder:read']);

		expect(result).toEqual(folders);
	});

	it('filters by the requested project scope for non-global users', async () => {
		const { finder, folderRepository, roleService } = makeFinder([makeFolder()]);

		await finder.findFoldersByIdsForUser(['fld-1'], nonGlobalUser, ['folder:read']);

		expect(roleService.rolesWithScope.mock.calls[0]).toEqual(['project', ['folder:read']]);
		const where = folderRepository.find.mock.calls[0][0]?.where as {
			homeProject: { projectRelations: { userId: string } };
		};
		expect(where.homeProject.projectRelations.userId).toBe('user-1');
	});

	describe('findFolderSubtreesForUser', () => {
		it('resolves all requested folders and their descendants in a single batched query', async () => {
			const parentA = makeFolder({ id: 'parentA' });
			const parentB = makeFolder({ id: 'parentB' });
			const childA = makeFolder({ id: 'childA', parentFolderId: 'parentA' });
			const { finder, folderRepository } = makeFinder([parentA, parentB, childA]);
			folderRepository.getAllFolderIdsInSubtrees.mockResolvedValue(['childA']);

			const result = await finder.findFolderSubtreesForUser(['parentA', 'parentB'], nonGlobalUser, [
				'folder:read',
			]);

			expect(result).toEqual([parentA, parentB, childA]);
			// One batched call for every requested subtree, not one query per id.
			expect(folderRepository.getAllFolderIdsInSubtrees.mock.calls).toHaveLength(1);
			expect(folderRepository.getAllFolderIdsInSubtrees.mock.calls[0]).toEqual([
				['parentA', 'parentB'],
			]);
			// requested ids + descendant id, deduped, are authorized in one query
			const where = folderRepository.find.mock.calls[0][0]?.where as unknown as {
				id: { value: string[] };
			};
			expect(where.id.value).toEqual(['parentA', 'parentB', 'childA']);
		});

		it('returns an empty list for an empty request without querying', async () => {
			const { finder, folderRepository } = makeFinder([]);

			const result = await finder.findFolderSubtreesForUser([], nonGlobalUser, ['folder:read']);

			expect(result).toEqual([]);
			expect(folderRepository.getAllFolderIdsInSubtrees.mock.calls).toHaveLength(0);
			expect(folderRepository.find.mock.calls).toHaveLength(0);
		});
	});

	describe('findFolderAncestorChainsForUser', () => {
		it('returns an empty map for an empty request without querying', async () => {
			const { finder, folderRepository } = makeFinder([]);

			const result = await finder.findFolderAncestorChainsForUser([], nonGlobalUser, [
				'folder:read',
			]);

			expect(result).toEqual(new Map());
			expect(folderRepository.find.mock.calls).toHaveLength(0);
		});

		it('climbs the parent links level by level and orders the chain root-first', async () => {
			const leaf = makeFolder({ id: 'leaf', parentFolderId: 'mid' });
			const mid = makeFolder({ id: 'mid', parentFolderId: 'root' });
			const root = makeFolder({ id: 'root', parentFolderId: null });
			const { finder, folderRepository } = makeFinder([]);
			folderRepository.find
				.mockResolvedValueOnce([leaf])
				.mockResolvedValueOnce([mid])
				.mockResolvedValueOnce([root]);

			const result = await finder.findFolderAncestorChainsForUser(['leaf'], nonGlobalUser, [
				'folder:read',
			]);

			expect(result.get('leaf')).toEqual([root, mid, leaf]);
			// One query per level of the chain, climbing one parent at a time.
			expect(folderRepository.find.mock.calls).toHaveLength(3);
		});

		it('fetches a shared ancestor once for multiple requested folders', async () => {
			const a = makeFolder({ id: 'a', parentFolderId: 'shared' });
			const b = makeFolder({ id: 'b', parentFolderId: 'shared' });
			const shared = makeFolder({ id: 'shared', parentFolderId: null });
			const { finder, folderRepository } = makeFinder([]);
			folderRepository.find.mockResolvedValueOnce([a, b]).mockResolvedValueOnce([shared]);

			const result = await finder.findFolderAncestorChainsForUser(['a', 'b'], nonGlobalUser, [
				'folder:read',
			]);

			expect(result.get('a')).toEqual([shared, a]);
			expect(result.get('b')).toEqual([shared, b]);
			// Two rounds only: the deduped shared ancestor is resolved in one query.
			expect(folderRepository.find.mock.calls).toHaveLength(2);
			const secondRoundIds = folderRepository.find.mock.calls[1][0]?.where as unknown as {
				id: { value: string[] };
			};
			expect(secondRoundIds.id.value).toEqual(['shared']);
		});

		it('truncates the chain when an ancestor is inaccessible', async () => {
			const leaf = makeFolder({ id: 'leaf', parentFolderId: 'mid' });
			const { finder, folderRepository } = makeFinder([]);
			// The requested folder resolves, but its parent is filtered out by access.
			folderRepository.find.mockResolvedValueOnce([leaf]).mockResolvedValueOnce([]);

			const result = await finder.findFolderAncestorChainsForUser(['leaf'], nonGlobalUser, [
				'folder:read',
			]);

			expect(result.get('leaf')).toEqual([leaf]);
		});

		it('omits a requested folder that is itself inaccessible', async () => {
			const { finder, folderRepository } = makeFinder([]);
			folderRepository.find.mockResolvedValueOnce([]);

			const result = await finder.findFolderAncestorChainsForUser(['no-access'], nonGlobalUser, [
				'folder:read',
			]);

			expect(result.has('no-access')).toBe(false);
			expect(result.size).toBe(0);
		});
	});

	describe('findExistingFolderIds', () => {
		it('returns an empty set without querying when no ids are given', async () => {
			const { finder, folderRepository } = makeFinder([]);

			const result = await finder.findExistingFolderIds([]);

			expect(result.size).toBe(0);
			expect(folderRepository.find.mock.calls).toHaveLength(0);
		});

		it('returns the ids that exist in the database, unscoped by access', async () => {
			const { finder } = makeFinder([makeFolder({ id: 'fld-1' })]);

			const result = await finder.findExistingFolderIds(['fld-1', 'fld-missing']);

			expect(result).toEqual(new Set(['fld-1']));
		});
	});
});

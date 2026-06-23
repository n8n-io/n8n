import type { Folder, FolderRepository, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

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
		it('loads each requested folder together with its descendants', async () => {
			const parent = makeFolder({ id: 'parent' });
			const child = makeFolder({ id: 'child', parentFolderId: 'parent' });
			const { finder, folderRepository } = makeFinder([parent, child]);
			folderRepository.getAllFolderIdsInHierarchy.mockResolvedValue(['child']);

			const result = await finder.findFolderSubtreesForUser(['parent'], nonGlobalUser, [
				'folder:read',
			]);

			expect(result).toEqual([parent, child]);
			expect(folderRepository.getAllFolderIdsInHierarchy.mock.calls[0]).toEqual(['parent']);
			// requested id + descendant id, deduped, are authorized in one query
			const where = folderRepository.find.mock.calls[0][0]?.where as { id: { value: string[] } };
			expect(where.id.value).toEqual(['parent', 'child']);
		});

		it('returns an empty list for an empty request without querying', async () => {
			const { finder, folderRepository } = makeFinder([]);

			const result = await finder.findFolderSubtreesForUser([], nonGlobalUser, ['folder:read']);

			expect(result).toEqual([]);
			expect(folderRepository.getAllFolderIdsInHierarchy.mock.calls).toHaveLength(0);
			expect(folderRepository.find.mock.calls).toHaveLength(0);
		});
	});
});

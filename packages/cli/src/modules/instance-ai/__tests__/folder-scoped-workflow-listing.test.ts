import {
	collectFolderSubtree,
	resolveRequestedFolder,
} from '../instance-ai.adapter.service';

type Folder = {
	id: string;
	name: string;
	path: string;
	parentFolderId: string | null;
};

const scope = (...folders: Folder[]) => new Map(folders.map((folder) => [folder.id, folder]));

const folder = (id: string, path: string, parentFolderId: string | null = null): Folder => ({
	id,
	name: path.split('/').at(-1) ?? path,
	path,
	parentFolderId,
});

describe('resolveRequestedFolder', () => {
	describe('a folder the user named', () => {
		it('resolves an exact path', () => {
			const folders = scope(folder('f1', 'Clients'), folder('f2', 'Clients/Acme', 'f1'));

			expect(resolveRequestedFolder({ folderPath: 'Clients/Acme' }, folders)).toEqual({
				folderId: 'f2',
			});
		});

		it('resolves regardless of case and surrounding slashes', () => {
			const folders = scope(folder('f1', 'Clients'), folder('f2', 'Clients/Acme', 'f1'));

			expect(resolveRequestedFolder({ folderPath: '/clients/ACME/' }, folders)).toEqual({
				folderId: 'f2',
			});
		});

		it('resolves a bare folder name that is nested', () => {
			const folders = scope(folder('f1', 'Clients'), folder('f2', 'Clients/Acme', 'f1'));

			expect(resolveRequestedFolder({ folderPath: 'Acme' }, folders)).toEqual({ folderId: 'f2' });
		});

		// The trace this came from: the user wrote "personal/logsearch", where `personal`
		// is the PROJECT. A project is not part of a folder path, so a path match can
		// never succeed and the last segment has to be tried on its own.
		it('resolves when the user prefixed the path with a project name', () => {
			const folders = scope(folder('f1', 'logsearch'));

			expect(resolveRequestedFolder({ folderPath: 'personal/logsearch' }, folders)).toEqual({
				folderId: 'f1',
			});
		});
	});

	describe('a folder that cannot be resolved', () => {
		it('reports not-found with the folders that do exist', () => {
			const folders = scope(folder('f1', 'logsearch'), folder('f2', 'Archive'));

			expect(resolveRequestedFolder({ folderPath: 'ragdoll' }, folders)).toEqual({
				reason: 'not-found',
				candidates: ['Archive', 'logsearch'],
			});
		});

		it('reports ambiguous with only the colliding folders', () => {
			const folders = scope(
				folder('f1', 'Clients'),
				folder('f2', 'Clients/Acme', 'f1'),
				folder('f3', 'Archive'),
				folder('f4', 'Archive/Acme', 'f3'),
			);

			expect(resolveRequestedFolder({ folderPath: 'Acme' }, folders)).toEqual({
				reason: 'ambiguous',
				candidates: ['Archive/Acme', 'Clients/Acme'],
			});
		});

		it('reports not-found for an empty path rather than matching everything', () => {
			const folders = scope(folder('f1', 'logsearch'));

			expect(resolveRequestedFolder({ folderPath: '   ' }, folders)).toEqual({
				reason: 'not-found',
				candidates: ['logsearch'],
			});
		});

		// The whole point of the field: a near-miss must NOT quietly become a wider set.
		it('does not partially match a similar folder name', () => {
			const folders = scope(folder('f1', 'Acme-Archive'));

			expect(resolveRequestedFolder({ folderPath: 'Acme' }, folders)).toEqual({
				reason: 'not-found',
				candidates: ['Acme-Archive'],
			});
		});

		it('reports unsupported when folders are unlicensed', () => {
			expect(resolveRequestedFolder({ folderPath: 'logsearch' }, undefined)).toEqual({
				reason: 'unsupported',
				candidates: [],
			});
		});
	});

	describe('a folder id supplied by a previous listing', () => {
		it('resolves an id that exists in scope', () => {
			const folders = scope(folder('f1', 'logsearch'));

			expect(resolveRequestedFolder({ folderId: 'f1' }, folders)).toEqual({ folderId: 'f1' });
		});

		it('reports not-found for an id outside scope instead of listing everything', () => {
			const folders = scope(folder('f1', 'logsearch'));

			expect(resolveRequestedFolder({ folderId: 'nope' }, folders)).toEqual({
				reason: 'not-found',
				candidates: ['logsearch'],
			});
		});
	});
});

describe('collectFolderSubtree', () => {
	it('includes every nested descendant, not just direct children', () => {
		const folders = scope(
			folder('root', 'Clients'),
			folder('mid', 'Clients/Acme', 'root'),
			folder('leaf', 'Clients/Acme/2026', 'mid'),
			folder('other', 'Archive'),
		);

		expect(collectFolderSubtree('root', folders).sort()).toEqual(['leaf', 'mid', 'root']);
	});

	it('returns just the folder when it has no children', () => {
		const folders = scope(folder('root', 'Clients'), folder('other', 'Archive'));

		expect(collectFolderSubtree('root', folders)).toEqual(['root']);
	});

	// Not reachable through the UI, but a malformed parent link must return a wrong
	// answer at worst, never hang the request.
	it('terminates on a cyclic parent link', () => {
		const folders = scope(folder('a', 'A', 'b'), folder('b', 'B', 'a'));

		expect(collectFolderSubtree('a', folders).sort()).toEqual(['a', 'b']);
	});

	it('narrows to the folder alone when no folder scope is readable', () => {
		expect(collectFolderSubtree('f1', undefined)).toEqual(['f1']);
	});
});

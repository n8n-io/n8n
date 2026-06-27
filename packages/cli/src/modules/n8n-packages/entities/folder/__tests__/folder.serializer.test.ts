import type { Folder } from '@n8n/db';

import { FolderSerializer } from '../folder.serializer';

function makeFolder(overrides: Partial<Folder> = {}): Folder {
	return {
		id: 'fld-1',
		name: 'to_production',
		parentFolderId: null,
		parentFolder: null,
		subFolders: [],
		homeProject: { id: 'proj-1' },
		workflows: [],
		tags: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as unknown as Folder;
}

describe('FolderSerializer', () => {
	const serializer = new FolderSerializer();

	it('returns exactly id, name and the effective parentFolderId', () => {
		const folder = makeFolder();

		const serialized = serializer.serialize(folder, null);

		expect(Object.keys(serialized).sort()).toEqual(['id', 'name', 'parentFolderId']);
		expect(serialized).toEqual({ id: 'fld-1', name: 'to_production', parentFolderId: null });
	});

	it('uses the effective parent passed by the exporter, not the entity parentFolderId', () => {
		// The folder's real parent is outside the exported set; the exporter re-roots it.
		const folder = makeFolder({
			id: 'fld-2',
			name: 'nested',
			parentFolderId: 'real-parent-outside-export',
		});

		const reRooted = serializer.serialize(folder, null);
		const nested = serializer.serialize(folder, 'fld-1');

		expect(reRooted.parentFolderId).toBeNull();
		expect(nested.parentFolderId).toBe('fld-1');
	});

	it('does not leak folder relations or timestamps', () => {
		const serialized = serializer.serialize(makeFolder(), null) as unknown as Record<
			string,
			unknown
		>;

		expect(serialized.homeProject).toBeUndefined();
		expect(serialized.subFolders).toBeUndefined();
		expect(serialized.workflows).toBeUndefined();
		expect(serialized.tags).toBeUndefined();
		expect(serialized.createdAt).toBeUndefined();
		expect(serialized.updatedAt).toBeUndefined();
	});
});

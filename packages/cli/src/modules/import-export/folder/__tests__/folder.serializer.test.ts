import type { Folder } from '@n8n/db';

import { FolderSerializer } from '../folder.serializer';

describe('FolderSerializer', () => {
	const serializer = new FolderSerializer();

	const baseFolder = {
		id: 'aabb1100-0000-0000-0000-000000000000',
		name: 'invoices',
		parentFolderId: null,
		parentFolder: null,
		subFolders: [],
		homeProject: {},
		workflows: [],
		tags: [],
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-02'),
	} as unknown as Folder;

	it('should serialize a root folder', () => {
		const result = serializer.serialize(baseFolder);

		expect(result).toEqual({
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'invoices',
			parentFolderId: null,
		});
	});

	it('should serialize a child folder with parentFolderId', () => {
		const folder = { ...baseFolder, parentFolderId: 'parent-folder-id' } as unknown as Folder;
		const result = serializer.serialize(folder);

		expect(result).toEqual({
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'invoices',
			parentFolderId: 'parent-folder-id',
		});
	});

	it('should omit timestamps and relations', () => {
		const result = serializer.serialize(baseFolder);

		expect(result).not.toHaveProperty('createdAt');
		expect(result).not.toHaveProperty('updatedAt');
		expect(result).not.toHaveProperty('parentFolder');
		expect(result).not.toHaveProperty('subFolders');
		expect(result).not.toHaveProperty('homeProject');
		expect(result).not.toHaveProperty('workflows');
		expect(result).not.toHaveProperty('tags');
	});
});

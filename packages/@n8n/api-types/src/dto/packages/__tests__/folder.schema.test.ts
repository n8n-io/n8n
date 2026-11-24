import { serializedFolderSchema } from '../folder.schema';

describe('serializedFolderSchema', () => {
	it('accepts a folder shell with a null parentFolderId (re-rooted folder)', () => {
		const folder = { id: 'fld-1', name: 'to_production', parentFolderId: null };

		expect(() => serializedFolderSchema.parse(folder)).not.toThrow();
	});

	it('accepts a folder shell whose parent is present in the package', () => {
		const folder = { id: 'fld-2', name: 'nested', parentFolderId: 'fld-1' };

		expect(() => serializedFolderSchema.parse(folder)).not.toThrow();
	});

	it('rejects unknown keys', () => {
		const folder = {
			id: 'fld-1',
			name: 'to_production',
			parentFolderId: null,
			createdAt: '2026-01-01T00:00:00.000Z',
		};

		expect(() => serializedFolderSchema.parse(folder)).toThrow();
	});

	it('requires parentFolderId to be present (nullable, not optional)', () => {
		const folder = { id: 'fld-1', name: 'to_production' };

		expect(() => serializedFolderSchema.parse(folder)).toThrow();
	});

	it('rejects an empty id', () => {
		const folder = { id: '', name: 'to_production', parentFolderId: null };

		expect(() => serializedFolderSchema.parse(folder)).toThrow();
	});
});

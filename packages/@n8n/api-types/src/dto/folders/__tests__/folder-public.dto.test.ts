import { CreateFolderPublicDto, FolderPublicDto } from '../folder-public.dto';

const folder = {
	id: 'abc123',
	name: 'My Folder',
	parentFolderId: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('FolderPublicDto', () => {
	test('accepts all the expected fields', () => {
		expect(FolderPublicDto.safeParse(folder).success).toBe(true);
	});

	test('accepts a folder with a parent', () => {
		expect(FolderPublicDto.safeParse({ ...folder, parentFolderId: 'parent1' }).success).toBe(true);
	});

	test('drops fields the Public API does not publish', () => {
		const result = FolderPublicDto.safeParse({
			...folder,
			homeProject: { id: 'p1' },
			parentFolder: { id: 'parent1' },
			tags: [],
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual(folder);
	});

	test.each([
		['a missing parentFolderId', { parentFolderId: undefined }],
		['a Date for createdAt', { createdAt: new Date() }],
		['a non-ISO createdAt', { createdAt: 'yesterday' }],
	])('rejects %s', (_label, override) => {
		expect(FolderPublicDto.safeParse({ ...folder, ...override }).success).toBe(false);
	});
});

describe('CreateFolderPublicDto', () => {
	test('accepts a name on its own', () => {
		expect(CreateFolderPublicDto.safeParse({ name: 'My Folder' }).success).toBe(true);
	});

	test('accepts a name and a parentFolderId', () => {
		const result = CreateFolderPublicDto.safeParse({ name: 'Child', parentFolderId: 'abc123' });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ name: 'Child', parentFolderId: 'abc123' });
	});

	test.each([
		['a missing name', {}, ['name']],
		['an empty name', { name: '' }, ['name']],
		['a name with an illegal character', { name: 'a/b' }, ['name']],
		['a name over 128 characters', { name: 'a'.repeat(129) }, ['name']],
		[
			'a parentFolderId over 36 characters',
			{ name: 'a', parentFolderId: 'b'.repeat(37) },
			['parentFolderId'],
		],
		['an unknown key', { name: 'My Folder', tags: [] }, []],
	])('rejects %s', (_label, payload, path) => {
		const result = CreateFolderPublicDto.safeParse(payload);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(path);
	});
});

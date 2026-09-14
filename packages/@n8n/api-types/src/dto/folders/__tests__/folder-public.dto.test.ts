import {
	FolderDetailsPublicDto,
	FolderListPublicDto,
	folderPublicSchema,
	ListFoldersQueryPublicDto,
	UpdatedFolderPublicDto,
	UpdateFolderPublicDto,
} from '../folder-public.dto';

const folder = {
	id: 'zLXWgYyZrZ4Gn1Vk',
	name: 'Campaigns',
	parentFolderId: 'aBXWgYyZrZ4Gn1Vk',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
	homeProject: {
		id: 'VmwOO9HeTEj20kxM',
		name: 'Marketing',
		type: 'team',
		icon: { type: 'icon', value: 'layers' },
	},
	parentFolder: { id: 'aBXWgYyZrZ4Gn1Vk', name: 'Marketing', parentFolderId: null },
	tags: [{ id: 'tag-1', name: 'campaign' }],
	workflowCount: 3,
	subFolderCount: 1,
	path: ['Marketing', 'Campaigns'],
};

describe('folderPublicSchema', () => {
	test('accepts every field the list query can load', () => {
		const result = folderPublicSchema.safeParse(folder);

		expect(result.success).toBe(true);
		expect(result.data).toEqual(folder);
	});

	test('accepts a folder reduced by the select query option', () => {
		const result = folderPublicSchema.safeParse({ id: folder.id, name: folder.name });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ id: folder.id, name: folder.name });
	});

	test('accepts a root folder', () => {
		const result = folderPublicSchema.safeParse({
			...folder,
			parentFolderId: null,
			parentFolder: null,
		});

		expect(result.success).toBe(true);
	});

	test('accepts a project type outside the current enum', () => {
		const result = folderPublicSchema.safeParse({
			...folder,
			homeProject: { ...folder.homeProject, type: 'legacy' },
		});

		expect(result.success).toBe(true);
	});

	test('strips fields the Public API does not publish', () => {
		const result = folderPublicSchema.parse({ ...folder, projectId: 'VmwOO9HeTEj20kxM' });

		expect(result).not.toHaveProperty('projectId');
	});
});

describe('FolderDetailsPublicDto', () => {
	const details = {
		id: folder.id,
		name: folder.name,
		parentFolderId: folder.parentFolderId,
		createdAt: folder.createdAt,
		updatedAt: folder.updatedAt,
		totalSubFolders: 1,
		totalWorkflows: 3,
	};

	test('accepts a folder with recursive content counts', () => {
		expect(FolderDetailsPublicDto.safeParse(details).success).toBe(true);
	});

	test('rejects a folder missing required fields', () => {
		expect(FolderDetailsPublicDto.safeParse({ id: folder.id, name: folder.name }).success).toBe(
			false,
		);
	});

	test('strips fields the get-one route does not publish', () => {
		const result = FolderDetailsPublicDto.parse({ ...details, projectId: 'VmwOO9HeTEj20kxM' });

		expect(result).not.toHaveProperty('projectId');
	});
});

describe('FolderListPublicDto', () => {
	test('accepts a count and a list of folders', () => {
		expect(FolderListPublicDto.safeParse({ count: 1, data: [folder] }).success).toBe(true);
	});

	test('rejects a bare array', () => {
		expect(FolderListPublicDto.safeParse([folder]).success).toBe(false);
	});
});

describe('ListFoldersQueryPublicDto', () => {
	test('defaults skip and take when neither is sent', () => {
		const result = ListFoldersQueryPublicDto.safeParse({});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ skip: 0, take: 10 });
	});

	test('decodes the filter and select parameters', () => {
		const result = ListFoldersQueryPublicDto.safeParse({
			filter: '{"name":"Campaigns"}',
			select: '["id","name"]',
			sortBy: 'name:asc',
			skip: '5',
			take: '25',
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({
			filter: { name: 'Campaigns' },
			select: { id: true, name: true },
			sortBy: 'name:asc',
			skip: 5,
			take: 25,
		});
	});

	test('keeps the legacy wording for an invalid sortBy', () => {
		const result = ListFoldersQueryPublicDto.safeParse({ sortBy: 'size:asc' });

		expect(result.success).toBe(false);
		expect(result.error?.errors[0]).toMatchObject({
			path: ['sortBy'],
			message:
				'must be equal to one of the allowed values: name:asc, name:desc, createdAt:asc, createdAt:desc, updatedAt:asc, updatedAt:desc',
		});
	});

	test('rejects an undocumented query parameter', () => {
		const result = ListFoldersQueryPublicDto.safeParse({ offset: '10' });

		expect(result.success).toBe(false);
		expect(result.error?.errors[0].code).toBe('unrecognized_keys');
	});
});

describe('UpdateFolderPublicDto', () => {
	describe('Valid requests', () => {
		test.each([
			{ name: 'name only', request: { name: 'Renamed Folder' } },
			{ name: 'parentFolderId only', request: { parentFolderId: 'abc123' } },
			{ name: 'both fields', request: { name: 'Renamed Folder', parentFolderId: 'abc123' } },
		])('should validate $name', ({ request }) => {
			expect(UpdateFolderPublicDto.safeParse(request).success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'an empty body', request: {} },
			{ name: 'an empty name', request: { name: '   ' } },
			{ name: 'a non-string name', request: { name: 0 } },
			{ name: 'a non-string parentFolderId', request: { parentFolderId: 0 } },
			// `tagIds` is what the internal update DTO takes; the public route never documented it.
			{ name: 'tagIds', request: { name: 'Renamed Folder', tagIds: ['1'] } },
			{ name: 'an unknown property', request: { name: 'Renamed Folder', unknown: true } },
		])('should fail validation for $name', ({ request }) => {
			expect(UpdateFolderPublicDto.safeParse(request).success).toBe(false);
		});
	});
});

describe('UpdatedFolderPublicDto', () => {
	const updatedFolder = {
		id: 'folder-id',
		name: 'My Folder',
		parentFolderId: null,
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2025-01-02T00:00:00.000Z',
	};

	it('accepts the published folder shape', () => {
		expect(UpdatedFolderPublicDto.safeParse(updatedFolder).success).toBe(true);
	});

	it('strips fields the Public API does not publish', () => {
		const parsed = UpdatedFolderPublicDto.parse({
			...updatedFolder,
			projectId: 'project-id',
			tags: [],
		});

		expect(parsed).toEqual(updatedFolder);
	});
});

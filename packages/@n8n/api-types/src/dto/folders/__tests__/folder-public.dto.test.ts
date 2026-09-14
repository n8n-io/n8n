import { FolderPublicDto, UpdateFolderPublicDto } from '../folder-public.dto';

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

describe('FolderPublicDto', () => {
	const folder = {
		id: 'folder-id',
		name: 'My Folder',
		parentFolderId: null,
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2025-01-02T00:00:00.000Z',
	};

	it('accepts the published folder shape', () => {
		expect(FolderPublicDto.safeParse(folder).success).toBe(true);
	});

	it('strips fields the Public API does not publish', () => {
		const parsed = FolderPublicDto.parse({ ...folder, projectId: 'project-id', tags: [] });

		expect(parsed).toEqual(folder);
	});
});

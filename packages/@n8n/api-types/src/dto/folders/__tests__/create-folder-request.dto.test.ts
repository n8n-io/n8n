import { CreateFolderDto } from '../create-folder.dto';

describe('CreateFolderDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'name without parentId',
				request: {
					name: 'test',
				},
			},
			{
				name: 'name and parentFolderId',
				request: {
					name: 'test',
					parentFolderId: '2Hw01NJ7biAj_LU6',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = CreateFolderDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing name',
				request: {},
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty name',
				request: {
					name: '',
				},
				expectedErrorPath: ['name'],
			},

			{
				name: 'parentFolderId and no name',
				request: {
					parentFolderId: '',
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'invalid parentFolderId',
				request: {
					name: 'test',
					parentFolderId: 1,
				},
				expectedErrorPath: ['parentFolderId'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = CreateFolderDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

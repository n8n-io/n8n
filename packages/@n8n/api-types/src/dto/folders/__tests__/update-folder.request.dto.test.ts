import { UpdateFolderDto } from '../update-folder.dto';

describe('UpdateFolderDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'name without parentId',
				request: {
					name: 'test',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateFolderDto.safeParse(request);
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
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateFolderDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

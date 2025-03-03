import { UpdateFolderDto } from '../update-folder.dto';

describe('UpdateFolderDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'name',
				request: {
					name: 'test',
				},
			},
			{
				name: 'tagIds',
				request: {
					tagIds: ['1', '2'],
				},
			},
			{
				name: 'empty tagIds',
				request: {
					tagIds: [],
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
				name: 'empty name',
				request: {
					name: '',
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'non string tagIds',
				request: {
					tagIds: [0],
				},
				expectedErrorPath: ['tagIds'],
			},
			{
				name: 'non array tagIds',
				request: {
					tagIds: 0,
				},
				expectedErrorPath: ['tagIds'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateFolderDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path[0]).toEqual(expectedErrorPath[0]);
			}
		});
	});
});

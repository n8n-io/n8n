import { CreateOrUpdateTagRequestDto } from '../create-or-update-tag-request.dto';

describe('CreateOrUpdateTagRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid name',
				request: {
					name: 'tag-name',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = CreateOrUpdateTagRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'empty tag name',
				request: {
					name: '',
				},
				expectedErrorPath: ['name'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = CreateOrUpdateTagRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

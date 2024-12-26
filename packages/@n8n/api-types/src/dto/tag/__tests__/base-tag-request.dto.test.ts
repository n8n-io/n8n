import { BaseTagRequestDto } from '../base-tag-request.dto';

describe('BaseTagRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid name',
				request: {
					name: 'tag-name',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = BaseTagRequestDto.safeParse(request);
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
			const result = BaseTagRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

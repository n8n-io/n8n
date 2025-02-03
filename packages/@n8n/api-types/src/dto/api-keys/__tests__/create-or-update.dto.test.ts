import { CreateOrUpdateApiKeyRequestDto } from '../create-or-update-api-key-request.dto';

describe('CreateOrUpdateApiKeyRequestDto', () => {
	describe('Valid requests', () => {
		test('should allow valid label', () => {
			const result = CreateOrUpdateApiKeyRequestDto.safeParse({
				label: 'valid label',
			});
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'empty label',
				label: '',
				expectedErrorPath: ['label'],
			},
			{
				name: 'label exceeding 50 characters',
				label: '2mWMfsrvAmneWluS8IbezaIHZOu2mWMfsrvAmneWluS8IbezaIa',
				expectedErrorPath: ['label'],
			},
			{
				name: 'label with xss injection',
				label: '<script>alert("xss");new label</script>',
				expectedErrorPath: ['label'],
			},
		])('should fail validation for $name', ({ label, expectedErrorPath }) => {
			const result = CreateOrUpdateApiKeyRequestDto.safeParse({ label });

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

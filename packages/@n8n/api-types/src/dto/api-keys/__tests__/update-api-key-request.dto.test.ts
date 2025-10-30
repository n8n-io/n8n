import { UpdateApiKeyRequestDto } from '../update-api-key-request.dto';

describe('UpdateApiKeyRequestDto', () => {
	describe('Valid requests', () => {
		test('should allow valid label', () => {
			const result = UpdateApiKeyRequestDto.safeParse({
				label: 'valid label',
				scopes: ['user:create'],
			});
			expect(result.success).toBe(true);
		});

		test('should allow valid scope', () => {
			const result = UpdateApiKeyRequestDto.safeParse({
				label: 'valid label',
				scopes: ['user:create'],
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
			{
				name: 'scopes with malformed scope',
				label: 'valid label',
				scopes: ['user:1'],
				expectedErrorPath: ['scopes', 0],
			},
			{
				name: 'scopes with empty array',
				label: 'valid label',
				scopes: [],
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'scopes with {}',
				label: 'valid label',
				scopes: {},
				expectedErrorPath: ['scopes'],
			},
		])('should fail validation for $name', ({ label, scopes, expectedErrorPath }) => {
			const result = UpdateApiKeyRequestDto.safeParse({ label, scopes });

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

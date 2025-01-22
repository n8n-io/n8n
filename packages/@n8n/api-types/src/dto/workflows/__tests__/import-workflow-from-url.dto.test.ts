import { ImportWorkflowFromUrlDto } from '../import-workflow-from-url.dto';

describe('ImportWorkflowFromUrlDto', () => {
	describe('Valid requests', () => {
		test('should validate $name', () => {
			const result = ImportWorkflowFromUrlDto.safeParse({
				url: 'https://example.com/workflow.json',
			});
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid URL (not ending with .json)',
				url: 'https://example.com/workflow',
				expectedErrorPath: ['url'],
			},
			{
				name: 'invalid URL (missing protocol)',
				url: 'example.com/workflow.json',
				expectedErrorPath: ['url'],
			},
			{
				name: 'invalid URL (not a URL)',
				url: 'not-a-url',
				expectedErrorPath: ['url'],
			},
			{
				name: 'missing URL',
				url: undefined,
				expectedErrorPath: ['url'],
			},
			{
				name: 'null URL',
				url: null,
				expectedErrorPath: ['url'],
			},
			{
				name: 'invalid URL (ends with .json but not a valid URL)',
				url: 'not-a-url.json',
				expectedErrorPath: ['url'],
			},
			{
				name: 'valid URL with query parameters',
				url: 'https://example.com/workflow.json?param=value',
			},
			{
				name: 'valid URL with fragments',
				url: 'https://example.com/workflow.json#section',
			},
		])('should fail validation for $name', ({ url, expectedErrorPath }) => {
			const result = ImportWorkflowFromUrlDto.safeParse({ url });

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

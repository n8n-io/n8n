import { ImportWorkflowFromUrlDto } from '../import-workflow-from-url.dto';

describe('ImportWorkflowFromUrlDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid URL with .json extension',
				url: 'https://example.com/workflow.json',
			},
			{
				name: 'valid URL without .json extension',
				url: 'https://example.com/workflow',
			},
			{
				name: 'valid URL with query parameters',
				url: 'https://example.com/workflow.json?param=value',
			},
			{
				name: 'valid URL with fragments',
				url: 'https://example.com/workflow.json#section',
			},
			{
				name: 'valid API endpoint URL',
				url: 'https://api.example.com/v1/workflows/123',
			},
		])('should validate $name', ({ url }) => {
			const result = ImportWorkflowFromUrlDto.safeParse({ url });
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
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
		])('should fail validation for $name', ({ url, expectedErrorPath }) => {
			const result = ImportWorkflowFromUrlDto.safeParse({ url });

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

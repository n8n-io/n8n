import { ImportWorkflowFromUrlDto } from '../import-workflow-from-url.dto';

describe('ImportWorkflowFromUrlDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid URL with .json extension',
				url: 'https://example.com/workflow.json',
				projectId: '12345',
			},
			{
				name: 'valid URL without .json extension',
				url: 'https://example.com/workflow',
				projectId: '12345',
			},
			{
				name: 'valid URL with query parameters',
				url: 'https://example.com/workflow.json?param=value',
				projectId: '12345',
			},
			{
				name: 'valid URL with fragments',
				url: 'https://example.com/workflow.json#section',
				projectId: '12345',
			},
			{
				name: 'valid API endpoint URL',
				url: 'https://api.example.com/v1/workflows/123',
				projectId: '12345',
			},
		])('should validate $name', ({ url, projectId }) => {
			const result = ImportWorkflowFromUrlDto.safeParse({ url, projectId });
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

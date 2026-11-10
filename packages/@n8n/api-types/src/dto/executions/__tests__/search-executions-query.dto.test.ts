import { SearchExecutionsQueryDto } from '../search-executions-query.dto';

describe('SearchExecutionsQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{ name: 'no criteria', request: {}, parsedResult: {} },
			{ name: 'text', request: { text: 'ENG-123' }, parsedResult: { text: 'ENG-123' } },
			{
				name: 'text with spaces around it',
				request: { text: '  abc ' },
				parsedResult: { text: 'abc' },
			},
			{ name: 'node name', request: { nodeName: 'If' }, parsedResult: { nodeName: 'If' } },
			{
				name: 'text and node name, without the list params',
				request: { text: 'ENG-123', nodeName: 'Webhook', filter: '{}', limit: '20' },
				parsedResult: { text: 'ENG-123', nodeName: 'Webhook' },
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = SearchExecutionsQueryDto.safeParse(request);

			expect(result.success).toBe(true);
			expect(result.data).toEqual(parsedResult);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'text that is too short', request: { text: 'ab' }, expectedErrorPath: ['text'] },
			{
				name: 'text that is too short without spaces',
				request: { text: ' ab ' },
				expectedErrorPath: ['text'],
			},
			{
				name: 'text that is too long',
				request: { text: 'a'.repeat(201) },
				expectedErrorPath: ['text'],
			},
			{ name: 'empty node name', request: { nodeName: '' }, expectedErrorPath: ['nodeName'] },
			{
				name: 'text that is not a string',
				request: { text: ['a', 'b'] },
				expectedErrorPath: ['text'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = SearchExecutionsQueryDto.safeParse(request);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
		});
	});
});

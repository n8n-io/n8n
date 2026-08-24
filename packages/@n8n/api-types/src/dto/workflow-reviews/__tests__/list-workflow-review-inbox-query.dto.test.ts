import { ListWorkflowReviewInboxQueryDto } from '../list-workflow-review-inbox.dto';

describe('ListWorkflowReviewInboxQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'no filters at all',
				request: {},
				parsedResult: { limit: 15 },
			},
			{
				name: 'category waiting',
				request: { category: 'waiting' },
				parsedResult: { limit: 15, category: 'waiting' },
			},
			{
				name: 'category authored',
				request: { category: 'authored' },
				parsedResult: { limit: 15, category: 'authored' },
			},
			{
				name: 'category alongside state, limit and cursor',
				request: { category: 'authored', state: 'closed', limit: '30', cursor: 'abc' },
				parsedResult: { category: 'authored', state: 'closed', limit: 30, cursor: 'abc' },
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = ListWorkflowReviewInboxQueryDto.safeParse(request);
			expect(result.success).toBe(true);
			expect(result.data).toMatchObject(parsedResult);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'unknown category', request: { category: 'mine' } },
			{ name: 'empty category', request: { category: '' } },
			{ name: 'boolean-ish category', request: { category: 'true' } },
			{ name: 'category as an array', request: { category: ['waiting'] } },
		])('should fail validation for $name', ({ request }) => {
			const result = ListWorkflowReviewInboxQueryDto.safeParse(request);
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['category']);
		});
	});
});

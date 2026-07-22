import { ListWorkflowReviewRequestsQueryDto } from '../list-workflow-review-requests-query.dto';

const DEFAULT_PAGINATION = { skip: 0, take: 10 };

describe('ListWorkflowReviewRequestsQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'workflowId only',
				request: { workflowId: 'workflow-1' },
				parsedResult: { ...DEFAULT_PAGINATION, workflowId: 'workflow-1' },
			},
			{
				name: 'state open',
				request: { workflowId: 'workflow-1', state: 'open' },
				parsedResult: { ...DEFAULT_PAGINATION, workflowId: 'workflow-1', state: 'open' },
			},
			{
				name: 'state closed',
				request: { workflowId: 'workflow-1', state: 'closed' },
				parsedResult: { ...DEFAULT_PAGINATION, workflowId: 'workflow-1', state: 'closed' },
			},
			{
				name: 'skip and take coerced from strings',
				request: { workflowId: 'workflow-1', skip: '5', take: '1' },
				parsedResult: { workflowId: 'workflow-1', skip: 5, take: 1 },
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = ListWorkflowReviewRequestsQueryDto.safeParse(request);
			expect(result.success).toBe(true);
			if (parsedResult) {
				expect(result.data).toMatchObject(parsedResult);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing workflowId',
				request: {},
				expectedErrorPath: ['workflowId'],
			},
			{
				name: 'empty workflowId',
				request: { workflowId: '' },
				expectedErrorPath: ['workflowId'],
			},
			{
				name: 'invalid state',
				request: { workflowId: 'workflow-1', state: 'archived' },
				expectedErrorPath: ['state'],
			},
			{
				name: 'non-integer take',
				request: { workflowId: 'workflow-1', take: 'not-a-number' },
				expectedErrorPath: ['take'],
			},
			{
				name: 'negative skip',
				request: { workflowId: 'workflow-1', skip: '-1' },
				expectedErrorPath: ['skip'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = ListWorkflowReviewRequestsQueryDto.safeParse(request);
			expect(result.success).toBe(false);
			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

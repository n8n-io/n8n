import { UpdateWorkflowReviewRequestVersionDto } from '../update-workflow-review-request-version.dto';

describe('UpdateWorkflowReviewRequestVersionDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'workflowId and workflowVersionId',
				request: { workflowId: 'workflow-1', workflowVersionId: 'version-1' },
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateWorkflowReviewRequestVersionDto.safeParse(request);
			expect(result.success).toBe(true);
			expect(result.data).toMatchObject(request);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing workflowId',
				request: { workflowVersionId: 'version-1' },
				expectedErrorPath: ['workflowId'],
			},
			{
				name: 'empty workflowId',
				request: { workflowId: '', workflowVersionId: 'version-1' },
				expectedErrorPath: ['workflowId'],
			},
			{
				name: 'missing workflowVersionId',
				request: { workflowId: 'workflow-1' },
				expectedErrorPath: ['workflowVersionId'],
			},
			{
				name: 'empty workflowVersionId',
				request: { workflowId: 'workflow-1', workflowVersionId: '' },
				expectedErrorPath: ['workflowVersionId'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateWorkflowReviewRequestVersionDto.safeParse(request);
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
		});
	});
});

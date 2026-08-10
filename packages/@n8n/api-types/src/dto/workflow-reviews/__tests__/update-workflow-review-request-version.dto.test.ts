import { UpdateWorkflowReviewRequestVersionDto } from '../update-workflow-review-request-version.dto';

describe('UpdateWorkflowReviewRequestVersionDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'workflowId, workflowVersionId and workflowVersionName',
				request: {
					workflowId: 'workflow-1',
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
				},
			},
			{
				name: 'an optional workflowVersionDescription',
				request: {
					workflowId: 'workflow-1',
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
					workflowVersionDescription: 'What changed in this version',
				},
			},
			{
				name: 'an empty workflowVersionDescription',
				request: {
					workflowId: 'workflow-1',
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
					workflowVersionDescription: '',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateWorkflowReviewRequestVersionDto.safeParse(request);
			expect(result.success).toBe(true);
			expect(result.data).toMatchObject(request);
		});

		test('should trim the workflowVersionName', () => {
			const result = UpdateWorkflowReviewRequestVersionDto.safeParse({
				workflowId: 'workflow-1',
				workflowVersionId: 'version-1',
				workflowVersionName: '  Release candidate  ',
			});

			expect(result.success).toBe(true);
			expect(result.data?.workflowVersionName).toBe('Release candidate');
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
			{
				name: 'a workflowVersionName longer than 128 characters',
				request: {
					workflowId: 'workflow-1',
					workflowVersionId: 'version-1',
					workflowVersionName: 'a'.repeat(129),
				},
				expectedErrorPath: ['workflowVersionName'],
			},
			{
				name: 'a missing workflowVersionName',
				request: { workflowId: 'workflow-1', workflowVersionId: 'version-1' },
				expectedErrorPath: ['workflowVersionName'],
			},
			{
				name: 'an empty workflowVersionName',
				request: {
					workflowId: 'workflow-1',
					workflowVersionId: 'version-1',
					workflowVersionName: '',
				},
				expectedErrorPath: ['workflowVersionName'],
			},
			{
				name: 'a whitespace-only workflowVersionName',
				request: {
					workflowId: 'workflow-1',
					workflowVersionId: 'version-1',
					workflowVersionName: '   ',
				},
				expectedErrorPath: ['workflowVersionName'],
			},
			{
				name: 'a workflowVersionDescription longer than 2048 characters',
				request: {
					workflowId: 'workflow-1',
					workflowVersionId: 'version-1',
					workflowVersionName: 'Release candidate',
					workflowVersionDescription: 'a'.repeat(2049),
				},
				expectedErrorPath: ['workflowVersionDescription'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateWorkflowReviewRequestVersionDto.safeParse(request);
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
		});
	});
});

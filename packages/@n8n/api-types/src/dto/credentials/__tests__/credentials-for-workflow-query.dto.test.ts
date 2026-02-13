import { CredentialsForWorkflowQueryDto } from '../credentials-for-workflow-query.dto';

describe('CredentialsForWorkflowQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with workflowId',
				request: {
					workflowId: 'workflow-123',
				},
			},
			{
				name: 'with projectId',
				request: {
					projectId: 'project-123',
				},
			},
			{
				name: 'with both workflowId and projectId',
				request: {
					workflowId: 'workflow-123',
					projectId: 'project-123',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = CredentialsForWorkflowQueryDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing both workflowId and projectId',
				request: {},
			},
			{
				name: 'empty object with undefined values',
				request: {
					workflowId: undefined,
					projectId: undefined,
				},
			},
		])('should fail validation for $name', ({ request }) => {
			const result = CredentialsForWorkflowQueryDto.safeParse(request);
			expect(result.success).toBe(false);
		});

		test('should fail validation when workflowId is not a string', () => {
			const result = CredentialsForWorkflowQueryDto.safeParse({
				workflowId: 123,
			});
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['workflowId']);
		});

		test('should fail validation when projectId is not a string', () => {
			const result = CredentialsForWorkflowQueryDto.safeParse({
				projectId: 123,
			});
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['projectId']);
		});
	});
});

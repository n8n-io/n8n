import { CreateWorkflowReviewRequestDto } from '../create-workflow-review-request.dto';

describe('CreateWorkflowReviewRequestDto', () => {
	const workflow = { workflowId: 'workflow-1', workflowVersionId: 'version-1' };

	test('should accept a version name on the pinned workflow', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			title: 'Please review',
			workflows: [{ ...workflow, workflowVersionName: 'Release candidate' }],
		});

		expect(result.success).toBe(true);
		expect(result.data?.workflows[0].workflowVersionName).toBe('Release candidate');
	});

	test('should reject a version name longer than 128 characters', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			title: 'Please review',
			workflows: [{ ...workflow, workflowVersionName: 'a'.repeat(129) }],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['workflows', 0, 'workflowVersionName']);
	});

	test('should trim the version name', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			title: 'Please review',
			workflows: [{ ...workflow, workflowVersionName: '  Release candidate  ' }],
		});

		expect(result.success).toBe(true);
		expect(result.data?.workflows[0].workflowVersionName).toBe('Release candidate');
	});

	test.each([
		{ name: 'a missing version name', workflowVersionName: undefined },
		{ name: 'an empty version name', workflowVersionName: '' },
		{ name: 'a whitespace-only version name', workflowVersionName: '   ' },
	])('should reject $name', ({ workflowVersionName }) => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			title: 'Please review',
			workflows: [{ ...workflow, workflowVersionName }],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['workflows', 0, 'workflowVersionName']);
	});

	test.each([
		{ name: 'a version description', workflowVersionDescription: 'What changed' },
		{ name: 'an empty version description', workflowVersionDescription: '' },
		{ name: 'an omitted version description', workflowVersionDescription: undefined },
	])('should accept $name on the pinned workflow', ({ workflowVersionDescription }) => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			title: 'Please review',
			workflows: [
				{ ...workflow, workflowVersionName: 'Release candidate', workflowVersionDescription },
			],
		});

		expect(result.success).toBe(true);
		expect(result.data?.workflows[0].workflowVersionDescription).toBe(workflowVersionDescription);
	});

	test('should reject a version description longer than 2048 characters', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			title: 'Please review',
			workflows: [
				{
					...workflow,
					workflowVersionName: 'Release candidate',
					workflowVersionDescription: 'a'.repeat(2049),
				},
			],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['workflows', 0, 'workflowVersionDescription']);
	});
});

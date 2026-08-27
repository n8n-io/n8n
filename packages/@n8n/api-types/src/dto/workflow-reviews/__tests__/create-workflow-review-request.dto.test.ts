import { CreateWorkflowReviewRequestDto } from '../create-workflow-review-request.dto';

describe('CreateWorkflowReviewRequestDto', () => {
	const workflow = { workflowId: 'workflow-1', workflowVersionId: 'version-1' };
	const base = { title: 'Please review', reviewerUserIds: ['reviewer-1'] };
	const pinnedWorkflow = [{ ...workflow, workflowVersionName: 'Release candidate' }];

	test('should accept a version name on the pinned workflow', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			workflows: [{ ...workflow, workflowVersionName: 'Release candidate' }],
		});

		expect(result.success).toBe(true);
		expect(result.data?.workflows[0].workflowVersionName).toBe('Release candidate');
	});

	test('should reject a version name longer than 128 characters', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			workflows: [{ ...workflow, workflowVersionName: 'a'.repeat(129) }],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['workflows', 0, 'workflowVersionName']);
	});

	test('should trim the version name', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
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
			...base,
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
			...base,
			workflows: [
				{ ...workflow, workflowVersionName: 'Release candidate', workflowVersionDescription },
			],
		});

		expect(result.success).toBe(true);
		expect(result.data?.workflows[0].workflowVersionDescription).toBe(workflowVersionDescription);
	});

	test('should trim the review description', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			description: '  Please take a look  ',
			workflows: pinnedWorkflow,
		});

		expect(result.success).toBe(true);
		expect(result.data?.description).toBe('Please take a look');
	});

	test.each([
		{ name: 'an empty', description: '' },
		{ name: 'a whitespace-only', description: '   ' },
	])('should reduce $name review description to an empty string', ({ description }) => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			description,
			workflows: pinnedWorkflow,
		});

		expect(result.success).toBe(true);
		expect(result.data?.description).toBe('');
	});

	test('should reject a review description longer than 512 characters', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			description: 'a'.repeat(513),
			workflows: pinnedWorkflow,
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['description']);
	});

	test('should reject a version description longer than 2048 characters', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
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

	describe('reviewerUserIds', () => {
		test.each([
			{ name: 'a single reviewer', reviewerUserIds: ['reviewer-1'] },
			{
				name: 'ten reviewers',
				reviewerUserIds: Array.from({ length: 10 }, (_, i) => `reviewer-${i}`),
			},
		])('should accept $name', ({ reviewerUserIds }) => {
			const result = CreateWorkflowReviewRequestDto.safeParse({
				title: 'Please review',
				reviewerUserIds,
				workflows: pinnedWorkflow,
			});

			expect(result.success).toBe(true);
			expect(result.data?.reviewerUserIds).toEqual(reviewerUserIds);
		});

		test.each([
			{ name: 'an omitted reviewer list', reviewerUserIds: undefined },
			{ name: 'an empty reviewer list', reviewerUserIds: [] },
			{
				name: 'more than ten reviewers',
				reviewerUserIds: Array.from({ length: 11 }, (_, i) => `reviewer-${i}`),
			},
			{ name: 'a non-array reviewer value', reviewerUserIds: 'reviewer-1' },
		])('should reject $name', ({ reviewerUserIds }) => {
			const result = CreateWorkflowReviewRequestDto.safeParse({
				title: 'Please review',
				reviewerUserIds,
				workflows: pinnedWorkflow,
			});

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['reviewerUserIds']);
		});
	});
});

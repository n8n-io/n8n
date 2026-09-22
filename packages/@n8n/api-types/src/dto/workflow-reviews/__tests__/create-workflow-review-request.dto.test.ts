import { CreateWorkflowReviewRequestDto } from '../create-workflow-review-request.dto';

describe('CreateWorkflowReviewRequestDto', () => {
	const workflow = { workflowId: 'workflow-1', workflowVersionId: 'version-1' };
	const base = { title: 'Please review', reviewerUserIds: ['reviewer-1'] };
	const pinnedWorkflow = [{ ...workflow, workflowVersionName: 'Release candidate' }];

	test('accepts a version name on the pinned workflow', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			workflows: [{ ...workflow, workflowVersionName: 'Release candidate' }],
		});

		expect(result.success).toBe(true);
		expect(result.data?.workflows[0].workflowVersionName).toBe('Release candidate');
	});

	test('rejects a version name longer than 128 characters', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			workflows: [{ ...workflow, workflowVersionName: 'a'.repeat(129) }],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['workflows', 0, 'workflowVersionName']);
	});

	test('trims the version name', () => {
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
	])('rejects $name', ({ workflowVersionName }) => {
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

	test('trims the review description', () => {
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
	])('reduces $name review description to an empty string', ({ description }) => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			description,
			workflows: pinnedWorkflow,
		});

		expect(result.success).toBe(true);
		expect(result.data?.description).toBe('');
	});

	test('rejects a review description longer than 512 characters', () => {
		const result = CreateWorkflowReviewRequestDto.safeParse({
			...base,
			description: 'a'.repeat(513),
			workflows: pinnedWorkflow,
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['description']);
	});

	test('rejects a version description longer than 2048 characters', () => {
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

	// The title and the single-workflow shape are enforced here rather than over
	// HTTP, so the review suites do not re-test the schema through the whole stack.
	describe('title', () => {
		test('trims it', () => {
			const result = CreateWorkflowReviewRequestDto.safeParse({
				...base,
				title: '  Please review  ',
				workflows: pinnedWorkflow,
			});

			expect(result.success).toBe(true);
			expect(result.data?.title).toBe('Please review');
		});

		test.each([
			{ name: 'a missing title', title: undefined },
			{ name: 'an empty title', title: '' },
			{ name: 'a whitespace-only title', title: '   ' },
			{ name: 'a title longer than 128 characters', title: 'a'.repeat(129) },
		])('rejects $name', ({ title }) => {
			const result = CreateWorkflowReviewRequestDto.safeParse({
				reviewerUserIds: ['reviewer-1'],
				title,
				workflows: pinnedWorkflow,
			});

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['title']);
		});
	});

	// A review covers exactly one workflow today; the array is there for LIGO-601.
	describe('workflows', () => {
		test.each([
			{ name: 'no workflow', workflows: [] },
			{ name: 'more than one workflow', workflows: [...pinnedWorkflow, ...pinnedWorkflow] },
			{ name: 'a missing workflows array', workflows: undefined },
		])('rejects $name', ({ workflows }) => {
			const result = CreateWorkflowReviewRequestDto.safeParse({ ...base, workflows });

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['workflows']);
		});
	});

	describe('reviewerUserIds', () => {
		test.each([
			{ name: 'a single reviewer', reviewerUserIds: ['reviewer-1'] },
			{
				name: 'ten reviewers',
				reviewerUserIds: Array.from({ length: 10 }, (_, i) => `reviewer-${i}`),
			},
		])('accepts $name', ({ reviewerUserIds }) => {
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
		])('rejects $name', ({ reviewerUserIds }) => {
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

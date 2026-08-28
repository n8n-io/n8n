import { GetWorkflowQueryDto } from '../get-workflow-query.dto';

describe('GetWorkflowQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{ name: 'with "true"', request: { excludePinnedData: 'true' }, expected: true },
			{ name: 'with "false"', request: { excludePinnedData: 'false' }, expected: false },
			{ name: 'with no value', request: {}, expected: false },
		])('should pass validation for excludePinnedData $name', ({ request, expected }) => {
			const result = GetWorkflowQueryDto.safeParse(request);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.excludePinnedData).toBe(expected);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'with number', request: { excludePinnedData: 1 } },
			{ name: 'with boolean (true)', request: { excludePinnedData: true } },
			{ name: 'with boolean (false)', request: { excludePinnedData: false } },
			{ name: 'with invalid string', request: { excludePinnedData: 'invalid' } },
		])('should fail validation for excludePinnedData $name', ({ request }) => {
			const result = GetWorkflowQueryDto.safeParse(request);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['excludePinnedData']);
			}
		});
	});
});

import { UpdateProjectExecutionQuotaDto } from '../update-project-execution-quota.dto';

describe('UpdateProjectExecutionQuotaDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'a positive integer limit',
				request: { limit: 100, periodUnit: 'day' },
			},
			{
				name: 'the unlimited sentinel (-1)',
				request: { limit: -1, periodUnit: 'month' },
			},
			{
				name: 'the smallest positive limit (1)',
				request: { limit: 1, periodUnit: 'week' },
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateProjectExecutionQuotaDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'a limit of 0 (would block every execution with no explanation)',
				request: { limit: 0, periodUnit: 'day' },
				expectedErrorPath: ['limit'],
			},
			{
				name: 'a negative limit other than the -1 sentinel',
				request: { limit: -5, periodUnit: 'day' },
				expectedErrorPath: ['limit'],
			},
			{
				name: 'a non-integer limit',
				request: { limit: 10.5, periodUnit: 'day' },
				expectedErrorPath: ['limit'],
			},
			{
				name: 'an invalid periodUnit',
				request: { limit: 10, periodUnit: 'year' },
				expectedErrorPath: ['periodUnit'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateProjectExecutionQuotaDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

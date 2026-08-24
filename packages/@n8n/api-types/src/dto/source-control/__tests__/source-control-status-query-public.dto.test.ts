import { SourceControlStatusQueryPublicDto } from '../source-control-status-query-public.dto';

describe('SourceControlStatusQueryPublicDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'direction only',
				request: { direction: 'push' },
			},
			{
				name: 'direction pull',
				request: { direction: 'pull' },
			},
			{
				name: 'with limit and cursor',
				request: { direction: 'push', limit: '50', cursor: 'abc123' },
			},
			{
				name: 'limit above max is clamped, not rejected',
				request: { direction: 'push', limit: '1000' },
			},
		])('should validate $name', ({ request }) => {
			const result = SourceControlStatusQueryPublicDto.safeParse(request);
			expect(result.success).toBe(true);
		});

		test('limit above max is clamped to 250', () => {
			const result = SourceControlStatusQueryPublicDto.safeParse({
				direction: 'push',
				limit: '1000',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(250);
			}
		});

		test('limit defaults to 100 when omitted', () => {
			const result = SourceControlStatusQueryPublicDto.safeParse({ direction: 'push' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(100);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing direction',
				request: {},
				expectedErrorPath: ['direction'],
			},
			{
				name: 'invalid direction',
				request: { direction: 'sideways' },
				expectedErrorPath: ['direction'],
			},
			{
				name: 'non-numeric limit',
				request: { direction: 'push', limit: 'not-a-number' },
				expectedErrorPath: ['limit'],
			},
			{
				name: 'negative limit',
				request: { direction: 'push', limit: '-5' },
				expectedErrorPath: ['limit'],
			},
		])('should reject $name', ({ request, expectedErrorPath }) => {
			const result = SourceControlStatusQueryPublicDto.safeParse(request);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});

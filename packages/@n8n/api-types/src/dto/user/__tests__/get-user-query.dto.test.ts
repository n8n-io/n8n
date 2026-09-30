import { GetUserQueryDto } from '../get-user-query.dto';

describe('GetUserQueryDto', () => {
	test('defaults includeRole to false', () => {
		const result = GetUserQueryDto.safeParse({});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.includeRole).toBe(false);
		}
	});

	test('parses includeRole from the query string', () => {
		const result = GetUserQueryDto.safeParse({ includeRole: 'true' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.includeRole).toBe(true);
		}
	});
});

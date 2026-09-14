import { ListUsersQueryDto } from '../list-users-query.dto';

describe('ListUsersQueryDto', () => {
	test('accepts an empty query and applies defaults', () => {
		const result = ListUsersQueryDto.safeParse({});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(100);
			expect(result.data.includeRole).toBe(false);
			expect(result.data.cursor).toBeUndefined();
			expect(result.data.projectId).toBeUndefined();
		}
	});

	test('parses includeRole and projectId from the query string', () => {
		const result = ListUsersQueryDto.safeParse({ includeRole: 'true', projectId: 'project-1' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.includeRole).toBe(true);
			expect(result.data.projectId).toBe('project-1');
		}
	});

	test('never exposes an offset field', () => {
		expect('offset' in ListUsersQueryDto.schema.shape).toBe(false);
	});
});

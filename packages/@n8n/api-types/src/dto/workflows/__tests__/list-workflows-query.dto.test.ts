import { ListWorkflowsQueryDto } from '../list-workflows-query.dto';

describe('ListWorkflowsQueryDto', () => {
	test('accepts an empty query and applies defaults', () => {
		const result = ListWorkflowsQueryDto.safeParse({});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.offset).toBe(0);
			expect(result.data.limit).toBe(100);
			expect(result.data.excludePinnedData).toBe(false);
		}
	});

	test('parses `active` and `excludePinnedData` from string booleans', () => {
		const result = ListWorkflowsQueryDto.safeParse({
			active: 'true',
			excludePinnedData: 'true',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.active).toBe(true);
			expect(result.data.excludePinnedData).toBe(true);
		}
	});

	test('accepts tags, name, projectId, and cursor as plain strings', () => {
		const result = ListWorkflowsQueryDto.safeParse({
			tags: 'a,b',
			name: 'My workflow',
			projectId: 'project-1',
			cursor: 'abc123',
		});

		expect(result.success).toBe(true);
	});

	test('rejects an invalid boolean value for `active`', () => {
		const result = ListWorkflowsQueryDto.safeParse({ active: 'maybe' });

		expect(result.success).toBe(false);
	});
});

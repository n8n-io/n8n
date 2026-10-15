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
});

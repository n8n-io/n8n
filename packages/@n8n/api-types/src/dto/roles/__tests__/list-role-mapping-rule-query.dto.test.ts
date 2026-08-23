import { ListRoleMappingRuleQueryDto } from '../list-role-mapping-rule-query.dto';

const DEFAULT_PAGINATION = { skip: 0, take: 10 };

describe('ListRoleMappingRuleQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'empty object',
				request: {},
				parsedResult: DEFAULT_PAGINATION,
			},
			{
				name: 'type filter',
				request: { type: 'instance' },
				parsedResult: { ...DEFAULT_PAGINATION, type: 'instance' },
			},
			{
				name: 'sortBy order:desc',
				request: { sortBy: 'order:desc' },
				parsedResult: { ...DEFAULT_PAGINATION, sortBy: 'order:desc' },
			},
			{
				name: 'skip and take',
				request: { skip: '5', take: '20' },
				parsedResult: { skip: 5, take: 20 },
			},
		])('$name', ({ request, parsedResult }) => {
			expect(ListRoleMappingRuleQueryDto.safeParse(request).data).toEqual(parsedResult);
		});
	});

	describe('Invalid requests', () => {
		it('rejects invalid sortBy', () => {
			const result = ListRoleMappingRuleQueryDto.safeParse({ sortBy: 'expression:asc' });
			expect(result.success).toBe(false);
		});

		it('rejects invalid type', () => {
			const result = ListRoleMappingRuleQueryDto.safeParse({ type: 'team' });
			expect(result.success).toBe(false);
		});
	});
});

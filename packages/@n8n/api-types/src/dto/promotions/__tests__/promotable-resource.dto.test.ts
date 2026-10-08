import { PromotionChangesDto, PromotionChangesQueryDto } from '../promotable-resource.dto';

describe('PromotionChangesQueryDto', () => {
	it('defaults the sort and the order', () => {
		expect(PromotionChangesQueryDto.parse({})).toEqual({ sort: 'name', order: 'asc' });
		expect(PromotionChangesQueryDto.safeParse({ order: 'sideways' }).success).toBe(false);
	});
});

describe('PromotionChangesDto', () => {
	it('carries the commit the rows were read from, or null before the first commit', () => {
		expect(PromotionChangesDto.safeParse({ commitSha: 'a'.repeat(40), changes: [] }).success).toBe(
			true,
		);
		expect(PromotionChangesDto.safeParse({ commitSha: null, changes: [] }).success).toBe(true);
		expect(PromotionChangesDto.safeParse({ changes: [] }).success).toBe(false);
	});
});

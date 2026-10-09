import { PromotionChangesDto, PromotionChangesQueryDto } from '../promotable-resource.dto';

describe('PromotionChangesQueryDto', () => {
	it('defaults the sort and the order', () => {
		expect(PromotionChangesQueryDto.parse({})).toEqual({ sort: 'name', order: 'asc' });
		expect(PromotionChangesQueryDto.safeParse({ order: 'sideways' }).success).toBe(false);
	});
});

describe('PromotionChangesDto', () => {
	const source = { configId: 'config-1', branchName: 'main' };

	it('carries the commit the rows were read from, or null before the first commit', () => {
		expect(
			PromotionChangesDto.safeParse({ commitSha: 'a'.repeat(40), source, changes: [] }).success,
		).toBe(true);
		expect(PromotionChangesDto.safeParse({ commitSha: null, source, changes: [] }).success).toBe(
			true,
		);
		expect(PromotionChangesDto.safeParse({ source, changes: [] }).success).toBe(false);
	});

	it('requires the source the rows were read from', () => {
		expect(PromotionChangesDto.safeParse({ commitSha: null, changes: [] }).success).toBe(false);
	});
});

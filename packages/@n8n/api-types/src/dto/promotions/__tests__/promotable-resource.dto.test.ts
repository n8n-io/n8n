import { PromotionChangesDto, PromotionChangesQueryDto } from '../promotable-resource.dto';

describe('PromotionChangesQueryDto', () => {
	it('defaults to the promote direction, so callers that predate the parameter keep working', () => {
		expect(PromotionChangesQueryDto.parse({})).toEqual({
			direction: 'promote',
			sort: 'name',
			order: 'asc',
		});
	});

	it('accepts the apply direction and rejects an unknown one', () => {
		expect(PromotionChangesQueryDto.parse({ direction: 'apply' }).direction).toBe('apply');
		expect(PromotionChangesQueryDto.safeParse({ direction: 'sideways' }).success).toBe(false);
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

import { ListPromotionRepositoriesQueryDto } from '../promotion-repository.dto';

describe('ListPromotionRepositoriesQueryDto', () => {
	it('caps the page size at what Git host APIs return', () => {
		const result = ListPromotionRepositoriesQueryDto.safeParse({ limit: '500' });

		if (!result.success) throw result.error;
		expect(result.data.limit).toBe(100);
	});

	it('rejects an empty page', () => {
		expect(ListPromotionRepositoriesQueryDto.safeParse({ limit: '0' }).success).toBe(false);
	});

	it('trims the search text', () => {
		const result = ListPromotionRepositoriesQueryDto.safeParse({ search: '  api  ' });

		if (!result.success) throw result.error;
		expect(result.data.search).toBe('api');
	});
});

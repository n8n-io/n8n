import { bannerNameSchema } from '../../../schemas/banner-name.schema';
import { DismissBannerRequestDto } from '../dismiss-banner-request.dto';

describe('DismissBannerRequestDto', () => {
	describe('Valid requests', () => {
		test.each(
			bannerNameSchema.options.map((banner) => ({
				name: `valid banner: ${banner}`,
				request: { banner },
			})),
		)('should validate $name', ({ request }) => {
			const result = DismissBannerRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid banner string',
				request: {
					banner: 'not-a-valid-banner',
				},
				expectedErrorPath: ['banner'],
			},
			{
				name: 'non-string banner',
				request: {
					banner: 123,
				},
				expectedErrorPath: ['banner'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = DismissBannerRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});

	describe('Optional banner', () => {
		test('should validate empty request', () => {
			const result = DismissBannerRequestDto.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe('Exhaustive banner name check', () => {
		test('should have all banner names defined', () => {
			const expectedBanners = [
				'V1',
				'TRIAL_OVER',
				'TRIAL',
				'NON_PRODUCTION_LICENSE',
				'EMAIL_CONFIRMATION',
			];

			expect(bannerNameSchema.options).toEqual(expectedBanners);
		});
	});
});

import {
	staticBannerNameSchema,
	dynamicBannerNameSchema,
} from '../../../schemas/banner-name.schema';
import { DismissBannerRequestDto } from '../dismiss-banner-request.dto';

describe('DismissBannerRequestDto', () => {
	describe('Valid requests', () => {
		const staticBanners = staticBannerNameSchema.options.map((banner) => ({
			name: `valid static banner: ${banner}`,
			request: { banner },
		}));
		const dynamicBanners = [
			{
				name: 'valid dynamic banner: dynamic-banner-1',
				request: { banner: 'dynamic-banner-1' },
			},
			{
				name: 'valid dynamic banner: dynamic-banner-123',
				request: { banner: 'dynamic-banner-123' },
			},
		];

		test.each([...staticBanners, ...dynamicBanners])('should validate $name', ({ request }) => {
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
			{
				name: 'invalid dynamic banner - missing number',
				request: {
					banner: 'dynamic-banner-',
				},
				expectedErrorPath: ['banner'],
			},
			{
				name: 'invalid dynamic banner - non-numeric',
				request: {
					banner: 'dynamic-banner-abc',
				},
				expectedErrorPath: ['banner'],
			},
			{
				name: 'invalid dynamic banner - no suffix',
				request: {
					banner: 'dynamic-banner',
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
		test('should have all static banner names defined', () => {
			const expectedBanners = [
				'V1',
				'TRIAL_OVER',
				'TRIAL',
				'NON_PRODUCTION_LICENSE',
				'EMAIL_CONFIRMATION',
				'DATA_TABLE_STORAGE_LIMIT_WARNING',
				'DATA_TABLE_STORAGE_LIMIT_ERROR',
			];

			expect(staticBannerNameSchema.options).toEqual(expectedBanners);
		});

		test('should accept dynamic banner names with correct format', () => {
			const validDynamicBanners = ['dynamic-banner-1', 'dynamic-banner-123', 'dynamic-banner-999'];
			const invalidDynamicBanners = ['dynamic-banner-', 'dynamic-banner-abc', 'dynamic-banner'];

			validDynamicBanners.forEach((banner) => {
				const result = dynamicBannerNameSchema.safeParse(banner);
				expect(result.success).toBe(true);
			});

			invalidDynamicBanners.forEach((banner) => {
				const result = dynamicBannerNameSchema.safeParse(banner);
				expect(result.success).toBe(false);
			});
		});
	});
});

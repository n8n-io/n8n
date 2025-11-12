import { z } from 'zod';

export const staticBannerNameSchema = z.enum([
	'V1',
	'TRIAL_OVER',
	'TRIAL',
	'NON_PRODUCTION_LICENSE',
	'EMAIL_CONFIRMATION',
	'DATA_TABLE_STORAGE_LIMIT_WARNING',
	'DATA_TABLE_STORAGE_LIMIT_ERROR',
	'WORKFLOW_AUTO_DEACTIVATED',
]);
export const dynamicBannerNameSchema = z.string().regex(/^dynamic-banner-\d+$/);
export const bannerNameSchema = z.union([staticBannerNameSchema, dynamicBannerNameSchema]);

export type BannerName = z.infer<typeof bannerNameSchema>;

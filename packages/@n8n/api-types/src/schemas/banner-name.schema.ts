import { z } from 'zod';

export const bannerNameSchema = z.enum([
	'V1',
	'TRIAL_OVER',
	'TRIAL',
	'NON_PRODUCTION_LICENSE',
	'EMAIL_CONFIRMATION',
]);

export type BannerName = z.infer<typeof bannerNameSchema>;

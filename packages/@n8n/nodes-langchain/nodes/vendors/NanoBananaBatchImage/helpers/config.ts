/**
 * NanoBanana Batch Image - API Configuration
 * Internal project - Wuyinke API Keys hardcoded (reused from Sora2BatchVideo)
 */

import { SORA2_CONFIG } from '../../Sora2BatchVideo/helpers/config';

export const NANOBANANA_CONFIG = {
	/** wuyinkeji.com configuration (reused from Sora2BatchVideo) */
	wuyinke: {
		apiKey: SORA2_CONFIG.wuyinke.apiKey,
		secretKey: SORA2_CONFIG.wuyinke.secretKey,
		baseUrl: 'https://api.wuyinkeji.com',
	},
} as const;

export type NanoBananaConfig = typeof NANOBANANA_CONFIG;

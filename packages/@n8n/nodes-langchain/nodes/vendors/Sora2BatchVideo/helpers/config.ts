/**
 * Sora2 Batch Video - API Configuration
 * Internal project - API Keys hardcoded
 */

export const SORA2_CONFIG = {
	/** ttapi.io configuration */
	ttapi: {
		apiKey: 'eea42939-40b5-9c6d-adcb-1524fcf5e07e',
		baseUrl: 'https://api.ttapi.io',
	},

	/** wuyinkeji.com configuration */
	wuyinke: {
		apiKey: 'jnWcl649Q6cDPcYMyXmqBzqEsH',
		secretKey: '92092fea234e510b8cb7108c0aa4b974',
		baseUrl: 'https://api.wuyinkeji.com',
	},
} as const;

export type Sora2Config = typeof SORA2_CONFIG;

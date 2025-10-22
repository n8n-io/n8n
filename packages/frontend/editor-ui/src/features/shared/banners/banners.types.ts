import type { Component } from 'vue';
import type { BannerName } from '@n8n/api-types';

export type N8nBanners = {
	[key in BannerName]: {
		priority: number;
		component: Component;
	};
};

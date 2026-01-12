import type { Component } from 'vue';
import type { BannerName } from '@n8n/api-types';
import type { CalloutTheme } from '@n8n/design-system';

export type N8nBanners = {
	[key in BannerName]: {
		priority: number;
		component: Component;
		content?: string;
		theme?: CalloutTheme;
		isDismissible?: boolean;
		dismissPermanently?: boolean;
	};
};

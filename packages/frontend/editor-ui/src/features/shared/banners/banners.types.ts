import type { Component } from 'vue';
import type { BannerName } from '@n8n/api-types';
import type { CalloutVariant } from '@n8n/design-system';

export type N8nBanners = {
	[key in BannerName]: {
		priority: number;
		component: Component;
		content?: string;
		theme?: CalloutVariant;
		isDismissible?: boolean;
		dismissPermanently?: boolean;
	};
};

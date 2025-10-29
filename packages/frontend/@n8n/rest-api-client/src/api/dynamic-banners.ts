import type { BannerName } from '@n8n/api-types';

import { get } from '../utils';

export type DynamicBanner = {
	id: BannerName;
	content: string;
	isDismissible: boolean;
	dismissPermanently: boolean | null;
	theme: 'info' | 'warning' | 'danger';
	priority: number;
};

export async function getDynamicBanners(
	endpoint: string,
	version: string,
	deploymentType: string,
): Promise<DynamicBanner[]> {
	return await get(endpoint, '', { version, deploymentType });
}

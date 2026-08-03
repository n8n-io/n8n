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

type DynamicBannerFilters = {
	version: string;
	deploymentType: string;
	planName?: string;
	instanceId: string;
	userId?: string;
	userCreatedAt?: string;
	isOwner?: boolean;
	role?: string;
	publishedWorkflowCount?: number;
};

export async function getDynamicBanners(
	endpoint: string,
	filters: DynamicBannerFilters,
): Promise<DynamicBanner[]> {
	return await get(endpoint, '', filters);
}

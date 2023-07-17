import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { Banners } from 'n8n-workflow';

export async function dismissBannerPermanently(
	context: IRestApiContext,
	data: { bannerName: Banners; dismissedBanners: string[] },
): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/owner/dismiss-banner', { banner: data.bannerName });
}

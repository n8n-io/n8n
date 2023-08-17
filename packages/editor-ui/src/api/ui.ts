import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { BannerName } from 'n8n-workflow';

export async function dismissBannerPermanently(
	context: IRestApiContext,
	data: { bannerName: BannerName; dismissedBanners: string[] },
): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/owner/dismiss-banner', { banner: data.bannerName });
}

import type { IRestApiContext } from '@/Interface';
import type { BANNERS } from '@/constants';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function dismissBannerPermanently(
	context: IRestApiContext,
	data: { bannerName: BANNERS; dismissedBanners: string[] },
): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/owner/dismiss-banner', { banner: data.bannerName });
}

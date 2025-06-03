import type { BannerName } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function dismissBannerPermanently(
	context: IRestApiContext,
	data: { bannerName: BannerName; dismissedBanners: string[] },
): Promise<void> {
	return await makeRestApiRequest(context, 'POST', '/owner/dismiss-banner', {
		banner: data.bannerName,
	});
}

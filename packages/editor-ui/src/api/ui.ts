import type { IRestApiContext } from '@/Interface';
import type { BANNERS } from '@/constants';
import { useSettingsStore } from '@/stores';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function dismissBannerPermanently(
	context: IRestApiContext,
	data: { bannerName: BANNERS },
): Promise<void> {
	const updatedBanners = [...useSettingsStore().permanentlyDismissedBanners, data.bannerName];
	return makeRestApiRequest(context, 'POST', '/owner/dismiss-banners', { banners: updatedBanners });
}

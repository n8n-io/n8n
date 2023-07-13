import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function dismissV1BannerPermanently(context: IRestApiContext): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/owner/dismiss-v1');
}

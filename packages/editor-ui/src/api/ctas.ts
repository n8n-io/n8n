import type { IRestApiContext } from '@/Interface';
import { get } from '@/utils/apiUtils';

export async function getBecomeCreatorCta(context: IRestApiContext): Promise<boolean> {
	const response = await get(context.baseUrl, '/cta/become-creator');

	return response;
}

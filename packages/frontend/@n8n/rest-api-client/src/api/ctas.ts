import type { IRestApiContext } from '../types';
import { get } from '../utils';

export async function getBecomeCreatorCta(context: IRestApiContext): Promise<boolean> {
	const response = await get(context.baseUrl, '/cta/become-creator');

	return response;
}

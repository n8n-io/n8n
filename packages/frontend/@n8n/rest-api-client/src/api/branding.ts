import type { BrandingSettings, UpdateBrandingDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function updateBranding(
	context: IRestApiContext,
	data: UpdateBrandingDto,
): Promise<BrandingSettings> {
	return await makeRestApiRequest(context, 'PUT', '/branding', data);
}

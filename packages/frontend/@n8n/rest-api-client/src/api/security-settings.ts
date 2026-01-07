import type { SecuritySettingsDto, UpdateSecuritySettingsDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest, get } from '../utils';

export async function getSecuritySettings(context: IRestApiContext): Promise<SecuritySettingsDto> {
	return (await get(context.baseUrl, '/settings/security')).data;
}

export async function updateSecuritySettings(
	context: IRestApiContext,
	data: UpdateSecuritySettingsDto,
): Promise<SecuritySettingsDto> {
	return await makeRestApiRequest(context, 'POST', '/settings/security', data);
}

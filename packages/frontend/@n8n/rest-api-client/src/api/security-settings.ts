import type { SecuritySettingsDto, UpdateSecuritySettingsDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getSecuritySettings(context: IRestApiContext): Promise<SecuritySettingsDto> {
	return await makeRestApiRequest(context, 'GET', '/settings/security');
}

export async function updateSecuritySettings(
	context: IRestApiContext,
	data: UpdateSecuritySettingsDto,
): Promise<SecuritySettingsDto> {
	return await makeRestApiRequest(context, 'POST', '/settings/security', data);
}

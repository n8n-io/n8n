import type { PluginsSettingsDto, UpdatePluginsSettingsDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getPluginsSettings(context: IRestApiContext): Promise<PluginsSettingsDto> {
	return await makeRestApiRequest(context, 'GET', '/settings/plugins');
}

export async function updatePluginsSettings(
	context: IRestApiContext,
	data: UpdatePluginsSettingsDto,
): Promise<PluginsSettingsDto> {
	return await makeRestApiRequest(context, 'POST', '/settings/plugins', data);
}

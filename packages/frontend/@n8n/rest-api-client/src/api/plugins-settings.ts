import type { MergeDevIntegrationsResponseDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface PluginField {
	key: string;
	label: string;
	placeholder?: string;
	value: string;
}

export interface Plugin {
	id: string;
	credentialType: string;
	displayName: string;
	description: string;
	managedToggleField: string;
	enabled: boolean;
	fields: PluginField[];
}

export interface PluginsSettings {
	plugins: Plugin[];
}

export interface UpdatePluginSettingsPayload {
	id: string;
	enabled?: boolean;
	fields?: Record<string, string>;
}

export async function getPluginsSettings(context: IRestApiContext): Promise<PluginsSettings> {
	return await makeRestApiRequest(context, 'GET', '/settings/plugins');
}

export async function updatePluginSettings(
	context: IRestApiContext,
	data: UpdatePluginSettingsPayload,
): Promise<PluginsSettings> {
	return await makeRestApiRequest(context, 'POST', '/settings/plugins', data);
}

export async function getMergeDevIntegrations(
	context: IRestApiContext,
): Promise<MergeDevIntegrationsResponseDto> {
	return await makeRestApiRequest(context, 'GET', '/settings/plugins/merge-dev/integrations');
}

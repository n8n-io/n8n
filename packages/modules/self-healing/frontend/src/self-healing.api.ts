import type {
	SaveSelfHealingConfigurationDto,
	SelfHealingConfigurationDto,
	SelfHealingConfigurationOptions,
	UpdateSelfHealingConfigurationDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

const path = (projectId: string) => `/projects/${projectId}/self-healing-configurations`;

export const fetchConfigurations = async (
	context: IRestApiContext,
	projectId: string,
): Promise<SelfHealingConfigurationDto[]> =>
	await makeRestApiRequest(context, 'GET', path(projectId));

export const fetchConfigurationOptions = async (
	context: IRestApiContext,
	projectId: string,
): Promise<SelfHealingConfigurationOptions> =>
	await makeRestApiRequest(context, 'GET', `${path(projectId)}/options`);

export const saveConfiguration = async (
	context: IRestApiContext,
	projectId: string,
	input: SaveSelfHealingConfigurationDto | UpdateSelfHealingConfigurationDto,
	id?: number,
): Promise<SelfHealingConfigurationDto> => {
	if (id === undefined) {
		return await makeRestApiRequest(context, 'POST', path(projectId), input);
	}

	return await makeRestApiRequest(context, 'PATCH', `${path(projectId)}/${id}`, input);
};

export const setConfigurationEnabled = async (
	context: IRestApiContext,
	projectId: string,
	id: number,
	enabled: boolean,
): Promise<SelfHealingConfigurationDto> =>
	await makeRestApiRequest(context, 'PATCH', `${path(projectId)}/${id}/enabled`, { enabled });

export const removeConfiguration = async (
	context: IRestApiContext,
	projectId: string,
	id: number,
): Promise<void> => await makeRestApiRequest(context, 'DELETE', `${path(projectId)}/${id}`);

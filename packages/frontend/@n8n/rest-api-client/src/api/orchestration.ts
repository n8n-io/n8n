import type { ProjectPoolSettingsResponse, UpdateProjectPoolSettingsDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

const GET_STATUS_ENDPOINT = '/orchestration/worker/status';

export const sendGetWorkerStatus = async (context: IRestApiContext): Promise<void> => {
	await makeRestApiRequest(context, 'POST', GET_STATUS_ENDPOINT);
};

export const getProjectPoolSettings = async (
	context: IRestApiContext,
	projectId: string,
): Promise<ProjectPoolSettingsResponse> => {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/pool-settings`);
};

export const updateProjectPoolSettings = async (
	context: IRestApiContext,
	projectId: string,
	dto: UpdateProjectPoolSettingsDto,
): Promise<ProjectPoolSettingsResponse> => {
	return await makeRestApiRequest(context, 'PATCH', `/projects/${projectId}/pool-settings`, dto);
};

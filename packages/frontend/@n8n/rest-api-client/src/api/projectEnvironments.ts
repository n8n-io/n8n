import type { CreateEnvironmentDto, UpdateEnvironmentDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface ProjectEnvironment {
	id: string;
	projectId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

const base = (projectId: string) => `/projects/${projectId}/environments`;

export const getEnvironments = async (
	context: IRestApiContext,
	projectId: string,
): Promise<ProjectEnvironment[]> => {
	return await makeRestApiRequest(context, 'GET', base(projectId));
};

export const createEnvironment = async (
	context: IRestApiContext,
	projectId: string,
	data: CreateEnvironmentDto,
): Promise<ProjectEnvironment> => {
	return await makeRestApiRequest(context, 'POST', base(projectId), data);
};

export const updateEnvironment = async (
	context: IRestApiContext,
	projectId: string,
	envId: string,
	data: UpdateEnvironmentDto,
): Promise<ProjectEnvironment> => {
	return await makeRestApiRequest(context, 'PATCH', `${base(projectId)}/${envId}`, data);
};

export const deleteEnvironment = async (
	context: IRestApiContext,
	projectId: string,
	envId: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `${base(projectId)}/${envId}`);
};

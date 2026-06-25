import type {
	CreateEnvironmentDto,
	UpdateEnvironmentDto,
	UpsertCredentialBindingsDto,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface ProjectEnvironment {
	id: string;
	projectId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface EnvironmentCredentialBinding {
	id: number;
	workflowId: string;
	environmentId: string;
	nodeId: string;
	credentialType: string;
	targetCredentialId: string;
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

export const initializeEnvironments = async (
	context: IRestApiContext,
	projectId: string,
): Promise<ProjectEnvironment[]> => {
	return await makeRestApiRequest(context, 'POST', `${base(projectId)}/initialize`);
};

export const publishToEnvironment = async (
	context: IRestApiContext,
	workflowId: string,
	environmentId: string,
	versionId: string,
	name?: string,
	description?: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'POST', `/workflows/${workflowId}/activate`, {
		versionId,
		environmentId,
		name,
		description,
	});
};

export const getPublishedEnvVersions = async (
	context: IRestApiContext,
	workflowId: string,
): Promise<Record<string, string>> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`/workflows/${workflowId}/published-env-versions`,
	);
};

export const getCredentialBindings = async (
	context: IRestApiContext,
	projectId: string,
	envId: string,
	workflowId: string,
): Promise<EnvironmentCredentialBinding[]> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`${base(projectId)}/${envId}/credential-bindings?workflowId=${encodeURIComponent(workflowId)}`,
	);
};

export const replaceCredentialBindings = async (
	context: IRestApiContext,
	projectId: string,
	envId: string,
	workflowId: string,
	data: UpsertCredentialBindingsDto,
): Promise<EnvironmentCredentialBinding[]> => {
	return await makeRestApiRequest(
		context,
		'PUT',
		`${base(projectId)}/${envId}/credential-bindings?workflowId=${encodeURIComponent(workflowId)}`,
		data,
	);
};
